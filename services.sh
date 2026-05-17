#!/bin/bash

# ClearComply - Quick Service Control Script
# This provides the simplest commands to start/stop services

# Note: intentionally no 'set -e' — individual commands are allowed to fail
#       gracefully (e.g. nothing to kill, Docker container already stopped).

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/Users/talam-m1max/WebProjects/Clear Comply"
DB_URL="postgresql://clearcomply:clearcomply_dev@127.0.0.1:5433/clearcomply"
PG_COMPOSE="$PROJECT_DIR/docker-compose.dev.yml"

# Use the OrbStack Docker context (matches the active context on this machine)
export DOCKER_CONTEXT=orbstack

print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# Wake the Docker daemon (OrbStack suspends its VM on idle)
wake_docker() {
    if docker info >/dev/null 2>&1; then
        return 0
    fi
    echo "  🔁 Docker not responding — launching OrbStack VM..."
    open -a OrbStack 2>/dev/null || true
    local retries=60
    while ! docker info >/dev/null 2>&1; do
        retries=$((retries - 1))
        if [[ $retries -le 0 ]]; then
            print_error "Docker daemon did not start in time. Open OrbStack manually and retry."
            exit 1
        fi
        sleep 1
    done
    print_status "Docker is ready"
}

# Wait until Postgres is accepting connections (max 30 s)
wait_for_postgres() {
    local retries=30
    echo "  ⏳ Waiting for Postgres on port 5433..."
    while ! psql "$DB_URL" -c "SELECT 1" >/dev/null 2>&1; do
        retries=$((retries - 1))
        if [[ $retries -le 0 ]]; then
            print_error "Postgres did not become ready in time."
            docker logs clearcomply-db 2>/dev/null | tail -20
            exit 1
        fi
        sleep 1
    done
    print_status "Postgres is ready"
}

case "$1" in
    "start")
        echo "🚀 Starting ClearComply Services..."

        # ── 1. Start Postgres Docker container ──────────────────────────────
        echo "  🐘 Starting Postgres (Docker)..."
        wake_docker
        # Prefer `docker start` (fast, no image pull) — fall back to compose if
        # the container doesn't exist yet (first run).
        if docker ps -a --format '{{.Names}}' | grep -q '^clearcomply-db$'; then
            docker start clearcomply-db >/dev/null 2>&1 || true
        else
            docker compose -f "$PG_COMPOSE" up -d db 2>&1 | grep -v 'the attribute' || true
        fi
        wait_for_postgres

        # ── 2. Run Alembic migrations ────────────────────────────────────────
        echo "  🔄 Running database migrations..."
        source "$PROJECT_DIR/.venv/bin/activate" 2>/dev/null || true
        (cd "$PROJECT_DIR/Service" && DATABASE_URL="$DB_URL" alembic upgrade head 2>&1 | tail -5) || \
            print_warning "Migration step encountered an issue — check manually"
        print_status "Migrations up to date"

        # ── 3. Kill any stale ClearComply processes (not Docker port-forwarders) ───
        pkill -f "python main.py" 2>/dev/null; true
        pkill -f "vite" 2>/dev/null; true
        sleep 1

        # Install any missing backend deps silently
        pip install -r "$PROJECT_DIR/Service/requirements.txt" -q 2>/dev/null || true

        # ── 4. Start backend with Postgres DATABASE_URL ──────────────────────
        nohup bash -c "source '$PROJECT_DIR/.venv/bin/activate' && export DATABASE_URL='$DB_URL' && cd '$PROJECT_DIR/Service' && python main.py" > /tmp/clearcomply-backend.log 2>&1 &
        disown $!

        # ── 5. Start frontend ────────────────────────────────────────────────
        nohup bash -c "cd '$PROJECT_DIR/UI' && npm run dev" > /tmp/clearcomply-frontend.log 2>&1 &
        disown $!

        # ── 6. Verify ────────────────────────────────────────────────────────
        sleep 5
        if lsof -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
            print_status "Backend running at http://localhost:8000"
        else
            print_error "Backend failed to start. Check /tmp/clearcomply-backend.log"
            cat /tmp/clearcomply-backend.log
        fi

        if lsof -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
            print_status "Frontend running at http://localhost:3000"
        else
            print_error "Frontend failed to start. Check /tmp/clearcomply-frontend.log"
            cat /tmp/clearcomply-frontend.log
        fi
        ;;
    "start-backend")
        echo "🔧 Starting Backend Only..."
        cd "$PROJECT_DIR"
        ./dev.sh backend
        ;;
    "start-frontend")
        echo "🎨 Starting Frontend Only..."
        cd "$PROJECT_DIR"
        ./dev.sh frontend
        ;;
    "stop")
        echo "🛑 Stopping All Services..."
        
        # Kill only ClearComply processes (not Docker port-forwarders on the same ports)
        pkill -f "python main.py" 2>/dev/null && print_status "Backend stopped" || print_warning "No backend process found"
        pkill -f "vite" 2>/dev/null && print_status "Frontend stopped" || print_warning "No frontend process found"
        
        # Stop Postgres Docker container (leave the container; just pause it)
        docker stop clearcomply-db >/dev/null 2>&1 && print_status "Postgres container stopped" || print_warning "Postgres container not running"
        
        print_status "All services stopped"
        ;;
    "status")
        echo "📊 Checking Service Status..."
        echo ""
        
        # Check Postgres
        if psql "$DB_URL" -c "SELECT 1" >/dev/null 2>&1; then
            print_status "Postgres: Running at 127.0.0.1:5433"
        else
            print_error "Postgres: Not running (start with: $0 start)"
        fi

        # Check backend
        if curl -s http://localhost:8000/health >/dev/null 2>&1; then
            print_status "Backend: Running at http://localhost:8000"
        else
            print_error "Backend: Not running"
        fi
        
        # Check frontend
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            print_status "Frontend: Running at http://localhost:3000"
        else
            print_error "Frontend: Not running"
        fi
        
        echo ""
        echo "Process Information:"
        echo "Backend processes:"
        ps aux | grep "uvicorn\|python main" | grep -v grep || echo "  None"
        echo "Frontend processes:"  
        ps aux | grep "vite\|node.*dev" | grep -v grep || echo "  None"
        ;;
    "restart")
        echo "🔄 Restarting All Services..."
        $0 stop
        sleep 2
        $0 start
        ;;
    "logs")
        echo "📋 Service Information:"
        echo ""
        echo "Backend URL:  http://localhost:8000"
        echo "Frontend URL: http://localhost:3000"
        echo "API Docs:     http://localhost:8000/api/docs"
        echo "Postgres:     127.0.0.1:5433  (user: clearcomply)"
        echo ""
        echo "Live backend log:  tail -f /tmp/clearcomply-backend.log"
        echo "Live frontend log: tail -f /tmp/clearcomply-frontend.log"
        ;;
    "db-migrate")
        echo "🔄 Running Alembic migrations against Postgres..."
        source "$PROJECT_DIR/.venv/bin/activate" 2>/dev/null || true
        cd "$PROJECT_DIR/Service" && DATABASE_URL="$DB_URL" alembic upgrade head
        print_status "Migrations complete"
        ;;
    "db-shell")
        echo "🐘 Opening Postgres shell..."
        psql "$DB_URL"
        ;;
    "help"|"")
        echo "🚀 ClearComply Service Control"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start           Start both frontend and backend"
        echo "  start-backend   Start only backend"
        echo "  start-frontend  Start only frontend"
        echo "  stop            Stop all services"
        echo "  restart         Restart all services"
        echo "  status          Check if services are running"
        echo "  logs            Show service URLs and log info"
        echo "  help            Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start        # Start everything"
        echo "  $0 stop         # Stop everything"
        echo "  $0 status       # Check what's running"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' to see available commands"
        exit 1
        ;;
esac
