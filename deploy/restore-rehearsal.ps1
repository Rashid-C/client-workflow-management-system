param(
  [string]$PostgresBin
)

$ErrorActionPreference = 'Stop'
$sourceDbExpected = 'tickwise_dev'
$testDb = 'tickwise_golive_restoretest'
$apiEnv = Join-Path $PSScriptRoot '..\apps\api\.env'
$sourceDbCreated = $false
$backup = Join-Path $env:TEMP "tickwise-restore-rehearsal-$([guid]::NewGuid().ToString('N')).dump"
$passFile = Join-Path $env:TEMP "tickwise-pgpass-$([guid]::NewGuid().ToString('N')).conf"
$countSql = Join-Path $env:TEMP "tickwise-restore-counts-$([guid]::NewGuid().ToString('N')).sql"

if ([string]::IsNullOrWhiteSpace($PostgresBin)) {
  $pgDumpCommand = Get-Command pg_dump.exe -ErrorAction SilentlyContinue
  if (-not $pgDumpCommand) { throw 'PostgreSQL client tools are not on PATH; pass -PostgresBin <PostgreSQL bin folder>.' }
  $PostgresBin = Split-Path -Parent $pgDumpCommand.Source
}

foreach ($tool in @('pg_dump.exe', 'createdb.exe', 'pg_restore.exe', 'psql.exe', 'dropdb.exe')) {
  if (-not (Test-Path -LiteralPath (Join-Path $PostgresBin $tool))) { throw "PostgreSQL client tool not found: $tool" }
}
if (-not (Test-Path -LiteralPath $apiEnv)) { throw 'apps/api/.env was not found.' }
$databaseLine = [IO.File]::ReadAllLines((Resolve-Path $apiEnv)) | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
if (-not $databaseLine) { throw 'DATABASE_URL is missing from apps/api/.env.' }
$connectionString = ($databaseLine -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"').Trim("'")
$connectionPattern = '^postgres(?:ql)?://(?<user>[^:/?#]+):(?<password>.+)@(?<host>\[[^\]]+\]|[^:/?#]+)(?::(?<port>\d+))?/(?<database>[^?]+)(?:\?.*)?$'
if ($connectionString -notmatch $connectionPattern) { throw 'DATABASE_URL must be a valid PostgreSQL connection URL.' }
$pgUser = [Uri]::UnescapeDataString($Matches['user'])
$pgPassword = [Uri]::UnescapeDataString($Matches['password'])
$pgHost = $Matches['host'].TrimStart('[').TrimEnd(']')
$sourceDb = [Uri]::UnescapeDataString($Matches['database'])
$pgPort = if ($Matches['port']) { $Matches['port'] } else { '5432' }
if ($sourceDb -ne $sourceDbExpected) {
  throw "Restore rehearsal only permits source database '$sourceDbExpected'."
}

function Escape-Pgpass([string]$Value) {
  $Value.Replace('\', '\\').Replace(':', '\:')
}

$pgpassLine = "$(Escape-Pgpass $pgHost):$(Escape-Pgpass $pgPort):$(Escape-Pgpass $sourceDb):$(Escape-Pgpass $pgUser):$(Escape-Pgpass $pgPassword)"
$pgpassTargetLine = "$(Escape-Pgpass $pgHost):$(Escape-Pgpass $pgPort):$(Escape-Pgpass $testDb):$(Escape-Pgpass $pgUser):$(Escape-Pgpass $pgPassword)"
[IO.File]::WriteAllText($passFile, $pgpassLine + "`n" + $pgpassTargetLine + "`n", [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($countSql, 'SELECT (SELECT count(*) FROM public."Employee"), (SELECT count(*) FROM public."Client"), (SELECT count(*) FROM public."Task");', [Text.UTF8Encoding]::new($false))
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $passFile /inheritance:r /grant:r "$($identity):(R)" | Out-Null
if ($LASTEXITCODE -ne 0) { Remove-Item -LiteralPath $passFile -Force; throw 'Could not restrict temporary pgpass file permissions.' }
$env:PGPASSFILE = $passFile
$env:PGCONNECT_TIMEOUT = '15'

try {
  $bin = (Resolve-Path $PostgresBin).Path
  $createPrivilege = & (Join-Path $bin 'psql.exe') --no-password --tuples-only --no-align --host=$pgHost --port=$pgPort --username=$pgUser --dbname=$sourceDb --command "SELECT rolsuper OR rolcreatedb FROM pg_roles WHERE rolname = current_user"
  if ($LASTEXITCODE -ne 0 -or ($createPrivilege | Select-Object -First 1).Trim() -ne 't') {
    throw 'The configured database role cannot create a test database; use an approved local DBA connection for this rehearsal.'
  }
  $targetExists = & (Join-Path $bin 'psql.exe') --no-password --tuples-only --no-align --host=$pgHost --port=$pgPort --username=$pgUser --dbname=$sourceDb --command "SELECT count(*) FROM pg_database WHERE datname = '$testDb'"
  if ($LASTEXITCODE -ne 0) { throw 'Could not check whether the throwaway target database already exists.' }
  if (($targetExists | Select-Object -First 1).Trim() -ne '0') { throw "Refusing to use existing database '$testDb'; remove it only after verifying it is disposable." }

  $sourceCounts = @(& (Join-Path $bin 'psql.exe') --no-password --tuples-only --no-align --host=$pgHost --port=$pgPort --username=$pgUser --dbname=$sourceDb --file=$countSql)
  if ($LASTEXITCODE -ne 0) { throw 'Could not read the source table counts for restore verification.' }
  & (Join-Path $bin 'pg_dump.exe') --no-password --format=custom --compress=6 --host=$pgHost --port=$pgPort --username=$pgUser --dbname=$sourceDb --file=$backup
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }

  & (Join-Path $bin 'createdb.exe') --no-password --maintenance-db=$sourceDb --host=$pgHost --port=$pgPort --username=$pgUser --owner=$pgUser $testDb
  if ($LASTEXITCODE -ne 0) { throw "Could not create throwaway database '$testDb'." }
  $sourceDbCreated = $true
  & (Join-Path $bin 'pg_restore.exe') --no-password --host=$pgHost --port=$pgPort --username=$pgUser --dbname=$testDb --no-owner --no-acl --exit-on-error $backup
  if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE" }
  $restoredCounts = @(& (Join-Path $bin 'psql.exe') --no-password --tuples-only --no-align --host=$pgHost --port=$pgPort --username=$pgUser --dbname=$testDb --file=$countSql)
  if ($LASTEXITCODE -ne 0 -or ($restoredCounts -join '').Trim() -ne ($sourceCounts -join '').Trim()) {
    throw 'Restore completed, but Employee/Client/Task row counts do not match the source snapshot.'
  }
  Write-Output 'Restore rehearsal passed: Employee, Client, and Task counts match.'
}
finally {
  if ($sourceDbCreated) {
    & (Join-Path $PostgresBin 'dropdb.exe') --no-password --maintenance-db=$sourceDb --host=$pgHost --port=$pgPort --username=$pgUser $testDb
    if ($LASTEXITCODE -ne 0) { throw "Restore rehearsal passed/failed but disposable database '$testDb' could not be dropped." }
    Write-Output "Disposable database '$testDb' dropped."
  }
  Remove-Item -LiteralPath $backup, $passFile, $countSql -Force -ErrorAction SilentlyContinue
  Remove-Item Env:PGPASSFILE, Env:PGCONNECT_TIMEOUT -ErrorAction SilentlyContinue
  $pgPassword = $null
  $connectionString = $null
}
