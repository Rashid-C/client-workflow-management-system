# Tickwise — Project Context

## 1. Project Overview

Tickwise is a cloud-based business workflow and work-management system
for a single accounting/auditing company.

The system manages:

- Clients
- Client documents
- Document expiry
- Sales follow-ups
- Employees
- Work allocation
- Task types
- Workflow stages
- Time tracking
- Daily work updates
- Management monitoring
- Reports
- Notifications
- Audit/activity history

The system is not currently designed as a multi-tenant SaaS platform.

---

## 2. Project Goal

Build a production-quality, secure, scalable and maintainable business
management system.

This is a real application, not a tutorial or demo project.

---

## 3. Core Technology

- Frontend: Next.js
- Backend: NestJS
- Language: TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Package Manager: pnpm
- Version Control: Git

Additional infrastructure will be introduced when required:

- Redis
- BullMQ
- Docker
- Object Storage
- CI/CD
- Monitoring
- Caching

---

## 4. Architecture Direction

Initial architecture:

Next.js
    ↓
NestJS REST API
    ↓
Prisma
    ↓
PostgreSQL

The backend will initially follow a modular-monolith architecture.

Microservices will not be introduced unless there is a demonstrated
architectural reason to do so.

---

## 5. Engineering Principles

The system must consider:

- Security
- Performance
- Scalability
- Maintainability
- Reliability
- Observability
- Testability
- Good user experience

Important engineering concerns include:

- Database indexing
- Query optimization
- N+1 query prevention
- Appropriate relation loading
- Pagination
- Caching
- Transactions
- Concurrency
- Idempotency
- Background processing
- Error handling
- Validation
- Authorization
- Auditability

Solutions should be introduced when they are relevant to the feature
being implemented.

---

## 6. Development Approach

Development will be incremental.

For each feature:

1. Understand the requirement.
2. Design the feature.
3. Understand the architecture.
4. Implement it.
5. Test it.
6. Review performance and security.
7. Document it.
8. Commit the changes to Git.

---

## 7. Documentation Rule

Project documentation is a living knowledge base.

Important architecture, business rules, database decisions,
performance decisions, security decisions and module behavior must be
updated as the project evolves.

Documentation should reflect the actual implemented system.

---

## 8. Current Status

Git repository initialized.

Initial project commit:

chore: initialize Tickwise project

Next step:

Create the production-oriented application structure.