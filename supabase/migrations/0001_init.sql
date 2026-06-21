-- FYB store schema — applied to project gbgfddylymulwsmuywml on 2026-06-21 via Supabase MCP.
-- Tables, functions, RLS for products, persistent+shareable carts, bank-transfer orders, admin.

-- ============ EXTENSIONS ============
create extension if not exists pgcrypto;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  display_name text,
  phone text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end; $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ============ PRODUCTS ============
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null check (price >= 0),
  description text,
  category text not null,
  images text[] not null default '{}',
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  is_new boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ CARTS ============
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text,
  share_token text not null unique default encode(gen_random_bytes(9), 'hex'),
  shared_with_admin boolean not null default false,
  status text not null default 'active' check (status in ('active','ordered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index carts_one_active_per_user on public.carts (user_id) where status = 'active';

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  color text not null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id, size, color)
);

-- ============ ORDERS ============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null unique,
  status text not null default 'pending'
    check (status in ('pending','awaiting_confirmation','paid','cancelled','fulfilled')),
  customer_name text not null,
  customer_phone text not null,
  customer_address text,
  subtotal integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  price integer not null,
  image text,
  size text not null,
  color text not null,
  quantity integer not null check (quantity > 0)
);

-- ============ STORE SETTINGS (single row) ============
create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  bank_name text,
  account_number text,
  account_name text,
  whatsapp text,
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1) on conflict do nothing;

-- ============ FUNCTIONS ============
create or replace function public.clone_shared_cart(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_src uuid; v_dest uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into v_src from public.carts where share_token = p_token;
  if v_src is null then raise exception 'cart not found'; end if;

  select id into v_dest from public.carts where user_id = auth.uid() and status = 'active';
  if v_dest is null then
    insert into public.carts (user_id) values (auth.uid()) returning id into v_dest;
  end if;

  insert into public.cart_items (cart_id, product_id, size, color, quantity)
  select v_dest, product_id, size, color, quantity from public.cart_items where cart_id = v_src
  on conflict (cart_id, product_id, size, color)
  do update set quantity = public.cart_items.quantity + excluded.quantity;

  return v_dest;
end; $$;

create or replace function public.place_order(
  p_cart_id uuid, p_name text, p_phone text, p_address text)
returns public.orders language plpgsql security definer set search_path = public, extensions as $$
declare v_order public.orders; v_ref text; v_subtotal integer;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.carts where id = p_cart_id and user_id = auth.uid()) then
    raise exception 'cart not owned by caller';
  end if;
  if not exists (select 1 from public.cart_items where cart_id = p_cart_id) then
    raise exception 'cart is empty';
  end if;

  select coalesce(sum(p.price * ci.quantity), 0) into v_subtotal
  from public.cart_items ci join public.products p on p.id = ci.product_id
  where ci.cart_id = p_cart_id;

  v_ref := 'FYB-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));

  insert into public.orders (user_id, reference, customer_name, customer_phone, customer_address, subtotal)
  values (auth.uid(), v_ref, p_name, p_phone, p_address, v_subtotal)
  returning * into v_order;

  insert into public.order_items (order_id, product_id, name, price, image, size, color, quantity)
  select v_order.id, p.id, p.name, p.price,
         coalesce(p.images[1], null), ci.size, ci.color, ci.quantity
  from public.cart_items ci join public.products p on p.id = ci.product_id
  where ci.cart_id = p_cart_id;

  update public.carts set status = 'ordered', updated_at = now() where id = p_cart_id;
  return v_order;
end; $$;

-- ============ RLS ============
alter table public.profiles       enable row level security;
alter table public.products       enable row level security;
alter table public.carts          enable row level security;
alter table public.cart_items     enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.store_settings enable row level security;

create policy profiles_read   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin());

create policy products_read   on public.products for select using (true);
create policy products_insert on public.products for insert with check (public.is_admin());
create policy products_update on public.products for update using (public.is_admin());
create policy products_delete on public.products for delete using (public.is_admin());

create policy carts_select on public.carts for select using (user_id = auth.uid() or public.is_admin());
create policy carts_insert on public.carts for insert with check (user_id = auth.uid());
create policy carts_update on public.carts for update using (user_id = auth.uid() or public.is_admin());
create policy carts_delete on public.carts for delete using (user_id = auth.uid() or public.is_admin());

create policy cart_items_all on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

create policy orders_select on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy orders_insert on public.orders for insert with check (user_id = auth.uid());
create policy orders_update on public.orders for update
  using ((user_id = auth.uid() and status = 'pending') or public.is_admin());

create policy order_items_select on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy order_items_write on public.order_items for all
  using (exists (select 1 from public.orders o where o.id = order_id
    and ((o.user_id = auth.uid() and o.status = 'pending') or public.is_admin())))
  with check (exists (select 1 from public.orders o where o.id = order_id
    and ((o.user_id = auth.uid() and o.status = 'pending') or public.is_admin())));

create policy settings_read   on public.store_settings for select using (true);
create policy settings_update on public.store_settings for update using (public.is_admin());
