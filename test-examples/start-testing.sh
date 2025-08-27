#!/bin/bash

echo "🚀 Starting Triostack Audit SDK Test Environment"
echo "================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run quick test first
echo "🧪 Running quick test..."
node quick-test.js

echo ""
echo "🎯 Starting test servers..."
echo "📊 Mock Audit Server: http://localhost:3002"
echo "🚀 Test Server: http://localhost:3001"
echo "🌐 Web Interface: file://$(pwd)/client-test.html"
echo ""
echo "💡 Press Ctrl+C to stop all servers"
echo ""

# Start both servers using concurrently
npm run dev
