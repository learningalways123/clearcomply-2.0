# Clear Comply

A full-stack web application built with FastAPI (Python) backend and React (TypeScript) frontend.

## 🏗️ Project Structure

```
Clear Comply/
├── Service/              # FastAPI Backend
│   ├── app/             # Application modules
│   ├── main.py          # FastAPI application entry point
│   ├── requirements.txt # Python dependencies
│   ├── .env            # Environment variables
│   ├── Dockerfile      # Backend Docker configuration
│   └── .gitignore      # Backend gitignore
├── UI/                  # React Frontend
│   ├── src/            # Source code
│   ├── public/         # Static assets
│   ├── package.json    # Node.js dependencies
│   ├── .env           # Frontend environment variables
│   ├── Dockerfile     # Frontend Docker configuration
│   └── nginx.conf     # Nginx configuration
├── docker-compose.yml      # Production Docker Compose
├── docker-compose.dev.yml  # Development Docker Compose
├── dev.sh                  # Development scripts
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Docker (optional, for containerized deployment)

### Local Development

1. **Clone and navigate to the project:**
   ```bash
   cd "/Users/talam-m1max/WebProjects/Clear Comply"
   ```

2. **Start both services:**
   ```bash
   ./dev.sh local
   ```
   This will start:
   - Backend at: http://localhost:8000
   - Frontend at: http://localhost:5173
   - API Documentation at: http://localhost:8000/api/docs

### Individual Services

**Start only the backend:**
```bash
./dev.sh backend
```

**Start only the frontend:**
```bash
./dev.sh frontend
```

### Docker Development

**Start with Docker Compose (development mode):**
```bash
./dev.sh docker-dev
```

**Start with Docker Compose (production mode):**
```bash
./dev.sh docker-prod
```

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `./dev.sh local` | Start both services locally |
| `./dev.sh backend` | Start only FastAPI backend |
| `./dev.sh frontend` | Start only React frontend |
| `./dev.sh docker-dev` | Start with Docker (development mode) |
| `./dev.sh docker-prod` | Start with Docker (production mode) |
| `./dev.sh stop` | Stop Docker services |
| `./dev.sh clean` | Clean up Docker resources |
| `./dev.sh test` | Run tests for both services |
| `./dev.sh help` | Show help message |

## 🔧 API Endpoints

### Backend (FastAPI)

- **Health Check:** `GET /health`
- **API Status:** `GET /api/status`
- **Message Processing:** `POST /api/message`
- **API Documentation:** `GET /api/docs` (Swagger UI)
- **ReDoc Documentation:** `GET /api/redoc`

### Example API Usage

```bash
# Check health
curl http://localhost:8000/health

# Send a message
curl -X POST http://localhost:8000/api/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, API!"}'
```

## 🛠️ Development

### Backend Development

The FastAPI backend is located in the `Service/` directory:

- **Add dependencies:** Update `Service/requirements.txt`
- **Environment variables:** Configure in `Service/.env`
- **Main application:** Edit `Service/main.py`
- **Additional modules:** Add to `Service/app/`

### Frontend Development

The React frontend is located in the `UI/` directory:

- **Add dependencies:** `cd UI && npm install <package>`
- **Environment variables:** Configure in `UI/.env`
- **Main component:** Edit `UI/src/App.tsx`
- **Styling:** Edit `UI/src/App.css`

### Environment Variables

**Backend (Service/.env):**
```
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000
RELOAD=True
```

**Frontend (UI/.env):**
```
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_TITLE=Clear Comply
VITE_APP_VERSION=1.0.0
```

## 🐳 Docker Deployment

### Development Mode
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Production Mode
```bash
docker-compose up --build
```

### Environment-specific Configuration

- **Development:** Hot reloading enabled, source code mounted
- **Production:** Optimized builds, nginx serving frontend

## 🧪 Testing

Run tests for both services:
```bash
./dev.sh test
```

Or test individually:
```bash
# Backend tests
cd Service
python -m pytest

# Frontend tests
cd UI
npm test
```

## 📝 Development Notes

### CORS Configuration
The backend is configured to allow requests from:
- `http://localhost:3000` (React development server)
- `http://localhost:5173` (Vite development server)

### Hot Reloading
- **Backend:** Uvicorn auto-reloads on file changes in development
- **Frontend:** Vite provides fast hot module replacement (HMR)

### API Documentation
FastAPI automatically generates interactive API documentation:
- **Swagger UI:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts:** Ensure ports 8000, 5173, and 3000 are available
2. **Python environment:** Make sure virtual environment is activated
3. **Node modules:** Delete `UI/node_modules` and run `npm install` if issues persist
4. **Docker:** Ensure Docker is running before using docker commands

### Logs

**View Docker logs:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

**Follow logs in real-time:**
```bash
docker-compose logs -f
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔮 Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Authentication and authorization
- [ ] API rate limiting
- [ ] Monitoring and logging
- [ ] CI/CD pipeline
- [ ] Cloud deployment configuration
- [ ] Unit and integration tests
- [ ] Error tracking and monitoring
