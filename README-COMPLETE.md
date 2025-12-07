# ClearComply - Compliance Assessment Platform

A full-stack web application for managing compliance assessments with NIST 800-53 framework support, built with FastAPI (Python) backend and React (TypeScript) frontend.

## 🚀 Features

### Assessment Management
- Create and manage compliance assessments
- Multi-framework support (NIST 800-53, SOC 2, ISO 27001)
- Control selection and coverage tracking
- Real-time progress monitoring

### Question Answering System
- Interactive question answering interface
- Support for multiple answer types (text, yes/no, multiple choice)
- Auto-save functionality with debouncing
- Family-based question organization (NIST 800-53)
- Real-time completion percentage tracking

### User Experience
- Modern Material UI design system
- Responsive layout for desktop and mobile
- Progress visualization with charts and indicators
- Comprehensive error handling and loading states

## 🏗️ Architecture

```
ClearComply/
├── Service/          # FastAPI backend
│   ├── app/
│   │   ├── models.py      # Pydantic data models
│   │   ├── routes.py      # API endpoints
│   │   ├── data_store.py  # In-memory data management
│   │   └── __init__.py
│   ├── data/             # Framework and question data
│   └── main.py          # Application entry point
├── UI/               # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API service layer
│   │   └── App.tsx      # Main application
│   └── package.json
└── dev.sh           # Development server script
```

## 📋 Prerequisites

- **Backend**: Python 3.8+
- **Frontend**: Node.js 20.19+ or 22.12+
- **Package Managers**: pip, npm/yarn

## 🛠️ Installation & Setup

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd ClearComply

# Make dev script executable
chmod +x dev.sh

# Start both backend and frontend
./dev.sh
```

### Manual Setup

#### Backend Setup
```bash
cd Service
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
cd UI
npm install
npm run dev
```

## 🌐 Application URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs
- **Alternative API Docs**: http://localhost:8000/api/redoc

## 📊 API Endpoints

### Core Endpoints
- `GET /api/frameworks` - List available compliance frameworks
- `GET /api/controls` - List framework controls
- `GET /api/families` - List NIST 800-53 families
- `GET /api/questions` - List questions with filtering

### Assessment Management
- `POST /api/assessments` - Create new assessment
- `GET /api/assessments` - List all assessments
- `GET /api/assessments/{id}` - Get specific assessment
- `GET /api/assessments/{id}/questions` - Get assessment questions with answers
- `POST /api/assessments/{id}/answers` - Submit/update question answers

### Health Check
- `GET /api/status` - Service health status

## 🎯 Usage Examples

### Creating an Assessment
```javascript
const assessment = await apiService.createAssessment({
  name: "Q4 2024 Security Assessment",
  frameworkIds: ["nist-800-53"],
  selectedControlIds: ["NIST-AC-1", "NIST-AC-2"],
  selectedQuestionIds: ["ac-001", "ac-002", "ir-001"]
});
```

### Submitting Answers
```javascript
const response = await apiService.submitAssessmentAnswers(assessmentId, {
  answers: [
    { questionId: "ac-001", value: "Yes" },
    { questionId: "ac-002", value: "Comprehensive procedures documented..." }
  ]
});
```

## 🧪 Testing

### Backend Testing
```bash
# Test API health
curl http://localhost:8000/health

# Run comprehensive API tests
./test-answers-api.sh
./test-nist-integration.sh
./test-ui-implementation.sh
```

### Frontend Testing
```bash
cd UI
npm run build  # Verify build succeeds
```

## 📁 Data Structure

### Frameworks
- SOC 2, NIST 800-53, ISO 27001 support
- Hierarchical control organization
- Criticality levels (Low, Medium, High)

### Questions
- 22 NIST 800-53 questions across 6 families
- Multiple answer types (text, yes_no, multiple_choice)
- Control mapping and traceability

### Assessments
- Framework and control selection
- Question answer tracking
- Real-time completion statistics

## 🔧 Configuration

### Environment Variables
```bash
# Backend
PYTHONPATH=.
DEBUG=True

# Frontend
VITE_API_BASE_URL=http://localhost:8000/api
```

### CORS Configuration
The backend is configured to allow requests from:
- http://localhost:3000 (React default)
- http://localhost:5173 (Vite default)
- http://localhost:5174 (Vite alternative)
- http://localhost:8080 (Alternative dev port)

## 🚀 Deployment

### Docker Support
```bash
# Development environment
docker-compose -f docker-compose.dev.yml up

# Production environment
docker-compose up
```

### Production Considerations
- Configure proper CORS origins
- Set up environment-specific configuration
- Implement proper logging and monitoring
- Add database persistence (currently in-memory)

## 🤝 Development Workflow

### Adding New Questions
1. Update `Service/data/nist_800_53_questions.json`
2. Restart backend server
3. Questions are automatically loaded

### Adding New Frameworks
1. Create framework data file in `Service/data/`
2. Update `data_store.py` to load new framework
3. Add framework to API responses

### Frontend Development
- Hot Module Replacement (HMR) enabled
- TypeScript for type safety
- Material UI component library
- React Router for navigation

## 📝 License

[Add your license information here]

## 🐛 Known Issues

- Data persistence is currently in-memory (resets on restart)
- Node.js version warning (upgrade to 22.12+ recommended)
- Auto-save debouncing set to 2 seconds

## 🔮 Future Enhancements

- Database persistence (PostgreSQL/MongoDB)
- User authentication and authorization
- Advanced reporting and analytics
- Additional compliance frameworks
- Export functionality (PDF/Excel)
- Audit trail and versioning
- Multi-tenant support

## 📞 Support

For questions, issues, or contributions, please [create an issue](link-to-issues) in the repository.
