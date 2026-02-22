#!/bin/bash
set -e
echo "🛑 Stopping InvoiceDoc2 services..."
docker-compose down
echo "✅ Services stopped!"
