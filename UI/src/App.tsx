import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './components/Auth/LoginPage';
import AppLayout from './components/Layout/AppLayout';
import AssessmentsOverview from './components/AssessmentsOverview/AssessmentsOverview';
import AssessmentDetail from './components/AssessmentDetail/AssessmentDetail';
import NewAssessment from './components/NewAssessment/NewAssessment';
import AuditLog from './components/AuditLog/AuditLog';
import Dashboard from './components/Dashboard/Dashboard';
import Poam from './components/Poam/Poam';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4f46e5', light: '#818cf8', dark: '#3730a3' },
    secondary: { main: '#06b6d4' },
    background: { default: '#f8f9fa', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/assessments" replace />} />
                      <Route path="/assessments" element={<AssessmentsOverview />} />
                      <Route path="/assessments/:id" element={<AssessmentDetail />} />
                      <Route path="/new-assessment" element={<NewAssessment />} />
                      <Route path="/audit-log" element={<AuditLog />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/poam" element={<Poam />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
