#!/usr/bin/env bash
# A helyi stack leállítása (pnpm local:down). Az adatok megmaradnak a .local/pg-ben.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCAL="$ROOT/.local"
for svc in gateway gotrue mailpit; do
  pidfile="$LOCAL/run/$svc.pid"
  if [[ -f "$pidfile" ]]; then kill "$(cat "$pidfile")" 2>/dev/null || true; rm -f "$pidfile"; fi
done
if [[ -f "$LOCAL/pg/PG_VERSION" ]]; then
  PGBIN="${PGBIN:-$(pg_config --bindir 2>/dev/null || ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)}"
  if [[ "$(id -u)" == "0" ]]; then runuser -u postgres -- "$PGBIN/pg_ctl" -D "$LOCAL/pg" stop -m fast 2>/dev/null || true
  else "$PGBIN/pg_ctl" -D "$LOCAL/pg" stop -m fast 2>/dev/null || true; fi
fi
echo "Helyi stack leállítva."
