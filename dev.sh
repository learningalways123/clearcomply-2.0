#!/bin/bash

# Clear Comply Development Scripts
# This script provides convenient commands to run the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Function to start backend only (local development)
start_backend() {
    print_status "Starting FastAPI backend..."
    cd Service
    
    if [ ! -d "../.venv" ]; then
        print_warning "Python virtual environment not found. Creating one..."
        python3 -m venv ../.venv
        source ../.venv/bin/activate
        pip install -r requirements.txt
    else
        source ../.venv/bin/activate
    fi
    
    python main.py
}

# Function to start frontend only (local development)
start_frontend() {
    print_status "Starting React frontend..."
    cd UI
    
    if [ ! -d "node_modules" ]; then
        print_warning "Node modules not found. Installing..."
        npm install
    fi
    
    npm run dev
}

# Function to start both services locally
start_local() {
    print_status "Starting both services locally..."
    
    # Start backend in background
    print_status "Starting backend..."
    cd Service
    if [ ! -d "../.venv" ]; then
        python3 -m venv ../.venv
        source ../.venv/bin/activate
        pip install -r requirements.txt
    else
        source ../.venv/bin/activate
    fi
    
    python main.py &
    BACKEND_PID=$!
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    print_status "Starting frontend..."
    cd ../UI
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    npm run dev &
    FRONTEND_PID=$!
    
    print_status "Both services started!"
    print_status "Backend: http://localhost:8000"
    print_status "Frontend: http://localhost:5173"
    print_status "Press Ctrl+C to stop both services"
    
    # Wait for interrupt signal
    trap 'print_status "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT
    wait
}

# Function to start with Docker Compose (development mode)
start_docker_dev() {
    check_docker
    print_status "Starting application with Docker Compose (development mode)..."
    docker-compose -f docker-compose.dev.yml up --build
}

# Function to start with Docker Compose (production mode)
start_docker_prod() {
    check_docker
    print_status "Starting application with Docker Compose (production mode)..."
    docker-compose up --build
}

# Function to stop Docker services
stop_docker() {
    check_docker
    print_status "Stopping Docker services..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
}

# Function to clean up Docker resources
clean_docker() {
    check_docker
    print_status "Cleaning up Docker resources..."
    docker-compose down -v --rmi all
    docker-compose -f docker-compose.dev.yml down -v --rmi all
    docker system prune -f
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Backend tests
    print_status "Running backend tests..."
    cd Service
    if [ ! -d "../.venv" ]; then
        python3 -m venv ../.venv
        source ../.venv/bin/activate
        pip install -r requirements.txt
    else
        source ../.venv/bin/activate
    fi
    
    python -m pytest --verbose
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd ../UI
    npm test
}

# Function to show help
show_help() {
    echo "Clear Comply Development Scripts"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  backend         Start only the FastAPI backend locally"
    echo "  frontend        Start only the React frontend locally"
    echo "  local           Start both services locally"
    echo "  docker-dev      Start with Docker Compose (development mode)"
    echo "  docker-prod     Start with Docker Compose (production mode)"
    echo "  stop            Stop Docker services"
    echo "  clean           Clean up Docker resources"
    echo "  test            Run tests for both services"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh local          # Start both services locally"
    echo "  ./dev.sh docker-dev     # Start with Docker (dev mode)"
    echo "  ./dev.sh backend        # Start only backend"
}

# Main script logic
case "$1" in
    "backend")
        start_backend
        ;;
    "frontend")
        start_frontend
        ;;
    "local")
        start_local
        ;;
    "docker-dev")
        start_docker_dev
        ;;
    "docker-prod")
        start_docker_prod
        ;;
    "stop")
        stop_docker
        ;;
    "clean")
        clean_docker
        ;;
    "test")
        run_tests
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        print_warning "No command specified. Use './dev.sh help' to see available commands."
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
