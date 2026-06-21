# FYB Store — Full E-commerce Backend & Wiring Design

**Date:** 2026-06-21
**Status:** Approved (pending spec review)
**Supabase project:** `gbgfddylymulwsmuywml` (org `Damtec`, region eu-west-1, Postgres 17)

## 1. Goal

Turn the existing FYB frontend shell (React 19 + Vite + Tailwind + react-router 7 +
`@supabase/supabase-js`) into a fully working single-brand clothing store backed by Supabase:

- Products: full CRUD (admin), public display, category filter + sort.
- Shoppers uniquely identified **without a signup**, via Supabase Anonymous Auth.
- Persistent, DB-backed cart that survives across sessions.
- **Shareable cart**: a shopper shares a link; whoever opens it can buy those products.
- Shopper can put **their name** on a cart and **send the cart to admin**.
- Checkout = **bank transfer + manual confirm** (no payment gateway).
- Admin-editable **bank/account details** shown to buyers, with a standout **tap-to-copy** UI.
- Admin sees & edits all orders; shoppers edit their own pending orders (e.g. bump quantity).

## 2. Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Store model | Single brand (FYB). "Users" = buyers, not sellers. |
| 2 | Shopper identity | Supabase **Anonymous Auth** (`signInAnonymously`), persistent per browser. |
| 3 | Admin identity | Email/password Supabase user, `profiles.is_admin = true`. |
| 4 | Shareable unit | The **cart** (`share_token`); opening clones items into opener's own cart. |
| 5 | Checkout | Bank transfer + manual admin confirmation. |
| 6 | Price storage | Integer NGN (whole naira), matches `formatCurrency` (0 fraction digits). |
| 7 | Cart persistence | DB-backed (`carts`/`cart_items`), keyed by `auth.uid()`. |

## 3. Current state (verified 2026-06-21)

- **DB:** empty — `list_tables` returns `[]`.
- **`setup-db.js`:** broken (creates `cart_items` referencing a `products` table it never
  creates) AND contains a **plaintext DB superuser password in a public repo**. To be
  **deleted**; password to be **rotated** by the owner.
- **Frontend:** product list/detail/admin-create pages exist and already call
  `supabase.from('products')`. Cart is in-memory only (`CartContext`). Checkout button is a
  no-op. No shareable link, no orders, no admin auth, no edit/delete.
- **Column mismatch:** `Admin.tsx` inserts `isNew` (camelCase); will be changed to `is_new`.

## 4. Schema

All tables in `public`. RLS enabled on every table.

### `profiles`
```
id          uuid PK references auth.users(id) on delete cascade
is_admin    boolean not null default false
display_name text
phone        text
created_at   timestamptz not null default now()
```
Auto-created on signup via trigger on `auth.users`.

### `products`
```
id          uuid PK default gen_random_uuid()
name        text not null
price       integer not null check (price >= 0)   -- whole NGN
description text
category    text not null
images      text[] not null default '{}'
sizes       text[] not null default '{}'
colors      text[] not null default '{}'
is_new      boolean not null default true
created_at  timestamptz not null default now()
```

### `carts`
```
id             uuid PK default gen_random_uuid()
user_id        uuid not null references auth.users(id) on delete cascade
customer_name  text                       -- shopper's name on the cart
share_token    text not null unique default encode(gen_random_bytes(9),'base64url')
shared_with_admin boolean not null default false
status         text not null default 'active' check (status in ('active','ordered'))
created_at     timestamptz not null default now()
updated_at     timestamptz not null default now()
```
One active cart per user (partial unique index on `user_id where status='active'`).

### `cart_items`
```
id          uuid PK default gen_random_uuid()
cart_id     uuid not null references carts(id) on delete cascade
product_id  uuid not null references products(id) on delete cascade
size        text not null
color       text not null
quantity    integer not null default 1 check (quantity > 0)
created_at  timestamptz not null default now()
unique (cart_id, product_id, size, color)
```

### `orders`
```
id              uuid PK default gen_random_uuid()
user_id         uuid not null references auth.users(id) on delete cascade
reference       text not null unique           -- e.g. FYB-7F3K2Q (buyer pays with this)
status          text not null default 'pending'
                check (status in ('pending','awaiting_confirmation','paid','cancelled','fulfilled'))
customer_name   text not null
customer_phone  text not null
customer_address text
subtotal        integer not null
created_at      timestamptz not null default now()
updated_at      timestamptz not null default now()
```

### `order_items` (price/name/image snapshot — immutable to later product edits)
```
id          uuid PK default gen_random_uuid()
order_id    uuid not null references orders(id) on delete cascade
product_id  uuid references products(id) on delete set null
name        text not null
price       integer not null
image       text
size        text not null
color       text not null
quantity    integer not null check (quantity > 0)
```

### `store_settings` (single row, admin-editable)
```
id            integer PK default 1 check (id = 1)
bank_name     text
account_number text
account_name  text
whatsapp      text
updated_at    timestamptz not null default now()
```

## 5. Functions

- `is_admin()` → `boolean`, SECURITY DEFINER, reads `profiles.is_admin` for `auth.uid()`.
  Used by RLS policies. (Avoids recursive RLS on `profiles`.)
- `clone_shared_cart(p_token text)` → `uuid`, SECURITY DEFINER. Reads `cart_items` of the
  cart with that `share_token`, upserts them into the caller's active cart (creating one if
  needed), returns the caller's `cart_id`. Lets a shopper open a shared link and buy.
- `place_order(p_cart_id uuid, p_name text, p_phone text, p_address text)` → `orders` row,
  SECURITY DEFINER. Validates caller owns the cart, snapshots items into `order_items`,
  computes `subtotal`, generates a unique `reference` (`FYB-` + 6 base32 chars), marks cart
  `status='ordered'`, returns the order. Single round-trip, atomic.

## 6. Row-Level Security

| Table | select | insert / update / delete |
|-------|--------|--------------------------|
| `products` | public (anon + authed) | `is_admin()` only |
| `profiles` | self or `is_admin()` | self update; insert via trigger |
| `carts` | `user_id = auth.uid()` or `is_admin()` | owner; admin all |
| `cart_items` | via owning cart or `is_admin()` | via owning cart; admin all |
| `orders` | owner or `is_admin()` | owner insert; owner update **while `pending`**; admin update any |
| `order_items` | via owning order or `is_admin()` | via owning order while pending; admin all |
| `store_settings` | public select | `is_admin()` update only |

Shared carts are **not** exposed by a blanket policy; access is only through
`clone_shared_cart()` (SECURITY DEFINER), so no cart data leaks by token enumeration beyond
the items being cloned.

## 7. Frontend changes

1. **`.env.local`** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable anon key).
2. **Auth bootstrap** — on app load, if no session, `supabase.auth.signInAnonymously()`.
   Expose `useAuth()` (session + isAdmin).
3. **`CartContext`** — rewrite to be DB-backed: load the user's active cart + items, and make
   `addToCart`/`removeFromCart`/`updateQuantity` write to `cart_items` (optimistic UI, with a
   localStorage mirror for instant paint). Add `customerName`, `setCustomerName`, `shareCart()`,
   `sendCartToAdmin()`.
4. **Types** — `Product.isNew` → `is_new`; add `Cart`, `Order`, `OrderItem`, `StoreSettings`.
5. **`Admin.tsx`** — add login gate (email/password) and admin check; fix `isNew`→`is_new`;
   add **Products list** with **edit + delete**; add **Orders** dashboard (view all, change
   status, edit item quantities); add **Settings** (bank/account fields) writing
   `store_settings`; add **Shared carts** tab (carts with `shared_with_admin = true`).
6. **Checkout page (`/checkout`)** — form (name prefilled from cart, phone, address) →
   `place_order` → redirect to order page.
7. **Order/invoice page (`/order/:reference`)** — items, subtotal, **Pay-to card** (bank
   details from `store_settings`) with **tap-to-copy** account number + reference (Clipboard
   API + `execCommand` fallback, "Copied ✓" toast, large standout styling, mobile-friendly),
   status badge, "I've paid" → sets `awaiting_confirmation`. Owner can edit quantities while
   `pending`.
8. **Shareable cart** — Share button in `CartDrawer` copies `${origin}/cart/:token`. Route
   `/cart/:token` calls `clone_shared_cart`, loads items into the opener's cart, routes to
   checkout. "Send to admin" calls `sendCartToAdmin()`.
9. **`CartDrawer` checkout button** → navigates to `/checkout` (currently inert).

## 7a. Admin login & route protection

Simple, real, no extra service — just Supabase Auth:

- **Login:** `/admin` renders an email + password form when there's no admin session.
  Calls `supabase.auth.signInWithPassword({ email, password })`. On success, checks
  `profiles.is_admin`; if false, signs out and shows "Not authorised".
- **Seeded admin:** create one Supabase auth user (e.g. `admin@fyb.com` + a password you pick)
  in the Dashboard → Authentication → Users, then `update profiles set is_admin = true` for
  that user. That's the whole "place the admin" step — no signup UI needed.
- **Route protection (two layers):**
  1. *UI guard* — `<RequireAdmin>` wrapper around the admin views: no admin session ⇒ show the
     login form; non-admin session ⇒ blocked. So the dashboard never renders for the public.
  2. *Data guard (the real one)* — RLS: every write to `products`, every read/write of all
     `orders`/`carts`/`store_settings` is gated by `is_admin()`. Even if someone reaches the
     `/admin` URL, the database returns nothing and rejects every mutation. The UI guard is
     convenience; **RLS is the security boundary.**
- Admin session persists (Supabase stores it); a **Log out** button clears it.

## 8. Pay-to card (standout, copyable, mobile)

- Big bordered card: "Make payment to" → Bank, Account Name, **Account Number** in large mono
  text with a copy icon button; tapping the whole number copies it.
- Reference code shown with its own copy button ("Use this as your transfer narration").
- Uses `navigator.clipboard.writeText` with a hidden-textarea + `document.execCommand('copy')`
  fallback for older mobile browsers. Visual "Copied ✓" confirmation for ~1.5s.

## 9. Security cleanup

- Owner rotates DB password (Dashboard → Project Settings → Database → Reset).
- Delete `setup-db.js`; replace with Supabase migrations applied via MCP `apply_migration`
  (no hardcoded credentials, ever).
- Seed the first admin: create the Supabase auth user, then `update profiles set is_admin=true`.

## 10. Out of scope (YAGNI for now)

- Online payment gateway (Paystack/Flutterwave).
- Multi-vendor / seller accounts.
- Inventory/stock counts, discounts, shipping-fee calculation, email/SMS notifications.
- Product image upload UI (admin pastes an image URL for now; bucket exists if added later).

## 11. Build order (high level)

1. DB migrations (tables, indexes, functions, RLS) via `apply_migration`.
2. Seed `store_settings` + first admin.
3. `.env.local` + auth bootstrap + `useAuth`.
4. DB-backed `CartContext` + types fix.
5. Checkout + order/invoice pages + Pay-to card.
6. Shareable cart + send-to-admin.
7. Admin: login, product edit/delete, orders dashboard, settings, shared carts.
8. End-to-end manual verification.
