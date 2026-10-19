# Tickwise go-live runbook / Go-live നടത്തിപ്പ്

ഈ runbook Vercel-ൽ web app-ും, ഓഫീസിലെ Windows machine-ൽ API + PostgreSQL-ും ഉള്ള setup-നാണ്. Commands production മാറ്റങ്ങൾ വരുത്തും; ഓരോ command-വും run ചെയ്യുന്നതിന് മുമ്പ് review ചെയ്യുക. ഈ repo-യിൽ production command സ്വയം run ചെയ്തിട്ടില്ല.

This runbook is for the web app on Vercel and the API/PostgreSQL on the office Windows machine. Commands below can change production; review each before running it. No production services or configuration were changed. A restore rehearsal was completed against a disposable database using a snapshot of `tickwise_dev`.

## 1. First install / ആദ്യ install

### DNS and Cloudflare Tunnel / DNS, Tunnel

1. Cloudflare Dashboard → Zero Trust → Networks → Tunnels-ൽ named tunnel സൃഷ്ടിക്കുക. Windows `cloudflared` connector തിരഞ്ഞെടുക്കുക.
2. Public Hostname `api.example.com` ചേർക്കുക; service `http://127.0.0.1:3001` ആക്കുക. Cloudflare TLS edge-ൽ terminate ചെയ്യും. Router/firewall-ൽ inbound port തുറക്കരുത്; tunnel outbound connection ആണ്.
3. Cloudflare Tunnel token secure password manager-ൽ സൂക്ഷിക്കുക. താഴെയുള്ള `<TUNNEL_TOKEN>` command-ൽ placeholder മാത്രം മാറ്റി elevated PowerShell-ൽ run ചെയ്യുക:

```powershell
cloudflared.exe service install <TUNNEL_TOKEN>
Start-Service cloudflared
Get-Service cloudflared
```

`cloudflared` Windows service ആയാണ് തുടർച്ചയായി പ്രവർത്തിക്കുക. Token command history-ൽ സൂക്ഷിക്കാതിരിക്കാൻ PowerShell history-ൽ നിന്ന് അത് നീക്കുക; token logs/chat-ൽ ഇടരുത്. Cloudflare UI-ൽ connector Healthy എന്ന് ഉറപ്പാക്കുക.

Create a named tunnel in Cloudflare Zero Trust, add `api.example.com` as a public hostname to `http://127.0.0.1:3001`, and install the connector as the `cloudflared` Windows service. Do not open inbound router/firewall ports. Keep the tunnel token in a password manager and out of shell history/logs.

### API and environment / API, environment

1. Node.js LTS, pnpm, PostgreSQL client tools (`psql`, `pg_dump`, `pg_restore`) install ചെയ്യുക. API build output office machine-ൽ നൽകുക; API source/migrations deploy artifact-ൽ ഉണ്ടാകണം.
2. `apps/api/.env.example` പകർത്തി `apps/api/.env` സൃഷ്ടിക്കുക. `DATABASE_URL`-ൽ `tickwise_app` role ഉപയോഗിക്കുക. Production origin-കൾ മാത്രം `WEB_ORIGINS`-ൽ comma-separated ആയി ചേർക്കുക; ഉദാ. `https://app.example.com`. Vercel preview domains ഉപയോഗിക്കുന്നുവെങ്കിൽ ആവശ്യമായ exact origins ചേർക്കുക; wildcard ഒഴിവാക്കുക.
3. `TRUST_PROXY=loopback` വയ്ക്കുക: API loopback-ൽ bind ചെയ്യുന്നു, local `cloudflared` മാത്രമാണ് trusted proxy. Proxy topology മാറ്റിയാൽ Express trust-proxy setting കൃത്യമായ proxy IP/CIDR-க்கு മാറ്റി review ചെയ്യുക; `true`/`*` ആക്കരുത്.
4. Mail enabled ആണെങ്കിൽ Microsoft 365 OAuth app/Exchange SMTP.SendAsApp setup-നുള്ള secrets .env-ൽ machine ACL ഉപയോഗിച്ച് സുരക്ഷിതമായി സൂക്ഷിക്കുക. Mail off ആണെങ്കിൽ MAIL_HOST ഒഴിവാക്കുക.
5. API-യെ production service ആയി Task Scheduler-ൽ `At startup` trigger-ോടെ ആരംഭിക്കുക: executable `node.exe`, arguments `dist/main.js`, Start in = `apps/api`, account = dedicated Windows service account. `apps/api/.env`-ന് ആ account-ന് read permission മാത്രം നൽകുക; administrators/SYSTEM-ന് full control. Failure-ൽ task restart-ും configure ചെയ്യുക. Health check `/api/v1/auth/me`-ന് unauthenticated `401` ലഭിക്കുന്നത് API up ആണെന്ന് ഉറപ്പാക്കും.
6. First admin ഒരിക്കൽ സൃഷ്ടിക്കാൻ API folder-ൽ pnpm run create-admin interactive prompt run ചെയ്യുക. Password terminal-ൽ കാണിക്കില്ല; credentials command arguments/environment-ൽ ഇടരുത്.

Copy `apps/api/.env.example` to `apps/api/.env`. Set the runtime `DATABASE_URL` to the non-DDL `tickwise_app` role, `WEB_ORIGINS` to exact deployed Vercel origins, `TRUST_PROXY=loopback`, and protect the file with NTFS ACLs. Run the built API at startup under a dedicated Windows account with Task Scheduler (restart on failure). The API binds only to `127.0.0.1`; the tunnel is its only remote path.

### PostgreSQL roles / Database roles

1. Database-ന്റെ പുതിയ backup എടുത്ത് maintenance window-ൽ ഈ മാറ്റം നടത്തുക. deploy/postgres-roles.sql-ലെ role, database പേരുകൾ യഥാർത്ഥ production values-നോട് പൊരുത്തപ്പെടുന്നുണ്ടോ എന്ന് review ചെയ്യുക. SQL നിലവിലെ public-schema objects-ന്റെ owner-നെ tickwise_migrator ആക്കുകയും app role-ന് DML മാത്രം നൽകുകയും backup role-ന് read-only access നൽകുകയും ചെയ്യും.
2. PostgreSQL superuser/admin ആയി psql തുറന്ന് file run ചെയ്യുക. psql password prompts-ൽ വ്യത്യസ്ത passwords നൽകുക; password command arguments/history-ൽ വരാതെ നോക്കുക. Script PUBLIC-ന് public-schema CREATE privilege revoke ചെയ്യുന്നതിനാൽ, മറ്റ് apps ആ privilege ആശ്രയിക്കുന്നുണ്ടോ എന്ന് ആദ്യം പരിശോധിക്കുക.
3. Validation: `SELECT has_schema_privilege('tickwise_app','public','CREATE');` மற்றும் `SELECT has_database_privilege('tickwise_app','tickwise_prod','CREATE');` இரண்டும் `false` ஆக வேண்டும். `tickwise_migrator` மட்டும் schema CREATE வைத்திருக்க வேண்டும்.

Review `deploy/postgres-roles.sql`, especially its ownership transfer and the `REVOKE CREATE ... FROM PUBLIC` (this can affect other database users). Run it once as a PostgreSQL superuser/admin. Set three unique passwords at the interactive `\password` prompts. Verify the app role has neither schema nor database CREATE privilege.

```powershell
psql.exe --host=127.0.0.1 --username=postgres --dbname=tickwise_prod --set=ON_ERROR_STOP=on --file=deploy/postgres-roles.sql
```

### Vercel / Vercel configuration

`apps/web/.env.example`-இல் உள்ள `API_ORIGIN`-ஐ Vercel Project → Settings → Environment Variables-ல் **Production build** scope-க்கு `https://api.example.com` என set செய்யவும். Preview scope-ல் பயன்படுத்தினால் அதற்கும் reachable API origin set செய்யவும். `API_ORIGIN` Next build-இல் baked-in; value மாற்றிய பின் redeploy/rebuild தேவை. API-side `WEB_ORIGINS`-ல் Vercel app origin இருக்க வேண்டும்.

Set `API_ORIGIN=https://api.example.com` in Vercel Project Settings → Environment Variables for the relevant build environments. Next.js bakes this value into the build, so changing it requires a new build/deployment. Add the exact Vercel app origin to the API's `WEB_ORIGINS`.

## 2. Updates and migrations / Update, migration

1. Change window-க்கு முன் current backup வெற்றியடைந்ததா verify செய்யவும்.
2. App DB credential-க்கு பதிலாக `tickwise_migrator` credential கொண்ட secured temporary env-ஐப் பயன்படுத்தி migration run செய்யவும். `DATABASE_URL`-ஐ migration session-ல் மட்டும் migrator URL-ஆக set செய்து, apps/api-இல் project migration instructions (`--from` latest migration folder உடன்) പാലിക്കുക.
3. Migration success, API tests/build, disposable restore/checks verify ചെയ്ത ശേഷം `apps/api/.env`-ல் runtime `tickwise_app` URL തുടരുന്നതായി ഉറപ്പാക്കുക; API build deploy/restart ചെയ്യുക.
4. Vercel build-ൽ ശരിയായ `API_ORIGIN` ഉണ്ടെന്നും Tunnel Healthy ആണെന്നും confirm ചെയ്യുക.

Verify a fresh backup. Run the repository migration workflow using a secured, temporary `DATABASE_URL` for `tickwise_migrator` (never the runtime role), including the required `--from` latest migration directory. After success, deploy/restart the API with the `tickwise_app` URL and redeploy Vercel if its build configuration changed.

```powershell
$latest = Get-ChildItem migrations/app -Directory | Sort-Object Name | Select-Object -Last 1 -ExpandProperty Name
pnpm exec prisma migration plan --name <slug> --from $latest --no-interactive
pnpm exec prisma migration check
# Only after the planned ops.json was reviewed and the owner approved production apply:
pnpm exec prisma db migrate --advance-ref db
```

## 3. Nightly backups / രാത്രികാല backup

1. Dedicated Windows backup account-നും PostgreSQL `tickwise_backup` read-only role-നും ഉപയോഗിക്കുക. Secure `pgpass.conf`-ൽ മാത്രം password സൂക്ഷിക്കുക; file ACL backup account-ന് read, Administrators/SYSTEM-ന് full control എന്നതാക്കുക. Password script, environment command, Task Scheduler arguments എന്നിവയിൽ ഇടരുത്.
2. Backup task account-ന്റെ machine environment-ൽ `TICKWISE_PGHOST=127.0.0.1`, `TICKWISE_PGPORT=5432`, `TICKWISE_PGDATABASE=tickwise_prod`, `TICKWISE_PGUSER=tickwise_backup`, `TICKWISE_PGPASSFILE`, `TICKWISE_BACKUP_DIR` (separate disk preferred), `TICKWISE_PGBIN` (PostgreSQL `bin` folder) configure ചെയ്യുക.
3. Task Scheduler-ൽ daily 02:00 Asia/Abu Dhabi trigger, `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File <absolute-path>\deploy\backup-postgres.ps1` action, “Run whether user is logged on or not”, failure-ൽ retry എന്നിവ set ചെയ്യുക. First run-ന് മുമ്പ് exact command path/account review ചെയ്യുക.
4. `deploy/backup-postgres.ps1` custom-format `pg_dump` സൃഷ്ടിക്കും; വിജയത്തിനു ശേഷമേ 30 ദിവസത്തിൽ പഴയ `tickwise-*.dump` മായ്ക്കൂ. Task History, latest file size/time, script exit status പരിശോധിക്കുക. Backup directory machine-ിൽ നിന്ന് പുറത്തേക്കുള്ള encrypted/offsite copy വേറെ ഉണ്ടാക്കുക; RAID മാത്രം backup അല്ല.

Use a dedicated task account and read-only `tickwise_backup` role. Put its password only in an ACL-protected `pgpass.conf`. Schedule `deploy/backup-postgres.ps1` daily at 02:00 Gulf Standard Time (Windows local time). It creates a custom-format dump and deletes matching dumps older than 30 days only after a successful dump. Keep an encrypted off-machine copy as well.

## 4. Restore rehearsal and recovery / Restore പരീക്ഷണം, recovery

Production restore ചെയ്യുന്നതിന് മുമ്പ് ഏറ്റവും പുതിയ backup disposable database-ലേക്ക് restore ചെയ്ത് rehearse ചെയ്യുക. Rehearsal-ിൽ data production-നോട് തുല്യമായതിനാൽ office-controlled host-ൽ മാത്രം നടത്തുക. Test DB-യുടെ പേര് `tickwise_restoretest` ആയിരിക്കണം; production DB-യുടെ പേര് ഉപയോഗിക്കരുത്.

1. DBA login-ൽ test DB സൃഷ്ടിക്കുക, owner `tickwise_migrator` ആക്കുക.
2. Isolated test DB-ലേക്ക് `pg_restore --no-owner --no-acl --exit-on-error` ഉപയോഗിച്ച് restore ചെയ്യുക. Migration role-ൽ connect ചെയ്യുക; backup file path മാത്രം command-ൽ നൽകുക.
3. `psql`-ൽ `SELECT count(*) FROM public."Employee";`, `public."Client"`, `public."Task"` എന്നിവ നടത്തുക; expected values backup-ിലെ source snapshot-നോട് പൊരുത്തപ്പെടണം. Important screens/login/report queries smoke-test ചെയ്യുക. Restore duration രേഖപ്പെടുത്തുക.
4. Rehearsal pass ആയ ശേഷം കൃത്യമായ test DB name-ന് മാത്രം dropdb നടത്തുക. Production restore വേണ്ടിവന്നാൽ API stop ചെയ്ത് fresh backup എடுக்கുക; പുതിയ പേരുള്ള database-ലേക്ക് restore ചെയ്ത് validate ചെയ്ത ശേഷം connection മാറ്റി service restart ചെയ്യുക. Original DB overwrite/drop ചെയ്യരുത്.

Restore rehearsal commands (replace paths/account prompts; run only after reviewing each line):

```powershell
createdb.exe --host=127.0.0.1 --username=postgres --owner=tickwise_migrator tickwise_restoretest
pg_restore.exe --host=127.0.0.1 --username=tickwise_migrator --dbname=tickwise_restoretest --no-owner --no-acl --exit-on-error "C:\TickwiseBackups\tickwise-YYYYMMDDTHHMMSSZ.dump"
psql.exe --host=127.0.0.1 --username=tickwise_migrator --dbname=tickwise_restoretest --command 'SELECT count(*) FROM public."Employee"; SELECT count(*) FROM public."Client"; SELECT count(*) FROM public."Task";'
dropdb.exe --host=127.0.0.1 --username=postgres tickwise_restoretest
```

Local automated rehearsal requires `apps/api/.env` to point to `tickwise_dev`; its configured role needs `CREATEDB` and restore DDL privileges. The script creates a temporary custom dump and `tickwise_golive_restoretest`, restores it, compares Employee/Client/Task counts, drops only the database it created, then deletes the temporary dump and password file. It stops if the target already exists and never writes to source `tickwise_dev`.

Command for review before execution:

```powershell
.\deploy\restore-rehearsal.ps1
```

Restore rehearsal completed successfully on 2026-10-19: the script dumped `tickwise_dev`, restored into `tickwise_golive_restoretest`, matched Employee/Client/Task row counts, and dropped the disposable database. The temporary dump and password file were removed. The command used an explicit PostgreSQL 18 client-tools path.

## 5. Tunnel outage / Tunnel down ആയാൽ

1. Vercel-ൽ `502/503` ഉണ്ടെങ്കിൽ Cloudflare Tunnel dashboard-ൽ connector Healthy ആണോ നോക്കുക; Windows-ൽ `Get-Service cloudflared`, API startup task last result, `127.0.0.1:3001` health check പരിശോധിക്കുക.
2. Cloudflare service stopped ആണെങ്കിൽ logs/event viewer പരിശോധിച്ച് `Start-Service cloudflared`; API stopped ആണെങ്കിൽ Task Scheduler-ൽ task restart ചെയ്യുക. Tunnel token/config മാറ്റം ആവശ്യമെങ്കിൽ Cloudflare Dashboard-ിൽ പുതുക്കി, service restart ചെയ്ത് verify ചെയ്യുക.
3. PostgreSQL, API port, അല്ലെങ്കിൽ database auth-ൽ തകരാർ ആണെങ്കിൽ logs പരിശോധിക്കുക; router port തുറക്കരുത്, Origin check/rate limiting disable ചെയ്യരുത്. Office machine-ന് internet ഇല്ലെങ്കിൽ service restore ആകുന്നത് വരെ Vercel users API features ഉപയോഗിക്കാനാവില്ല; data source നേരിട്ട് expose ചെയ്യാതെ outage അറിയിക്കുക.

If Vercel reports `502/503`, check Tunnel connector health, `Get-Service cloudflared`, the API startup task, and the local API health response. Restart only the failed service/task and inspect Windows/Cloudflare logs. Never open router ports or disable Origin validation/rate limits as a workaround. An office internet outage means API features remain unavailable until the tunnel recovers.
