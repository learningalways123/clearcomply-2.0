#!/bin/bash

# ClearComply - Quick Service Control Script
# This provides the simplest commands to start/stop services

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/Users/talam-m1max/WebProjects/Clear Comply"

print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

case "$1" in
    "start")
        echo "🚀 Starting ClearComply Services..."

        # Kill any existing processes on these ports
        lsof -ti:8000 | xargs kill -9 2>/dev/null; true
        lsof -ti:5173 | xargs kill -9 2>/dev/null; true
        sleep 1

        # Activate venv
        source "$PROJECT_DIR/.venv/bin/activate" 2>/dev/null || true

        # Install any missing backend deps silently
        pip install -r "$PROJECT_DIR/Service/requirements.txt" -q 2>/dev/null || true

        # Start backend — disown so it survives terminal/session changes
        nohup bash -c "source '$PROJECT_DIR/.venv/bin/activate' && cd '$PROJECT_DIR/Service' && python main.py" > /tmp/clearcomply-backend.log 2>&1 &
        disown $!

        # Start frontend — disown so it survives terminal/session changes
        nohup bash -c "cd '$PROJECT_DIR/UI' && npm run dev" > /tmp/clearcomply-frontend.log 2>&1 &
        disown $!

        # Wait and verify
        sleep 5
        if lsof -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
            print_status "Backend running at http://localhost:8000"
        else
            print_error "Backend failed to start. Check /tmp/clearcomply-backend.log"
            cat /tmp/clearcomply-backend.log
        fi

        if lsof -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
            print_status "Frontend running at http://localhost:5173"
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
        
        # Kill processes by port
        lsof -ti:8000 | xargs kill -9 2>/dev/null && print_status "Backend stopped" || print_warning "No backend process found"
        lsof -ti:5173 | xargs kill -9 2>/dev/null && print_status "Frontend stopped" || print_warning "No frontend process found"
        
        # Stop Docker containers if running
        cd "$PROJECT_DIR"
        docker-compose down 2>/dev/null && print_status "Docker containers stopped" || print_warning "No Docker containers running"
        
        print_status "All services stopped"
        ;;
    "status")
        echo "📊 Checking Service Status..."
        echo ""
        
        # Check backend
        if curl -s http://localhost:8000/health >/dev/null 2>&1; then
            print_status "Backend: Running at http://localhost:8000"
        else
            print_error "Backend: Not running"
        fi
        
        # Check frontend
        if curl -s http://localhost:5173 >/dev/null 2>&1; then
            print_status "Frontend: Running at http://localhost:5173"
        else
            print_error "Frontend: Not running"
        fi
        
        echo ""
        echo "Process Information:"
        echo "Backend processes:"
        ps aux | grep uvicorn | grep -v grep || echo "  None"
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
        echo "Backend URL: http://localhost:8000"
        echo "Frontend URL: http://localhost:5173"
        echo "API Docs: http://localhost:8000/docs"
        echo ""
        echo "To view logs, check the terminal where services are running"
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
