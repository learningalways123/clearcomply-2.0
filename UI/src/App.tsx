import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

import AppLayout from './components/Layout/AppLayout';
import NewAssessment from './components/NewAssessment/NewAssessment';
import AssessmentsOverview from './components/AssessmentsOverview/AssessmentsOverview';
import AssessmentDetail from './components/AssessmentDetail/AssessmentDetail';
import ApiTest from './components/ApiTest';

// Create Material UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#646cff',
      light: '#7c84ff',
      dark: '#4c54cc',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/assessments" replace />} />
              <Route path="/api-test" element={<ApiTest />} />
              <Route path="/new-assessment" element={<NewAssessment />} />
              <Route path="/assessments" element={<AssessmentsOverview />} />
              <Route path="/assessments/:id" element={<AssessmentDetail />} />
            </Routes>
          </AppLayout>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App
