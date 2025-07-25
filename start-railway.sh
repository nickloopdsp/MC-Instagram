#!/bin/bash

# Start the server with Railway PostgreSQL database
echo "🚂 Starting server with Railway database..."
echo "📍 Database: Railway PostgreSQL"
echo "🔗 Port: 5002"
echo ""

export DATABASE_URL="postgresql://postgres:TKTvDaCCMMQqvUBmMUCxqFakuHMOqJxa@shortline.proxy.rlwy.net:59822/railway"
export PORT=5002

npm run dev 