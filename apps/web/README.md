# Tickwise web application

The Next.js frontend for Tickwise, the client-workflow and work-management system used by an accounting and auditing team.

## Routes

- `/[lang]` is the public product page in English or Arabic.
- `/[lang]/login` is the administrator-provisioned employee sign-in.
- `/[lang]/overview` is the authenticated workspace dashboard.
- Other workspace routes cover clients, documents, engagements, assignments, time logs, daily updates, employees, permissions and activity history.

The language prefix is `en` or `ar`; the app preserves the employee's saved language after sign-in.

## Development

Run these commands from the repository root:

```bash
pnpm --filter web dev
pnpm --filter web lint
pnpm --filter web build
```

The frontend talks to the NestJS API through the same-origin `/api` rewrite configured in `next.config.ts`. The API and database must be configured for authenticated workspace features.
