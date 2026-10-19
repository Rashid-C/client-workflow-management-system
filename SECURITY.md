# Security controls

- API responses use Helmet headers; request bodies are limited to 1 MiB. The web app sends a Content Security Policy that permits Next.js scripts and the public Google Maps iframe, and prevents framing by other sites.
- All API routes are limited to 300 requests per IP per minute per route; login and password changes are limited to 5 per IP per minute. Existing account lockout remains: 5 failed sign-ins lock the account for 15 minutes. Rate-limit storage is in process memory, so keep one API instance per worker unless shared storage is configured.
- Session and language cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Session tokens are random, only their SHA-256 hashes are stored, and sessions expire after 12 hours or 2 idle hours.
- Unsafe browser requests with an `Origin` must match `WEB_ORIGINS`; requests without `Origin` remain supported for non-browser clients. Set `WEB_ORIGINS` in production.
- Mutating business operations write to the audit log in the same database transaction. Authentication failures, lockouts, sign-ins and password changes are audited too.
- `DATABASE_URL` is required. If Microsoft 365 email is enabled with `MAIL_HOST`, its OAuth settings must also be configured. Startup rejects malformed origins, timezone and mail port settings.
- Production 500 responses contain only a generic message; detailed errors stay in server logs.
