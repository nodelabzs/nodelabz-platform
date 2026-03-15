# NodeLabz Platform

The core NodeLabz platform — a TypeScript monorepo powering the AI Data Agency.

## Architecture

```
nodelabz-platform/
├── apps/
│   ├── web/                # Next.js 16 — Client dashboard & portal
│   ├── api/                # NestJS — API gateway, auth, CRM, integrations
│   └── workers/            # Trigger.dev — Background jobs (AI tasks, syncs, alerts)
├── packages/
│   ├── db/                 # Prisma schema + migrations (PostgreSQL)
│   ├── shared-types/       # Zod schemas shared across apps
│   ├── ui/                 # Shared UI component library (shadcn/ui + Tailwind)
│   ├── config/             # Shared ESLint, TypeScript configs
│   └── utils/              # Shared utility functions
├── turbo.json              # Turborepo build orchestration
├── pnpm-workspace.yaml     # pnpm workspaces
└── package.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + Tailwind CSS + shadcn/ui |
| Backend | NestJS (TypeScript) |
| Database | PostgreSQL via Supabase (Row Level Security) |
| Auth | Supabase Auth |
| Queue | Trigger.dev |
| Build | Turborepo + pnpm workspaces |
| Charts | Tremor / Recharts |
| Real-time | Supabase Realtime + TanStack Query |

## Multi-Tenant

Every client gets their own portal via subdomain routing:
- `client1.app.nodelabz.com`
- `client2.app.nodelabz.com`

Data isolation enforced at the database level via PostgreSQL Row Level Security (RLS). Every table has a `tenant_id` column.

## Core Features

- **Client Dashboard** — Real-time campaign performance, metrics, ROI
- **CRM** — Contacts, deals, pipeline management, lead scoring
- **Email Engine** — Drag-and-drop builder, automation workflows, drip sequences (via Amazon SES)
- **Social Media** — Multi-platform posting via Meta Graph, TikTok, LinkedIn APIs
- **WhatsApp** — Two-way messaging via Meta Cloud API (direct, no Twilio)
- **Landing Pages** — Drag-and-drop builder with conversion tracking
- **Forms** — Lead capture with conditional logic
- **Automation** — Visual if/then workflow builder
- **Reports** — White-labeled PDF reports
- **Booking** — Calendar scheduling widget

## Integrations (Native)

| Platform | Type |
|----------|------|
| Meta Ads + CAPI | Paid Advertising |
| Google Ads | Paid Advertising |
| TikTok Ads | Paid Advertising |
| Google Analytics 4 | Web Analytics |
| Google Search Console | SEO |
| Meta Graph (FB + IG) | Organic Social |
| WhatsApp Business | Messaging |
| Shopify | E-commerce |
| Stripe | Payments (USD) |
| MercadoLibre | LATAM Marketplace |
| MercadoPago | LATAM Payments |
| SINPE Movil (Tilopay) | Costa Rica Payments |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start all apps in development
pnpm turbo dev

# Run database migrations
pnpm turbo db:migrate

# Build all apps
pnpm turbo build

# Run tests
pnpm turbo test
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
JWT_SECRET=

# Email
AWS_SES_ACCESS_KEY=
AWS_SES_SECRET_KEY=
AWS_SES_REGION=

# Integrations
META_APP_ID=
META_APP_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=
TIKTOK_APP_ID=
STRIPE_SECRET_KEY=

# AI Service
AI_SERVICE_URL=http://localhost:8000
```

## Related Repos

- [nodelabz-ai](https://github.com/nodelabzs/nodelabz-ai) — AI intelligence engine (Python)
- [nodelabz-site](https://github.com/nodelabzs/nodelabz-site) — Marketing site, blog, docs

## License

Proprietary — All rights reserved.
