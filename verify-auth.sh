#!/bin/bash
# Quick verification script for Google OAuth setup

echo "🔍 Checking Clear Comply Authentication Setup..."
echo ""

# Check if backend is running
if lsof -ti:8000 >/dev/null 2>&1; then
    echo "✅ Backend is running on port 8000"
else
    echo "❌ Backend is NOT running"
    echo "   Run: cd Service && python main.py"
fi

# Check if frontend is running
if lsof -ti:5173 >/dev/null 2>&1; then
    echo "✅ Frontend is running on port 5173"
else
    echo "❌ Frontend is NOT running"
    echo "   Run: cd UI && npm run dev"
fi

echo ""
echo "🔑 Checking environment configuration..."

# Check backend .env
if [ -f "Service/.env" ]; then
    echo "✅ Backend .env exists"
    if grep -q "GOOGLE_CLIENT_ID=440433810610" Service/.env; then
        echo "✅ Google Client ID configured in backend"
    else
        echo "⚠️  Google Client ID not found in backend .env"
    fi
    if grep -q "JWT_SECRET_KEY=" Service/.env; then
        echo "✅ JWT Secret Key configured"
    else
        echo "⚠️  JWT Secret Key not found in backend .env"
    fi
else
    echo "❌ Backend .env does NOT exist"
fi

# Check frontend .env.local
if [ -f "UI/.env.local" ]; then
    echo "✅ Frontend .env.local exists"
    if grep -q "VITE_GOOGLE_CLIENT_ID=440433810610" UI/.env.local; then
        echo "✅ Google Client ID configured in frontend"
    else
        echo "⚠️  Google Client ID not found in frontend .env.local"
    fi
else
    echo "❌ Frontend .env.local does NOT exist"
fi

echo ""
echo "🌐 Testing API endpoints..."

# Test health endpoint
if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ Backend API is responding"
else
    echo "⚠️  Backend API not responding (might still be starting up)"
fi

# Check if auth endpoints exist
if curl -s http://localhost:8000/openapi.json | grep -q "api/auth/google/login"; then
    echo "✅ Authentication endpoints registered"
else
    echo "❌ Authentication endpoints NOT found"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. You should see the login page"
echo "3. Click 'Sign in with Google'"
echo "4. Important: Update Google Cloud Console with these redirect URIs:"
echo "   - http://localhost:5173"
echo "   - http://localhost:3000"
echo ""
echo "📖 Full setup guide: GOOGLE_AUTH_SETUP.md"
echo "📊 Implementation status: AUTH_IMPLEMENTATION_STATUS.md"
