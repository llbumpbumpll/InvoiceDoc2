#!/bin/bash
set -e
echo "🚀 Starting InvoiceDoc2 services..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi
echo "📦 Building and starting containers..."
docker compose up -d --build
echo "⏳ Waiting for services to be ready..."
sleep 5
echo ""
echo "📊 Service Status:"
docker compose ps
echo ""
echo "✅ Services started!"
echo "📍 Access: Client http://localhost:3000 | Server http://localhost:4000 | Adminer http://localhost:8080"
