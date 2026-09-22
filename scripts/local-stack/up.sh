#!/usr/bin/env bash
# Docker nélküli helyi „Supabase” (pnpm local:up):
#   Postgres 16  → 127.0.0.1:54322 (postgres / postgres)
#   GoTrue       → 127.0.0.1:9999, az átjárón át: http://127.0.0.1:54321/auth/v1
#   Mailpit      → SMTP 127.0.0.1:54325, webes felület: http://127.0.0.1:54324
# Ugyanazok a portok és demó kulcsok, mint a Supabase CLI-nél (`supabase start`), így a kettő felcserélhető.
# Meglévő Postgreshez (pl. CI service container): LOCAL_PG_URL=postgres://… pnpm local:up
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCAL="$ROOT/.local"
BIN="$LOCAL/bin"
LOGS="$LOCAL/logs"
RUN="$LOCAL/run"
PGDATA="$LOCAL/pg"
PG_PORT="${PG_PORT:-54322}"
API_PORT="${API_PORT:-54321}"
AUTH_PORT="${AUTH_PORT:-9999}"
SMTP_PORT="${SMTP_PORT:-54325}"
MAIL_WEB_PORT="${MAIL_WEB_PORT:-54324}"
SITE_URL="${SITE_URL:-http://localhost:3000}"
GOTRUE_VERSION="v2.179.0"
MAILPIT_VERSION="v1.31.2"
JWT_SECRET="super-secret-jwt-token-with-at-least-32-characters-long"

mkdir -p "$BIN" "$LOGS" "$RUN"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Ez a script Linuxon fut (a GoTrue-kiadás Linux-bináris). macOS/Windows alatt: supabase start"
  exit 1
fi

arch="$(uname -m)"
case "$arch" in
  x86_64) GT_ARCH="x86"; MP_ARCH="amd64" ;;
  aarch64|arm64) GT_ARCH="arm64"; MP_ARCH="arm64" ;;
  *) echo "Nem támogatott architektúra: $arch"; exit 1 ;;
esac

# --- binárisok -------------------------------------------------------------------------------
if [[ ! -x "$BIN/gotrue/auth" ]]; then
  echo "GoTrue $GOTRUE_VERSION letöltése…"
  mkdir -p "$BIN/gotrue"
  curl -fsSL "https://github.com/supabase/auth/releases/download/${GOTRUE_VERSION}/auth-${GOTRUE_VERSION}-${GT_ARCH}.tar.gz" \
    | tar xz -C "$BIN/gotrue"
fi
if [[ ! -x "$BIN/mailpit" ]]; then
  echo "Mailpit $MAILPIT_VERSION letöltése…"
  curl -fsSL "https://github.com/axllent/mailpit/releases/download/${MAILPIT_VERSION}/mailpit-linux-${MP_ARCH}.tar.gz" \
    | tar xz -C "$BIN" mailpit
fi

# --- Postgres --------------------------------------------------------------------------------
as_pg() {
  if [[ "$(id -u)" == "0" ]]; then runuser -u postgres -- "$@"; else "$@"; fi
}

if [[ -n "${LOCAL_PG_URL:-}" ]]; then
  PG_URL="$LOCAL_PG_URL"
  echo "Meglévő Postgres: $PG_URL"
else
  PGBIN="${PGBIN:-$(pg_config --bindir 2>/dev/null || true)}"
  if [[ -z "$PGBIN" || ! -x "$PGBIN/initdb" ]]; then
    PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
  fi
  [[ -x "$PGBIN/initdb" ]] || { echo "Nem találom a PostgreSQL szervert (initdb). Telepítsd: postgresql-16"; exit 1; }

  if [[ ! -f "$PGDATA/PG_VERSION" ]]; then
    echo "Postgres-fürt létrehozása: $PGDATA"
    mkdir -p "$PGDATA"
    [[ "$(id -u)" == "0" ]] && chown -R postgres:postgres "$PGDATA" "$LOGS"
    pwfile="$(mktemp)"; echo "postgres" > "$pwfile"; chmod 644 "$pwfile"
    as_pg "$PGBIN/initdb" -D "$PGDATA" -U postgres --pwfile="$pwfile" --auth-local=trust --auth-host=scram-sha-256 \
      --encoding=UTF8 --locale=C.UTF-8 > "$LOGS/initdb.log"
    rm -f "$pwfile"
  fi
  [[ "$(id -u)" == "0" ]] && chown postgres:postgres "$LOGS"
  if ! pg_isready -h 127.0.0.1 -p "$PG_PORT" -q; then
    echo "Postgres indítása (:$PG_PORT)…"
    as_pg "$PGBIN/pg_ctl" -D "$PGDATA" -l "$LOGS/postgres.log" -w \
      -o "-p $PG_PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp -c shared_buffers=256MB -c max_connections=200" start > /dev/null
  fi
  PG_URL="postgresql://postgres:postgres@127.0.0.1:${PG_PORT}/postgres"
fi

psql "$PG_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/scripts/local-stack/bootstrap.sql"

# --- Mailpit ---------------------------------------------------------------------------------
if ! curl -fs "http://127.0.0.1:${MAIL_WEB_PORT}/livez" > /dev/null 2>&1; then
  echo "Mailpit indítása (SMTP :$SMTP_PORT, web :$MAIL_WEB_PORT)…"
  nohup "$BIN/mailpit" --smtp "127.0.0.1:${SMTP_PORT}" --listen "127.0.0.1:${MAIL_WEB_PORT}" \
    --smtp-auth-accept-any --smtp-auth-allow-insecure > "$LOGS/mailpit.log" 2>&1 &
  echo $! > "$RUN/mailpit.pid"
fi

# --- GoTrue ----------------------------------------------------------------------------------
export GOTRUE_API_HOST=127.0.0.1
export PORT="$AUTH_PORT"
export API_EXTERNAL_URL="http://127.0.0.1:${API_PORT}/auth/v1"
export GOTRUE_DB_DRIVER=postgres
export DATABASE_URL="${PG_URL}?search_path=auth"
export GOTRUE_DB_NAMESPACE=auth
export GOTRUE_SITE_URL="$SITE_URL"
export GOTRUE_URI_ALLOW_LIST="http://localhost:3000/**,http://localhost:3100/**,http://127.0.0.1:3000/**,http://127.0.0.1:3100/**"
export GOTRUE_JWT_SECRET="$JWT_SECRET"
export GOTRUE_JWT_EXP=3600
export GOTRUE_JWT_AUD=authenticated
export GOTRUE_JWT_ADMIN_ROLES=service_role
export GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
export GOTRUE_DISABLE_SIGNUP=false
export GOTRUE_EXTERNAL_EMAIL_ENABLED=true
export GOTRUE_MAILER_AUTOCONFIRM=false
export GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED=true
export GOTRUE_MAILER_OTP_EXP=3600
export GOTRUE_SMTP_HOST=127.0.0.1
export GOTRUE_SMTP_PORT="$SMTP_PORT"
export GOTRUE_SMTP_USER=local
export GOTRUE_SMTP_PASS=local
export GOTRUE_SMTP_ADMIN_EMAIL="hello@jovetel.local"
export GOTRUE_SMTP_SENDER_NAME="JóVétel"
export GOTRUE_MAILER_URLPATHS_INVITE=/auth/v1/verify
export GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify
export GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify
export GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify
export GOTRUE_MAILER_SUBJECTS_MAGIC_LINK="Belépési link a JóVételhez"
export GOTRUE_MAILER_SUBJECTS_CONFIRMATION="Erősítsd meg a JóVétel-fiókodat"
if [[ -f "$ROOT/supabase/templates/magic-link.html" ]]; then
  export GOTRUE_MAILER_TEMPLATES_MAGIC_LINK="http://127.0.0.1:${API_PORT}/templates/magic-link.html"
  export GOTRUE_MAILER_TEMPLATES_CONFIRMATION="http://127.0.0.1:${API_PORT}/templates/magic-link.html"
fi
export GOTRUE_RATE_LIMIT_EMAIL_SENT="${GOTRUE_RATE_LIMIT_EMAIL_SENT:-1000}"
export GOTRUE_RATE_LIMIT_OTP="${GOTRUE_RATE_LIMIT_OTP:-1000}"
export GOTRUE_RATE_LIMIT_VERIFY="${GOTRUE_RATE_LIMIT_VERIFY:-1000}"
export GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED=true
export GOTRUE_MFA_TOTP_ENROLL_ENABLED=true
export GOTRUE_MFA_TOTP_VERIFY_ENABLED=true
export GOTRUE_MFA_MAX_ENROLLED_FACTORS=10
export GOTRUE_LOG_LEVEL=warn
export GOTRUE_EXTERNAL_GOOGLE_ENABLED=false

if ! curl -fs "http://127.0.0.1:${AUTH_PORT}/health" > /dev/null 2>&1; then
  echo "GoTrue migrációk és indítás (:$AUTH_PORT)…"
  "$BIN/gotrue/auth" migrate > "$LOGS/gotrue-migrate.log" 2>&1 || { cat "$LOGS/gotrue-migrate.log"; exit 1; }
  nohup "$BIN/gotrue/auth" serve > "$LOGS/gotrue.log" 2>&1 &
  echo $! > "$RUN/gotrue.pid"
fi

# --- átjáró (/auth/v1 → GoTrue) --------------------------------------------------------------
if ! curl -fs "http://127.0.0.1:${API_PORT}/health" > /dev/null 2>&1; then
  GATEWAY_PORT="$API_PORT" GOTRUE_URL="http://127.0.0.1:${AUTH_PORT}" TEMPLATES_DIR="$ROOT/supabase/templates" \
    nohup node "$ROOT/scripts/local-stack/gateway.mjs" > "$LOGS/gateway.log" 2>&1 &
  echo $! > "$RUN/gateway.pid"
fi

for i in $(seq 1 40); do
  if curl -fs "http://127.0.0.1:${API_PORT}/auth/v1/health" > /dev/null 2>&1; then break; fi
  sleep 0.5
done
curl -fs "http://127.0.0.1:${API_PORT}/auth/v1/health" > /dev/null || { echo "A GoTrue nem indult el:"; tail -20 "$LOGS/gotrue.log"; exit 1; }

# --- környezeti változók a helyi stackhez ----------------------------------------------------
eval "$(node "$ROOT/scripts/local-stack/keys.mjs" | sed 's/^/export /')"
cat > "$LOCAL/stack.env" <<ENV
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${API_PORT}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_JWT_SECRET=${JWT_SECRET}
DATABASE_URL=${PG_URL}
DIRECT_DATABASE_URL=${PG_URL}
MAILPIT_URL=http://127.0.0.1:${MAIL_WEB_PORT}
SMTP_URL=smtp://127.0.0.1:${SMTP_PORT}
ENV

echo ""
echo "Helyi stack fut:"
echo "  Postgres   ${PG_URL}"
echo "  Auth       http://127.0.0.1:${API_PORT}/auth/v1"
echo "  Levelek    http://127.0.0.1:${MAIL_WEB_PORT}"
echo "  Változók   .local/stack.env  (pnpm dev:local ezekkel indul)"
