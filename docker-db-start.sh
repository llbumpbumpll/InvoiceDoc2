#!/bin/bash

# Docker Compose startup script for InvoiceDoc2 Database Only (for local development)

set -e

echo "🚀 Starting InvoiceDoc2 Database services..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Start database services using db-specific compose file
echo "📦 Starting database container..."
docker-compose -f docker-compose.db.yml up -d

echo "⏳ Waiting for database to be ready..."
sleep 5

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.db.yml ps

echo ""
echo "✅ Database services started!"
echo ""
echo "📍 Access URLs:"
echo "   - Database:  localhost:15432"
echo "   - Adminer:   http://localhost:8080"
echo ""
echo "📝 Connection Details:"
echo "   - Host:     localhost"
echo "   - Port:     15432"
echo "   - Database: invoices_db"
echo "   - Username: root"
echo "   - Password: root"
echo ""
echo "📝 Useful commands:"
echo "   - View logs:    docker-compose -f docker-compose.db.yml logs -f"
echo "   - Stop:         docker-compose -f docker-compose.db.yml down"
echo "   - Restart:      docker-compose -f docker-compose.db.yml restart"
echo "   - Status:       docker-compose -f docker-compose.db.yml ps"
