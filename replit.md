# HyperLocal — India Super App

A modern AI-powered hyperlocal marketplace for Tier-2/Tier-3 Indian cities. Customers can order groceries, medicines, and food from nearby shops. Sellers manage their shop and orders. Admins approve sellers and monitor the platform.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 → served via proxy at `/api`)
- `pnpm --filter @workspace/hyperlocal-app run dev` — run the frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session encryption key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter + TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit Auth (OIDC via `@workspace/replit-auth-web` + `openid-client`)
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (do not hand-edit)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/db/src/schema/hyperlocal.ts` — full DB schema (categories, shops, products, cart, orders, feedback)
- `lib/db/src/schema/auth.ts` — auth/users schema
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/api-server/src/middlewares/authMiddleware.ts` — session-based auth middleware
- `artifacts/hyperlocal-app/src/App.tsx` — routing skeleton (role-based: customer/seller/admin)
- `artifacts/hyperlocal-app/src/pages/` — all pages
- `artifacts/hyperlocal-app/src/index.css` — theme (orange/saffron palette)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks and Zod schemas used everywhere
- Role-based routing in frontend: customer, seller, admin views determined by user profile from DB
- Session-based auth using cookies + Replit OIDC (no JWT on client)
- Drizzle ORM for type-safe DB queries; schema pushed with `drizzle-kit push`
- Mobile-first customer UI with bottom nav; sidebar for seller/admin panels

## Product

- **Customer**: Browse categories (Grocery, Medicines, Restaurant, Vegetables, Electronics, General Store), discover nearby shops, view products, add to cart, place orders (COD/Online), track live order status, manage profile
- **Seller**: Register shop (pending admin approval), manage product inventory, update incoming order statuses, view dashboard with revenue/order stats
- **Admin**: Approve/suspend sellers, view all users/orders/feedback, platform-wide dashboard

## User preferences

- Indian commerce app feel (like Amazon/Flipkart/Swiggy)
- Orange/saffron primary color palette (HSL 24 95% 48%)
- Mobile-first customer experience
- No emojis in UI
- Tier-2/Tier-3 India as target market

## Gotchas

- After codegen (`pnpm --filter @workspace/api-spec run codegen`), fix `lib/api-zod/src/index.ts` — it must only contain `export * from "./generated/api";` (orval may add stale extra exports)
- The `zod/v4` import path is not supported in ESM bundles built by esbuild — use `"zod"` in api-server routes
- Replit Auth: `login()` from `@workspace/replit-auth-web` does a full-page redirect — never use custom form for auth
- DB seeding: categories, shops, products seeded in dev via raw SQL in `lib/db`
- Seller shop status defaults to `pending` — admin must approve before it appears in listings

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for all endpoint contracts
