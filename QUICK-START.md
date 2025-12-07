# 🎯 Quick Start Guide - ClearComply Services

## 🚀 Simplest Way to Start/Stop Services

### Start Everything
```bash
cd "/Users/talam-m1max/WebProjects/Clear Comply"
./services.sh start
```

### Stop Everything  
```bash
./services.sh stop
```

### Check Status
```bash
./services.sh status
```

---

## 📋 Complete Command Reference

| Command | What It Does |
|---------|-------------|
| `./services.sh start` | Starts both backend + frontend |
| `./services.sh stop` | Stops all services |
| `./services.sh status` | Shows what's running |
| `./services.sh restart` | Restarts everything |
| `./services.sh start-backend` | Starts only backend |
| `./services.sh start-frontend` | Starts only frontend |

---

## 🌐 Service URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000  
- **API Documentation:** http://localhost:8000/docs

---

## 🔧 Alternative Methods

### Using Dev Script (More Options)
```bash
./dev.sh local          # Start both services
./dev.sh backend        # Backend only
./dev.sh frontend       # Frontend only
./dev.sh docker-dev     # Start with Docker
./dev.sh help           # See all options
```

### Manual Commands
```bash
# Backend only
cd Service && source ../.venv/bin/activate && python main.py

# Frontend only  
cd UI && npm run dev
```

---

## 🛠️ Emergency Stop
```bash
# Kill all processes
lsof -ti:8000 | xargs kill -9  # Stop backend
lsof -ti:5173 | xargs kill -9  # Stop frontend
```

---

## 💡 Quick Tips

1. **Always start from project root directory**
2. **Use `./services.sh start` for daily development** 
3. **Check status with `./services.sh status`**
4. **Emergency stop: `./services.sh stop`**
5. **Need help: `./services.sh help`**

---

## ✅ Success Indicators

**Backend Running:**
- Terminal shows: "Uvicorn running on http://127.0.0.1:8000"
- `curl http://localhost:8000/health` returns `{"status": "healthy"}`

**Frontend Running:**
- Terminal shows: "Local: http://localhost:5173/"
- Browser loads ClearComply interface at http://localhost:5173
