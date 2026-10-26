# ClientLoop — Multi-Tenant Customer Retention & Review Platform

ClientLoop is a secure, multi-tenant customer insights, follow-up, retention, and review management platform built for service-based businesses (salons, wellness spas, clinics, repair shops, hospitality, and professional services).

---

## 1. Architecture Overview

- **Frontend**: React 19 + TypeScript (strict mode) + Vite + Tailwind CSS v4 + Lucide Icons
- **Database & Security**: PostgreSQL / Supabase with Row Level Security (RLS) on all tenant-owned tables
- **Validation**: Type-safe Zod schemas for visit logging, public questionnaires, and business configuration
- **Phone Normalization**: E.164 standard phone normalization with multi-country dialing support
- **Messaging**: Official Meta WhatsApp Business Platform Cloud API adapter with consent and opt-out suppression
- **Reputation**: Google Maps Business Profile policy-compliant neutral invitations (zero review gating)

---

## 2. Getting Started

### Prerequisites
- Node.js >= 18 (Tested on Node.js v24.18.0)
- npm >= 9

### Installation
```bash
# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env.local
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running Unit Tests
```bash
npm test
```
Runs 8 automated unit tests verifying phone normalization, Zod schemas, and RBAC permissions via Node test runner + `tsx`.

### Production Build
```bash
npm run build
```

---

## 3. Database Schema & Multi-Tenant Migrations

Migrations are stored in [`supabase/migrations/`](./supabase/migrations/):

1. **`20261022000000_clientloop_schema.sql`**:
   - `businesses`: Workspace profiles, service catalogues, discovery source options, messaging configuration.
   - `business_memberships`: Role-based access control (`owner`, `manager`, `staff`).
   - `customers`: Customer directory scoped to tenant with `UNIQUE(business_id, normalized_phone)`.
   - `visits`: Recorded interactions independent of questionnaire completion.
   - `questionnaire_definitions`: Branded form templates.
   - `questionnaire_tokens`: Cryptographic expiring single-use form hashes (zero PII in URLs).
   - `questionnaire_submissions`: Customer responses saved idempotently per visit.
   - `messages`: WhatsApp dispatch queue with idempotency keys and opt-out suppression.
   - `review_activity`: Transparent tracking of review invitation views and outbound link clicks (clicks != reviews).
   - `audit_events`: Security event log.
   - **Row Level Security (RLS)**: Enabled across all 10 tables with helper functions `get_auth_business_ids()` and `has_business_role()`.

2. **`20261022000001_tenant_isolation_tests.sql`**:
   - Repeatable SQL test procedure `run_clientloop_isolation_tests()` proving that Tenant A cannot query or mutate Tenant B records, and that identical phone numbers across distinct tenants do not collide.

---

## 4. Security & Privacy Guarantees

- **Strict Data Isolation**: No customer identity matching spans across different businesses.
- **Single-Use Tokens**: Public questionnaire links do not expose phone numbers or personal data in URLs.
- **Zero Review Gating**: Fully compliant with Google review policies. Never gates by rating or offers conditional gifts/incentives.
- **Instant Opt-Out Suppression**: Customer `STOP` responses suppress future automated messages immediately.
- **Sanitized Exports**: CSV downloads include spreadsheet formula-injection shields (`=`, `+`, `-`, `@` escaping).

---

## 5. Project Structure

```
├── .env.example                                      # Environment variables template
├── supabase/
│   └── migrations/
│       ├── 20261022000000_clientloop_schema.sql       # PostgreSQL schema & RLS policies
│       └── 20261022000001_tenant_isolation_tests.sql # Tenant isolation SQL test suite
├── src/
│   ├── lib/
│   │   ├── types/
│   │   │   └── database.ts                          # TypeScript database entity models
│   │   ├── validation/
│   │   │   └── schemas.ts                           # Zod schemas for visits, questionnaires, settings
│   │   ├── phone/
│   │   │   └── normalize.ts                         # E.164 phone normalizer
│   │   ├── auth/
│   │   │   └── roles.ts                             # Role-based access control helpers
│   │   └── utils.ts                                 # Class merge utility (cn)
│   ├── components/
│   │   ├── Navbar.tsx                               # Sticky navigation with mobile menu
│   │   ├── Hero.tsx                                 # Hero with interactive dashboard preview
│   │   ├── InteractiveProductPreview.tsx            # 4-tab product deep-dive with phone simulator
│   │   ├── ValueComparison.tsx                      # Disconnected vs connected reality
│   │   ├── HowItWorks.tsx                           # 3-step sequence with UI mockups
│   │   ├── FeaturesBento.tsx                        # 8-panel editorial bento grid
│   │   ├── UseCaseSwitcher.tsx                      # 5 industry configurations
│   │   ├── CustomerJourney.tsx                      # 5-stage interactive pipeline
│   │   ├── TrustAndEthics.tsx                       # Architectural integrity principles
│   │   ├── PricingSection.tsx                       # Early access tiers with annual discount
│   │   ├── FAQSection.tsx                           # Accessible accordion
│   │   ├── FinalCTA.tsx                             # Email capture with validation & demo state
│   │   ├── Footer.tsx                               # Complete footer
│   │   ├── Logo.tsx                                 # ClientLoop SVG logo
│   │   ├── Modal.tsx                                # Accessible dialog primitive
│   │   └── ModalsCollection.tsx                     # Modals for Sign In, Early Access, Privacy, Terms
│   ├── App.tsx                                      # Main application page
│   ├── main.tsx                                     # Application entrypoint
│   └── index.css                                    # Tailwind v4 theme & custom utilities
└── tests/
    └── unit/
        └── phone_and_validation.test.ts             # Unit test suite
```
