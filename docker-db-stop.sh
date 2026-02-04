#!/bin/bash

# Docker Compose stop script for InvoiceDoc2 Database Only

set -e

echo "🛑 Stopping InvoiceDoc2 Database services..."

docker-compose -f docker-compose.db.yml down

echo "✅ Database services stopped!"
