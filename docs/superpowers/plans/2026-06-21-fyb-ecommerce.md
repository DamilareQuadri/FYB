# FYB Store — E-commerce Backend & Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing FYB React frontend to Supabase so products, persistent + shareable carts, bank-transfer checkout, an admin dashboard, and a protected admin login all work end-to-end.

**Architecture:** Supabase Postgres holds all data with RLS as the security boundary. Shoppers are identified via anonymous auth; admins via email/password + an `is_admin` flag. The React app uses `@supabase/supabase-js` directly (no separate backend). Three SECURITY DEFINER functions handle shared-cart cloning and order placement atomically.

**Tech Stack:** React 19, Vite 8, TypeScript, Tailwind 4, react-router-dom 7, @supabase/supabase-js 2, lucide-react.

## Global Constraints

- Supabase project id: `gbgfddylymulwsmuywml` (org `Damtec`, eu-west-1, Postgres 17).
- Project URL: `https://gbgfddylymulwsmuywml.supabase.co`.
- Publishable (anon) key: `sb_publishable_oRlGhK1EgR_t2A0G1T1B_Q_uFpGcmTE`.
- Prices are **integer NGN** (whole naira). `formatCurrency` uses 0 fraction digits.
- RLS enabled on every table; RLS is the security boundary, UI guards are convenience.
- DB migrations applied via Supabase MCP `apply_migration` — **never** hardcode DB passwords.
- **Manual prerequisite (owner):** enable Anonymous sign-ins (Dashboard → Authentication →
  Sign In / Providers → Anonymous → enable). And rotate the DB password leaked in `setup-db.js`.
- Commit after each task. Frontend verification = `npm run build` passes + described manual check
  (no unit-test runner is installed; do not add one — keep hackathon pace).

---

## Task 1: Database schema, functions, RLS

**Files:**
- Apply via MCP `apply_migration` (no file). Mirror the SQL into `supabase/migrations/0001_init.sql` for record.
- Delete: `setup-db.js` (leaked credential + broken).

**Interfaces:**
- Produces tables: `profiles, products, carts, cart_items, orders, order_items, store_settings`.
- Produces functions: `is_admin() → bool`, `clone_shared_cart(p_token text) → uuid`,
  `place_order(p_cart_id uuid, p_name text, p_phone text, p_address text) → orders`.

- [ ] **Step 1: Apply migration `init_schema`** via MCP `apply_migration` (project `gbgfddylymulwsmuywml`):

```sql
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

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- is_admin helper (SECURITY DEFINER avoids recursive RLS on profiles)
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
  share_token text not null unique default encode(gen_random_bytes(9), 'base64'),
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
```

- [ ] **Step 2: Apply migration `functions`** via MCP `apply_migration`:

```sql
-- Clone a shared cart's items into the caller's active cart
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

-- Turn a cart into an order, snapshotting items + price
create or replace function public.place_order(
  p_cart_id uuid, p_name text, p_phone text, p_address text)
returns public.orders language plpgsql security definer set search_path = public as $$
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
```

- [ ] **Step 3: Apply migration `rls_policies`** via MCP `apply_migration`:

```sql
alter table public.profiles       enable row level security;
alter table public.products       enable row level security;
alter table public.carts          enable row level security;
alter table public.cart_items     enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.store_settings enable row level security;

-- profiles
create policy profiles_read   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin());

-- products: public read, admin write
create policy products_read   on public.products for select using (true);
create policy products_insert on public.products for insert with check (public.is_admin());
create policy products_update on public.products for update using (public.is_admin());
create policy products_delete on public.products for delete using (public.is_admin());

-- carts: owner or admin
create policy carts_select on public.carts for select using (user_id = auth.uid() or public.is_admin());
create policy carts_insert on public.carts for insert with check (user_id = auth.uid());
create policy carts_update on public.carts for update using (user_id = auth.uid() or public.is_admin());
create policy carts_delete on public.carts for delete using (user_id = auth.uid() or public.is_admin());

-- cart_items: via owning cart or admin
create policy cart_items_all on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- orders: owner read+insert, owner update while pending, admin all
create policy orders_select on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy orders_insert on public.orders for insert with check (user_id = auth.uid());
create policy orders_update on public.orders for update
  using ((user_id = auth.uid() and status = 'pending') or public.is_admin());

-- order_items: via owning order or admin
create policy order_items_select on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy order_items_write on public.order_items for all
  using (exists (select 1 from public.orders o where o.id = order_id
    and ((o.user_id = auth.uid() and o.status = 'pending') or public.is_admin())))
  with check (exists (select 1 from public.orders o where o.id = order_id
    and ((o.user_id = auth.uid() and o.status = 'pending') or public.is_admin())));

-- store_settings: public read, admin write
create policy settings_read   on public.store_settings for select using (true);
create policy settings_update on public.store_settings for update using (public.is_admin());
```

- [ ] **Step 4: Verify** via MCP `list_tables` (expect 7 tables) and MCP `get_advisors` (type `security`; expect no "RLS disabled" warnings). Run via MCP `execute_sql`: `select proname from pg_proc where proname in ('is_admin','clone_shared_cart','place_order');` → expect 3 rows.

- [ ] **Step 5: Delete the insecure setup script**

```bash
git rm setup-db.js
```

- [ ] **Step 6: Commit**

```bash
mkdir -p supabase/migrations
# paste the three SQL blocks into supabase/migrations/0001_init.sql for record
git add supabase/migrations/0001_init.sql && git rm --cached setup-db.js 2>/dev/null; \
git add -A && git commit -m "feat(db): schema, functions, RLS; remove insecure setup-db.js"
```

---

## Task 2: Environment + Supabase client + types

**Files:**
- Create: `.env.local`, `.env.example`
- Modify: `src/lib/supabase.ts` (already correct — verify), `src/types/index.ts`
- Modify: `.gitignore` (ensure `.env.local` ignored)

**Interfaces:**
- Produces `supabase` client (exists). Produces types: `Product` (with `is_new`), `CartItem`,
  `Cart`, `Order`, `OrderItem`, `StoreSettings`.

- [ ] **Step 1: Create `.env.local`**

```
VITE_SUPABASE_URL=https://gbgfddylymulwsmuywml.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_oRlGhK1EgR_t2A0G1T1B_Q_uFpGcmTE
```

- [ ] **Step 2: Create `.env.example`** (same keys, empty values) and confirm `.gitignore` has `.env.local` (Vite default ignores `*.local`).

- [ ] **Step 3: Update `src/types/index.ts`**

```typescript
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  category: string;
  sizes: string[];
  colors: string[];
  is_new?: boolean;
  created_at?: string;
}

export interface CartItem {
  id: string;          // cart_item id (or local temp id)
  productId: string;
  name: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  image: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  size: string;
  color: string;
  quantity: number;
}

export interface Order {
  id: string;
  reference: string;
  status: 'pending' | 'awaiting_confirmation' | 'paid' | 'cancelled' | 'fulfilled';
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  subtotal: number;
  created_at: string;
  order_items?: OrderItem[];
}

export interface StoreSettings {
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  whatsapp: string | null;
}
```

- [ ] **Step 4: Verify build**: `npm install && npm run build` → expect success (the `is_new`
  rename will surface usages to fix in later tasks; if `ProductCard`/`data.ts` reference `isNew`,
  update them to `is_new` now).

- [ ] **Step 5: Commit**: `git add -A && git commit -m "feat: env, types for cart/order/settings, is_new rename"`

---

## Task 3: Auth provider (anonymous shoppers + admin session)

**Files:**
- Create: `src/context/AuthContext.tsx`
- Modify: `src/main.tsx` (wrap app in `AuthProvider`)

**Interfaces:**
- Produces `useAuth()` → `{ session, userId, isAdmin, loading, signInAdmin(email,password), signOut() }`.
- Consumed by: `CartContext` (Task 4), `Admin` (Task 8).

- [ ] **Step 1: Create `src/context/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthCtx {
  session: Session | null;
  userId: string | null;
  isAdmin: boolean;
  loading: boolean;
  signInAdmin: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function boot() {
      const { data } = await supabase.auth.getSession();
      let s = data.session;
      if (!s) {
        const { data: anon } = await supabase.auth.signInAnonymously();
        s = anon.session;
      }
      if (!active) return;
      setSession(s);
      setLoading(false);
    }
    boot();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.user) { setIsAdmin(false); return; }
    supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
      .then(({ data }) => setIsAdmin(!!data?.is_admin));
  }, [session?.user?.id]);

  async function signInAdmin(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }
  async function signOut() {
    await supabase.auth.signOut();
    await supabase.auth.signInAnonymously(); // shopper stays identified
  }

  return (
    <Ctx.Provider value={{ session, userId: session?.user?.id ?? null, isAdmin, loading, signInAdmin, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
```

- [ ] **Step 2: Wrap `src/main.tsx`** — import `AuthProvider` and wrap `<App />` inside it (outermost).

- [ ] **Step 3: Verify**: `npm run dev`, open the app, in browser console run
  `await window.localStorage` check for a `sb-...-auth-token` key; Network tab shows a
  `/auth/v1/signup` (anonymous) call returning 200. Confirms anon identity is created.

- [ ] **Step 4: Commit**: `git add -A && git commit -m "feat(auth): anonymous shopper + admin session provider"`

---

## Task 4: DB-backed CartContext

**Files:**
- Modify: `src/context/CartContext.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useAuth()` (`userId`), `supabase`.
- Produces `useCart()` → existing fields **plus** `customerName`, `setCustomerName`,
  `cartId`, `shareToken`, `shareCart()`, `sendCartToAdmin()`, `refresh()`. Keeps
  `items, isCartOpen, openCart, closeCart, addToCart, removeFromCart, updateQuantity, subtotal`.

- [ ] **Step 1: Rewrite `src/context/CartContext.tsx`** to:
  - On `userId` ready, `ensureCart()`: select active cart for user or insert one; store `cartId`,
    `shareToken`, `customerName`.
  - `loadItems()`: `select id, product_id, size, color, quantity, products(name, price, images)`
    from `cart_items` where `cart_id=cartId`; map to `CartItem[]` (`image = products.images[0]`).
  - `addToCart(item)`: upsert into `cart_items` (`onConflict: 'cart_id,product_id,size,color'`),
    incrementing quantity; then `loadItems()`. Optimistic update first for snappy UI.
  - `updateQuantity(id, q)`: update `cart_items` set quantity; `removeFromCart(id)`: delete row.
  - `setCustomerName(name)`: update `carts.customer_name`.
  - `shareCart()`: return `${window.location.origin}/cart/${shareToken}`.
  - `sendCartToAdmin()`: update `carts.shared_with_admin=true`.
  - Mirror `items` to `localStorage` for instant first paint; reconcile on load.

```tsx
// key shape (abbreviated — implement fully per bullets above):
const value = {
  items, isCartOpen, openCart, closeCart,
  addToCart, removeFromCart, updateQuantity, subtotal,
  customerName, setCustomerName, cartId, shareToken,
  shareCart, sendCartToAdmin, refresh: loadItems,
};
```

- [ ] **Step 2: Update `ProductDetail.tsx` `handleAddToCart`** — `addToCart` now async; keep the
  same `CartItem` shape (already matches). No size/color logic change.

- [ ] **Step 3: Verify**: `npm run dev` → open a product, add to cart → cart drawer shows item →
  refresh the page → **item persists** (loaded from DB). In Supabase MCP `execute_sql`:
  `select * from cart_items;` shows the row.

- [ ] **Step 4: Commit**: `git add -A && git commit -m "feat(cart): DB-backed persistent cart with name + share"`

---

## Task 5: Checkout page + Pay-to card component

**Files:**
- Create: `src/pages/Checkout.tsx`, `src/components/checkout/PayToCard.tsx`, `src/components/ui/CopyButton.tsx`
- Modify: `src/App.tsx` (route `/checkout`), `src/components/cart/CartDrawer.tsx` (Checkout button → navigate + name field)

**Interfaces:**
- Consumes: `useCart()` (`items, subtotal, cartId, customerName, setCustomerName`), `supabase.rpc('place_order', ...)`.
- Produces: navigates to `/order/:reference` after placing order.
- `<CopyButton value={string} label?={string} />`, `<PayToCard settings reference subtotal />`.

- [ ] **Step 1: Create `src/components/ui/CopyButton.tsx`** (mobile-safe copy + "Copied ✓"):

```tsx
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ value, className = '' }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  }
  return (
    <button onClick={copy} aria-label="Copy"
      className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${className}`}>
      {copied ? <><Check className="h-4 w-4 text-green-600" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/checkout/PayToCard.tsx`** — standout bordered card showing
  bank name, account name, large mono **account number** (whole number tappable to copy via
  `CopyButton`), and the order **reference** with its own copy button + "use as transfer
  narration" hint. Pull values from `StoreSettings`. Mobile-first: full-width, `text-2xl`
  mono account number, generous padding, ring/border to stand out.

- [ ] **Step 3: Create `src/pages/Checkout.tsx`** — form: name (prefilled from `customerName`),
  phone (required), address. On submit: if name changed call `setCustomerName`; call
  `supabase.rpc('place_order', { p_cart_id: cartId, p_name, p_phone, p_address })`; on success
  `navigate('/order/' + data.reference)`. Show order summary (items + subtotal) alongside.

- [ ] **Step 4: Wire `CartDrawer.tsx`** — add a small "Your name" input bound to `customerName`,
  a **Share cart** button (copies `shareCart()` + CopyButton feedback), a **Send to admin**
  button (`sendCartToAdmin()` → toast "Sent to admin"), and make **Checkout** `navigate('/checkout')`
  then `closeCart()`. Add route `/checkout` in `App.tsx`.

- [ ] **Step 5: Verify**: add items → checkout → fill form → submit → lands on `/order/FYB-XXXX`;
  MCP `execute_sql`: `select reference, subtotal from orders;` shows the order;
  `select count(*) from order_items;` matches item count.

- [ ] **Step 6: Commit**: `git add -A && git commit -m "feat(checkout): bank-transfer checkout + copyable Pay-to card"`

---

## Task 6: Order / invoice page

**Files:**
- Create: `src/pages/OrderPage.tsx`
- Modify: `src/App.tsx` (route `/order/:reference`)

**Interfaces:**
- Consumes: `supabase.from('orders').select('*, order_items(*)').eq('reference', ref).single()`,
  `supabase.from('store_settings')`, `<PayToCard/>`.

- [ ] **Step 1: Create `src/pages/OrderPage.tsx`** — fetch order by `reference` with `order_items`
  and `store_settings`. Render: status badge, item list, subtotal, `<PayToCard/>`, and an
  **"I've paid"** button → `update orders set status='awaiting_confirmation'` (allowed by RLS
  while pending). While `status='pending'`, allow `+/-` quantity on each `order_items` row
  (update row; recompute + persist `orders.subtotal`). Show read-only once not pending.

- [ ] **Step 2: Add route** `/order/:reference` in `App.tsx` (inside the standard-layout Routes).

- [ ] **Step 3: Verify**: open the `/order/FYB-XXXX` from Task 5 → bank details show from
  `store_settings`; tap account number → "Copied"; bump a quantity → subtotal updates and
  persists across refresh; "I've paid" → status becomes `awaiting_confirmation`.

- [ ] **Step 4: Commit**: `git add -A && git commit -m "feat(order): invoice page with pay-to, copy, editable qty"`

---

## Task 7: Shared-cart open route

**Files:**
- Create: `src/pages/SharedCart.tsx`
- Modify: `src/App.tsx` (route `/cart/:token`)

**Interfaces:**
- Consumes: `supabase.rpc('clone_shared_cart', { p_token })`, `useCart().refresh()`.

- [ ] **Step 1: Create `src/pages/SharedCart.tsx`** — on mount, call
  `supabase.rpc('clone_shared_cart', { p_token: token })`; on success `await refresh()` then
  `navigate('/checkout')` (or open cart drawer). Show a spinner while cloning and an error state
  if the token is invalid.

- [ ] **Step 2: Add route** `/cart/:token` in `App.tsx`.

- [ ] **Step 3: Verify**: in browser A add items, copy the share link from the drawer; open it in a
  private window (browser B = different anon user) → items appear in B's cart → can checkout.
  MCP: confirm a second `carts` row with the cloned `cart_items`.

- [ ] **Step 4: Commit**: `git add -A && git commit -m "feat(share): open shared cart link clones items to opener"`

---

## Task 8: Admin — login gate + product CRUD + orders + settings + shared carts

**Files:**
- Modify: `src/pages/Admin.tsx` (add login gate + tabs)
- Create: `src/components/admin/RequireAdmin.tsx`, `src/components/admin/AdminProducts.tsx`,
  `src/components/admin/AdminOrders.tsx`, `src/components/admin/AdminSettings.tsx`,
  `src/components/admin/AdminSharedCarts.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`isAdmin, signInAdmin, signOut, loading`), `supabase`.

- [ ] **Step 1: Create `RequireAdmin.tsx`** — uses `useAuth()`: while `loading` show spinner; if
  `!isAdmin` render an email+password login form calling `signInAdmin`; on non-admin login show
  "Not authorised. <Log out>" (calls `signOut`). When `isAdmin`, render `children`.

```tsx
// shape:
// if (loading) return <Spinner/>;
// if (!isAdmin) return <LoginForm onSubmit={signInAdmin} session={session} signOut={signOut}/>;
// return <>{children}</>;
```

- [ ] **Step 2: Wrap `Admin.tsx`** content in `<RequireAdmin>`. Add a simple tab switch:
  Products | Orders | Shared Carts | Settings. Keep the existing "Add product" form inside
  Products, fixing the insert to use `is_new` (not `isNew`). Add a **Log out** button.

- [ ] **Step 3: `AdminProducts.tsx`** — list all products (`select *`), each row with **Edit**
  (inline form → `update`) and **Delete** (`delete`). Reuse the existing add-form for create.

- [ ] **Step 4: `AdminOrders.tsx`** — list all orders (`select *, order_items(*)` newest first)
  with customer name/phone, items, subtotal, a **status dropdown** (`update orders set status`),
  and the ability to edit item quantities (`update order_items` + recompute subtotal).

- [ ] **Step 5: `AdminSettings.tsx`** — form bound to `store_settings` row (bank_name,
  account_number, account_name, whatsapp). Save → `update store_settings set ... where id=1`.
  This is the source of truth for the Pay-to card buyers see.

- [ ] **Step 6: `AdminSharedCarts.tsx`** — list carts where `shared_with_admin=true`
  (`select *, customer_name, cart_items(*, products(name,price))`), showing the shopper's name +
  items, so admin can follow up.

- [ ] **Step 7: Verify** (needs a seeded admin — see Task 9; do Task 9 first if not seeded):
  log in at `/admin` with admin creds → see all tabs. Add a product → appears on `/products`.
  Edit account number in Settings → reload an order page → Pay-to card reflects it. Change an
  order status → buyer's order page shows new status. Open in a logged-out window → `/admin`
  shows the login form, never the dashboard.

- [ ] **Step 8: Commit**: `git add -A && git commit -m "feat(admin): login gate, product CRUD, orders, settings, shared carts"`

---

## Task 9: Seed admin + store settings + smoke data

**Files:** none (operational, via Dashboard + MCP).

- [ ] **Step 1:** Owner enables **Anonymous sign-ins** (Dashboard → Authentication → Sign In /
  Providers → Anonymous → Enable). Without this, Task 3 anon login fails.
- [ ] **Step 2:** Owner creates the admin user (Dashboard → Authentication → Users → Add user →
  email `admin@fyb.com` + a chosen password, "Auto confirm"). Note the user id.
- [ ] **Step 3:** Flag admin via MCP `execute_sql`:
  `update public.profiles set is_admin = true where id = '<admin-user-id>';`
  (or `... where id = (select id from auth.users where email = 'admin@fyb.com');`).
- [ ] **Step 4:** Seed bank details via MCP `execute_sql`:
  `update public.store_settings set bank_name='...', account_number='...', account_name='...', whatsapp='...' where id=1;`
  (or set them later from the admin Settings tab).
- [ ] **Step 5: Verify**: MCP `execute_sql`: `select is_admin from profiles where is_admin;` → ≥1 row.

---

## Task 10: End-to-end verification + cleanup

- [ ] **Step 1:** `npm run build` → passes with no TypeScript errors.
- [ ] **Step 2: Full happy path** (browser): shopper opens site (anon) → browses `/products` →
  filters by category + sorts → opens a product → adds to cart (size+color) → sets name → cart
  persists on refresh → shares cart link → opens link in 2nd browser → checkout → order page →
  copies account number on mobile viewport → "I've paid" → admin logs in → sees order under
  Orders + the shared cart → marks `paid` → buyer's order page shows `paid`.
- [ ] **Step 3:** MCP `get_advisors` (security + performance) → resolve any RLS or index warnings.
- [ ] **Step 4: Commit** any fixes: `git commit -am "chore: e2e verification fixes"`.
- [ ] **Step 5:** Confirm `setup-db.js` is gone and no secret remains: `git grep -i "Damilare30" || echo clean`.

---

## Coverage check (spec → task)

- Anonymous identity → T3. Admin login + route protection → T8 + RLS T1. Products CRUD → T8;
  display/filter/sort → already in `ProductList` + T1 data. Persistent cart → T4. Shareable cart
  + name + send-to-admin → T4/T5/T7. Bank-transfer checkout → T5. Order/invoice + editable qty →
  T6. Admin-editable bank details → T8. Copyable, standout, mobile Pay-to card → T5. Admin sees +
  edits orders → T8. Security cleanup (rotate, delete setup-db, migrations) → T1 + constraints.
