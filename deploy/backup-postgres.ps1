$ErrorActionPreference = 'Stop'

$required = @('TICKWISE_PGHOST', 'TICKWISE_PGPORT', 'TICKWISE_PGDATABASE', 'TICKWISE_PGUSER', 'TICKWISE_PGPASSFILE', 'TICKWISE_BACKUP_DIR', 'TICKWISE_PGBIN')
foreach ($name in $required) {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
    throw "Required backup setting is missing: $name"
  }
}

$dump = Join-Path $env:TICKWISE_PGBIN 'pg_dump.exe'
if (-not (Test-Path -LiteralPath $dump)) { throw "pg_dump.exe not found: $dump" }
if (-not (Test-Path -LiteralPath $env:TICKWISE_PGPASSFILE)) { throw 'PostgreSQL password file was not found.' }

New-Item -ItemType Directory -Path $env:TICKWISE_BACKUP_DIR -Force | Out-Null
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$backup = Join-Path $env:TICKWISE_BACKUP_DIR "tickwise-$stamp.dump"
$env:PGPASSFILE = $env:TICKWISE_PGPASSFILE
$env:PGCONNECT_TIMEOUT = '15'

try {
  & $dump --format=custom --compress=6 --no-password --host=$env:TICKWISE_PGHOST --port=$env:TICKWISE_PGPORT --username=$env:TICKWISE_PGUSER --dbname=$env:TICKWISE_PGDATABASE --file=$backup
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
  if (-not (Test-Path -LiteralPath $backup) -or (Get-Item -LiteralPath $backup).Length -eq 0) { throw 'pg_dump produced an empty backup.' }

  Get-ChildItem -LiteralPath $env:TICKWISE_BACKUP_DIR -Filter 'tickwise-*.dump' -File |
    Where-Object { $_.LastWriteTimeUtc -lt [DateTime]::UtcNow.AddDays(-30) } |
    Remove-Item -Force
  Write-Output "Backup completed: $backup"
}
catch {
  if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force }
  throw
}
