# 🚀 ClearComply Service Management Guide

This guide provides clear, step-by-step instructions for starting and stopping the frontend and backend services in different ways.

## 📋 Quick Reference

| Command | Purpose |
|---------|---------|
| `./dev.sh local` | Start both services locally |
| `./dev.sh backend` | Start only backend |
| `./dev.sh frontend` | Start only frontend |
| `./dev.sh docker-dev` | Start with Docker (development) |
| `./dev.sh stop` | Stop Docker services |

---

## 🎯 Method 1: Local Development (Recommended)

### Start Both Services Together

```bash
# Navigate to project root
cd "/Users/talam-m1max/WebProjects/Clear Comply"

# Start both services (backend + frontend)
./dev.sh local
```

**What happens:**
- ✅ Backend starts at: http://localhost:8000
- ✅ Frontend starts at: http://localhost:5173
- ✅ Auto-installs dependencies if needed
- ✅ Both services run simultaneously

**To stop:** Press `Ctrl+C` once (stops both services)

---

## 🔧 Method 2: Start Services Separately

### Start Backend Only

```bash
# Navigate to project root
cd "/Users/talam-m1max/WebProjects/Clear Comply"

# Start FastAPI backend
./dev.sh backend
```

**Backend will be available at:** http://localhost:8000

**To stop backend:**
- Press `Ctrl+C` in the terminal, OR
- Run: `lsof -ti:8000 | xargs kill -9`

### Start Frontend Only

```bash
# Navigate to project root
cd "/Users/talam-m1max/WebProjects/Clear Comply"

# Start React frontend (in a new terminal)
./dev.sh frontend
```

**Frontend will be available at:** http://localhost:5173

**To stop frontend:**
- Press `Ctrl+C` in the terminal, OR  
- Run: `lsof -ti:5173 | xargs kill -9`

---

## 🐳 Method 3: Docker Development

### Start with Docker

```bash
# Navigate to project root
cd "/Users/talam-m1max/WebProjects/Clear Comply"

# Start both services in Docker containers
./dev.sh docker-dev
```

**Services will be available at:**
- Backend: http://localhost:8000
- Frontend: http://localhost:5173

### Stop Docker Services

```bash
./dev.sh stop
```

### Clean Up Docker Resources

```bash
./dev.sh clean
```

---

## 🛠️ Manual Service Management

### Manual Backend Start/Stop

**Start:**
```bash
cd "/Users/talam-m1max/WebProjects/Clear Comply/Service"
source ../.venv/bin/activate  # Activate Python virtual environment
python main.py
```

**Stop:**
```bash
# Method 1: Ctrl+C in the terminal
# Method 2: Kill by port
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "No backend process found"
# Method 3: Kill by process name
pkill -f "uvicorn" 2>/dev/null || echo "No uvicorn process found"
```

### Manual Frontend Start/Stop

**Start:**
```bash
cd "/Users/talam-m1max/WebProjects/Clear Comply/UI"
npm run dev
```

**Stop:**
```bash
# Method 1: Ctrl+C in the terminal  
# Method 2: Kill by port
lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "No frontend process found"
```

---

## 🔍 Health Checks & Troubleshooting

### Check If Services Are Running

**Backend Health Check:**
```bash
curl http://localhost:8000/health
```
✅ **Expected response:** `{"status": "healthy"}`

**Frontend Health Check:**
```bash
curl -s http://localhost:5173 | grep -q "ClearComply" && echo "Frontend is running" || echo "Frontend not accessible"
```

**Check Running Processes:**
```bash
# Check backend
ps aux | grep uvicorn

# Check frontend  
ps aux | grep node

# Check what's using the ports
lsof -i :8000  # Backend port
lsof -i :5173  # Frontend port
```

---

## 🚨 Emergency Stop All Services

**Kill everything:**
```bash
# Stop all processes on the ports
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "No backend processes"
lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "No frontend processes"

# Stop Docker containers (if using Docker)
docker-compose down
docker-compose -f docker-compose.dev.yml down
```

---

## 📱 Service URLs Reference

| Service | Local URL | Purpose |
|---------|-----------|---------|
| **Backend API** | http://localhost:8000 | FastAPI server |
| **API Docs** | http://localhost:8000/docs | Interactive API documentation |
| **Health Check** | http://localhost:8000/health | Service health status |
| **Frontend** | http://localhost:5173 | React application |

---

## 🎯 Common Usage Patterns

### For Development
```bash
# Start everything for development
./dev.sh local

# Open in browser
open http://localhost:5173
```

### For Testing API Only
```bash
# Start backend only
./dev.sh backend

# Test API endpoints
open http://localhost:8000/docs
```

### For Frontend Development Only
```bash
# Ensure backend is running first
./dev.sh backend

# In new terminal, start frontend
./dev.sh frontend
```

---

## 💡 Pro Tips

1. **Always start backend first** when running services separately
2. **Use `./dev.sh local`** for normal development (easiest option)
3. **Check ports** if services fail to start (might be already in use)
4. **Virtual environment** is automatically managed by the scripts
5. **Dependencies** are auto-installed when missing
6. **Use Docker** for consistent environment across different machines

---

## 🆘 Need Help?

Run the help command:
```bash
./dev.sh help
```

Or check if everything is working:
```bash
./dev.sh test
```
