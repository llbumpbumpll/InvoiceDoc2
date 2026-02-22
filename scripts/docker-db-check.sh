#!/bin/bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
COMPOSE_DB="database/compose.yaml"
SVC="pgdatabase"

echo "🔍 Checking InvoiceDoc2 Database..."
CONTAINER=$(docker-compose -f "$COMPOSE_DB" ps -q "$SVC" 2>/dev/null)
if [ -z "$CONTAINER" ] || ! docker ps -q --no-trunc | grep -q "$CONTAINER"; then
    echo "❌ Database container is not running. Start it: npm run docker:db:start"
    exit 1
fi
CONTAINER_NAME=$(docker ps --filter "id=$CONTAINER" --format "{{.Names}}")
echo "✅ Container $CONTAINER_NAME is running"
echo ""
echo "📊 Tables:"
docker exec "$CONTAINER_NAME" psql -U root -d invoices_db -c "\dt" 2>&1 || true
echo ""
echo "📈 Counts:"
for t in customer product invoice invoice_line_item; do
    N=$(docker exec "$CONTAINER_NAME" psql -U root -d invoices_db -t -c "SELECT COUNT(*) FROM $t;" 2>/dev/null | tr -d ' ' || echo "0")
    echo "   $t: $N"
done
echo ""
echo "📍 localhost:15432 | invoices_db | root/root"
