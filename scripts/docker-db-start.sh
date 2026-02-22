#!/bin/bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
COMPOSE_DB="database/compose.yaml"
SVC="pgdatabase"

echo "🚀 Starting InvoiceDoc2 Database..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

if lsof -Pi :15432 -sTCP:LISTEN -t >/dev/null 2>&1; then
    EXISTING=$(docker ps --filter "publish=15432" --format "{{.Names}}" | head -1)
    if [ -n "$EXISTING" ]; then
        echo "⚠️  Port 15432 in use by $EXISTING. Stopping it..."
        docker stop "$EXISTING" 2>/dev/null || true
        sleep 2
    else
        echo "❌ Port 15432 in use. Free it or run: lsof -i :15432"
        exit 1
    fi
fi

echo "📦 Starting database container..."
docker-compose -f "$COMPOSE_DB" up -d "$SVC"
echo "⏳ Waiting for database..."
sleep 5
for i in {1..30}; do
    if docker-compose -f "$COMPOSE_DB" exec -T "$SVC" pg_isready -U root > /dev/null 2>&1; then
        echo "✅ Database is ready!"
        break
    fi
    [ $i -eq 30 ] && echo "⚠️  Database slow to start" || sleep 1
done

echo ""
echo "🔧 Setting up schema..."
[ -f "database/setup_db.sh" ] && ( cd database && ./setup_db.sh ) || echo "⚠️  Run manually: cd database && ./setup_db.sh"
echo ""
echo "✅ Database started. Host: localhost:15432 | DB: invoices_db | User: root"
