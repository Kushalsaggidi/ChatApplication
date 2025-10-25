#!/bin/bash

# MERN Chat App Deployment Script

echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🏗️ Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy backend to Render with these environment variables:"
echo "   - PORT=5000"
echo "   - MONGO_URI=your_mongodb_connection_string"
echo "   - JWT_SECRET=your_jwt_secret"
echo "   - NODE_ENV=production"
echo ""
echo "2. Deploy frontend to Vercel with:"
echo "   - REACT_APP_API_URL=https://your-backend-url.onrender.com"
echo ""
echo "3. Update CORS settings in backend/server.js with your Vercel URL"
echo ""
echo "🎉 Deployment ready!"
