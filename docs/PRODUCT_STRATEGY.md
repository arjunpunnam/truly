# Truly: Product Strategy & Roadmap

> **Vision**: Build the most intuitive open-source rule engine, with an optional managed cloud offering for teams that need enterprise features.

---

## Table of Contents

1. [Strategic Overview](#strategic-overview)
2. [Open-Source Strategy](#open-source-strategy)
3. [SaaS Transition Triggers](#saas-transition-triggers)
4. [Feature Differentiation](#feature-differentiation)
5. [Technical Architecture](#technical-architecture)
6. [Monetization Strategy](#monetization-strategy)
7. [Roadmap](#roadmap)

---

## Strategic Overview

### The Model: Open-Core

Truly follows the **open-core** business model, similar to successful projects like:

| Company | OSS Product | Commercial Offering |
|---------|-------------|---------------------|
| GitLab | GitLab CE | GitLab EE / GitLab.com |
| Supabase | Supabase (self-hosted) | Supabase Cloud |
| PostHog | PostHog (self-hosted) | PostHog Cloud |
| n8n | n8n (self-hosted) | n8n Cloud |

```
┌─────────────────────────────────────────────────────────────┐
│                      TRULY ECOSYSTEM                        │
├─────────────────────────────┬───────────────────────────────┤
│     TRULY (Open Source)     │       TRULY CLOUD (SaaS)      │
├─────────────────────────────┼───────────────────────────────┤
│ ✓ Visual Rule Builder       │ ✓ Everything in OSS           │
│ ✓ Schema Import (Swagger)   │ ✓ Multi-tenancy               │
│ ✓ Drools Execution Engine   │ ✓ Team Collaboration          │
│ ✓ Rule Testing & Simulation │ ✓ SSO / SAML                  │
│ ✓ Execution History         │ ✓ Audit Logs (extended)       │
│ ✓ API for Rule Execution    │ ✓ Role-based Access Control   │
│ ✓ SQLite Database           │ ✓ Usage Analytics Dashboard   │
│ ✓ Docker Support            │ ✓ SLA & Support               │
│                             │ ✓ Managed SQLite (per-tenant) │
│         FREE (MIT)          │     PAID SUBSCRIPTION         │
└─────────────────────────────┴───────────────────────────────┘
```

---

## Open-Source Strategy

### Goals

1. **Build community & adoption** before monetizing
2. **Establish Truly as the go-to OSS rule engine** for developers
3. **Collect feedback** to shape the product roadmap
4. **Create trust** through transparency

### Tactics

#### Repository & Licensing
- **License**: MIT (permissive, encourages adoption)
- **Repository**: Public on GitHub
- **Branding**: Clear "Truly" name with logo and identity

#### Community Building

| Channel | Purpose |
|---------|---------|
| **GitHub Discussions** | Q&A, feature requests, RFCs |
| **Discord Server** | Real-time community chat |
| **Twitter/X** | Announcements, demos, visibility |
| **Dev.to / Hashnode** | Technical articles, tutorials |
| **YouTube** | Video tutorials, use case demos |

#### Documentation
- **Getting Started Guide** - 5-minute setup
- **Use Case Examples** - Loan approval, fraud detection, pricing rules
- **API Reference** - OpenAPI spec
- **Self-Hosting Guide** - Docker, Kubernetes, bare metal

#### Contribution Model
- `CONTRIBUTING.md` with clear guidelines
- Issue labels: `good-first-issue`, `help-wanted`
- Regular contributor recognition

### Success Metrics (Pre-SaaS)

| Metric | Target | Signal |
|--------|--------|--------|
| GitHub Stars | 1,000+ | Community interest |
| Monthly Active Users | 500+ | Real adoption |
| Contributors | 20+ | Community health |
| Discord Members | 300+ | Engaged community |
| Production Deployments | 50+ | Trust signal |

---

## SaaS Transition Triggers

> **Philosophy**: Don't build SaaS infrastructure until you have validated demand.

### When to Start Building SaaS

Launch SaaS development when **2+ of these triggers** are met:

| Trigger | Signal | How to Measure |
|---------|--------|----------------|
| **Community demand** | Users asking for hosted version | GitHub issues, Discord requests |
| **Enterprise interest** | Companies want SSO, audit logs, SLA | Inbound inquiries, demo requests |
| **Self-hosting pain** | Users struggling with deployment | Support requests, setup issues |
| **Competitor validation** | Similar tools launching cloud offerings | Market research |
| **Resource availability** | Time/funding to build & maintain | Personal/team capacity |

### Early Validation Tactics

Before building full SaaS:

1. **Waitlist Landing Page** - Gauge interest with email signups
2. **Concierge Onboarding** - Manually deploy for early customers
3. **Beta Program** - Invite top OSS users to test cloud features
4. **Stripe Preorders** - Validate willingness to pay

---

## Feature Differentiation

### Core Philosophy

> **OSS should be fully functional for individual developers and small teams.**
> **Cloud adds collaboration, scale, and enterprise features.**

### Feature Matrix

| Feature | OSS (Free) | Cloud (Paid) |
|---------|:----------:|:------------:|
| **Core** | | |
| Visual Rule Builder | ✅ | ✅ |
| Schema Import (Swagger/JSON Schema) | ✅ | ✅ |
| Drools Rule Execution | ✅ | ✅ |
| Rule Testing & Simulation | ✅ | ✅ |
| Execution History | ✅ | ✅ |
| REST API | ✅ | ✅ |
| Docker/Kubernetes Deployment | ✅ | N/A (managed) |
| SQLite Database | ✅ | Managed SQLite (per-tenant) |
| **Collaboration** | | |
| Multi-user Access | ❌ | ✅ |
| Role-based Permissions | ❌ | ✅ |
| Team Workspaces | ❌ | ✅ |
| Comments & Annotations | ❌ | ✅ |
| **Enterprise** | | |
| SSO / SAML Integration | ❌ | ✅ |
| Extended Audit Logs | ❌ | ✅ |
| Usage Analytics Dashboard | ❌ | ✅ |
| SLA & Priority Support | ❌ | ✅ |
| Custom Integrations | ❌ | ✅ |
| **Scale** | | |
| High-availability Deployment | Manual | ✅ Built-in |
| Auto-scaling | Manual | ✅ Built-in |
| Global Edge Execution | ❌ | ✅ |
| 99.9% Uptime SLA | ❌ | ✅ |

### The "Open-Core" Line

Features that are **never paywalled**:
- Core rule building & execution
- All schema/import functionality
- Testing & simulation
- Basic execution history
- Full API access

Features **reserved for Cloud**:
- Multi-tenancy / team features
- Enterprise auth (SSO/SAML)
- Managed infrastructure
- SLA guarantees

---

## Technical Architecture

### Current State (OSS - Single Tenant)

```
┌──────────────────────────────────────────────────┐
│                   TRULY OSS                       │
├───────────────────┬──────────────────────────────┤
│     Frontend      │         Backend              │
│   (React + Vite)  │    (Spring Boot + Drools)    │
├───────────────────┼──────────────────────────────┤
│                   │  ┌─────────────────────────┐ │
│   Rule Builder    │  │    Rule Execution       │ │
│   Schema Manager  │  │    DRL Compilation      │ │
│   Test Console    │  │    Execution History    │ │
│                   │  └─────────────────────────┘ │
├───────────────────┴──────────────────────────────┤
│              SQLite (Single File)                │
│         ~/.ruleengine/data/ruleengine.db         │
└──────────────────────────────────────────────────┘
```

### Future State (SaaS - Multi-Tenant SQLite)

We use a **database-per-tenant** strategy with SQLite, providing complete data isolation:

```
┌──────────────────────────────────────────────────────────────────┐
│                        TRULY CLOUD                               │
├──────────────────────────────────────────────────────────────────┤
│                         API Gateway                              │
│               (Auth, Rate Limiting, Tenant Routing)              │
├───────────────────┬──────────────────────────────────────────────┤
│     Frontend      │              Backend Services                │
│   (React + Vite)  │  ┌────────────┐ ┌─────────────────────────┐ │
│                   │  │   Auth     │ │   Core Engine           │ │
│                   │  │  Service   │ │   (Rule Execution)      │ │
│                   │  ├────────────┤ ├─────────────────────────┤ │
│                   │  │  Billing   │ │   Tenant Router         │ │
│                   │  │  Service   │ │   (DB-per-tenant)       │ │
│                   │  └────────────┘ └─────────────────────────┘ │
├───────────────────┴──────────────────────────────────────────────┤
│  master.db (tenant registry)  │  Redis (cache, rate limits)     │
├───────────────────────────────┴──────────────────────────────────┤
│  tenants/                                                        │
│  ├── tenant_abc123.db    (Tenant A - complete isolation)        │
│  ├── tenant_def456.db    (Tenant B - complete isolation)        │
│  └── tenant_ghi789.db    (Tenant C - complete isolation)        │
└──────────────────────────────────────────────────────────────────┘
```

### Why SQLite for Multi-Tenancy?

| Benefit | Description |
|---------|-------------|
| **Complete Isolation** | Each tenant = separate database file, zero data leak risk |
| **Simple Operations** | Backup = copy file, Delete tenant = delete file |
| **Cost Efficient** | No per-tenant database server costs |
| **Fast Provisioning** | New tenant = create new .db file instantly |
| **Portable** | Export tenant data = send their database file |
| **Consistent Dev/Prod** | Same SQLite engine in OSS and Cloud |

> See [Multi-Tenancy Architecture](./technical/multi-tenancy.md) for full implementation details.

### Preparation for SaaS (Build Now)

These patterns can be added to OSS without breaking changes:

| Pattern | Benefit | Effort |
|---------|---------|--------|
| **User model + basic auth** | Foundation for teams | Medium |
| **API keys for execution** | Programmatic access | Low |
| **Request ID tracing** | Debugging, future observability | Low |
| **Execution metering** | Future billing foundation | Low |
| **Tenant context in requests** | Future multi-tenancy | Low |

---

## Monetization Strategy

### Pricing Model: Usage-Based + Seat-Based Hybrid

| Tier | Price | Includes |
|------|-------|----------|
| **Free (OSS)** | $0 | Self-hosted, unlimited everything |
| **Team** | $29/user/mo | 5 users, 100K executions/mo, SSO |
| **Business** | $79/user/mo | Unlimited users, 1M executions/mo, Priority support |
| **Enterprise** | Custom | Dedicated infra, SLA, custom integrations |

### Overage Pricing
- Additional executions: $0.001 per execution beyond tier limit

### Revenue Projections (Year 1-3)

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Free Users | 1,000 | 5,000 | 15,000 |
| Paid Teams | 10 | 50 | 200 |
| Avg Team Size | 4 | 5 | 6 |
| Monthly Revenue | $1,160 | $7,250 | $34,800 |
| Annual Revenue | $13,920 | $87,000 | $417,600 |

> These are conservative estimates. Actual results depend on market fit and execution.

---

## Roadmap

### Phase 1: OSS Foundation (Now - Q2 2026)

**Goal**: Establish Truly as a solid, well-documented OSS project

| Task | Status |
|------|--------|
| Core rule builder functionality | ✅ Complete |
| Schema import (Swagger/JSON) | ✅ Complete |
| Execution history & testing | ✅ Complete |
| Documentation site | 🔄 In Progress |
| Getting Started guide | 🔄 In Progress |
| Docker deployment | ⬜ To Do |
| GitHub Actions CI/CD | ⬜ To Do |
| v1.0 Release | ⬜ To Do |
| Community launch (Discord, Twitter) | ⬜ To Do |

### Phase 2: Community Growth (Q2 - Q4 2026)

**Goal**: Build adoption and validate demand

| Task | Status |
|------|--------|
| Publish to Docker Hub | ⬜ To Do |
| Helm chart for Kubernetes | ⬜ To Do |
| Use case tutorials (blog posts) | ⬜ To Do |
| YouTube demo videos | ⬜ To Do |
| Track GitHub stars, usage | ⬜ To Do |
| Collect feature requests | ⬜ To Do |
| SaaS interest waitlist | ⬜ To Do |

### Phase 3: SaaS Preparation (Q4 2026 - Q1 2027)

**Goal**: Build foundation for multi-tenancy (if demand validated)

| Task | Status |
|------|--------|
| Add User model + basic auth (optional in OSS) | ⬜ To Do |
| API key system for execution | ⬜ To Do |
| Tenant ID column preparation | ⬜ To Do |
| Request metering/tracking | ⬜ To Do |
| Cloud landing page + waitlist | ⬜ To Do |

### Phase 4: SaaS Launch (Q1 - Q2 2027)

**Goal**: Launch Truly Cloud for paying customers

| Task | Status |
|------|--------|
| Multi-tenancy implementation | ⬜ To Do |
| Team workspaces | ⬜ To Do |
| SSO integration | ⬜ To Do |
| Stripe billing integration | ⬜ To Do |
| Usage dashboard | ⬜ To Do |
| Deploy to cloud (GCP/AWS) | ⬜ To Do |
| Beta launch to waitlist | ⬜ To Do |
| Public launch | ⬜ To Do |

---

## Appendix: Competitors & Inspiration

| Product | Open Source? | Cloud Offering? | Notes |
|---------|:------------:|:---------------:|-------|
| Drools | ✅ | ❌ | Complex, enterprise-focused |
| Easy Rules | ✅ | ❌ | Lightweight, no UI |
| RulesEngine.NET | ✅ | ❌ | .NET ecosystem only |
| Nools | ✅ | ❌ | JavaScript, unmaintained |
| Tray.io | ❌ | ✅ | Workflow automation |
| Camunda | ✅ | ✅ | BPM focused, heavy |

**Truly's Positioning**: The friendly, visual-first rule engine that developers actually enjoy using.

---

## Next Steps

1. **Complete v1.0 documentation** - Getting started, API reference
2. **Set up GitHub for OSS launch** - README, CONTRIBUTING, templates
3. **Create Docker image** - Easy one-command deployment
4. **Plan community launch** - Discord, Twitter, Product Hunt
5. **Build SaaS waitlist page** - Validate demand early
