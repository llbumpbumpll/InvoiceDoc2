#!/bin/bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
echo "🛑 Stopping InvoiceDoc2 Database..."
docker-compose -f database/compose.yaml down
echo "✅ Database stopped!"
