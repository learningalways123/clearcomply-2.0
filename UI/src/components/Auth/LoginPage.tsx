import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { useAuth } from '../../contexts/AuthContext';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // If already authenticated redirect immediately
  useEffect(() => {
    if (isAuthenticated) navigate('/assessments', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    setError(null);
    setSigningIn(true);
    try {
      await login(response.credential);
      navigate('/assessments', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  if (!CLIENT_ID) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          <strong>Configuration error:</strong> VITE_GOOGLE_CLIENT_ID is not set in{' '}
          <code>.env.local</code>.
        </Alert>
      </Box>
    );
  }

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
          p: 2,
        }}
      >
        <Paper
          elevation={4}
          sx={{ p: 5, maxWidth: 420, width: '100%', textAlign: 'center', borderRadius: 3 }}
        >
          {/* Logo / title */}
          <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
            ClearComply
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Compliance Assessment Platform
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {error}
            </Alert>
          )}

          {signingIn ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => setError('Google sign-in failed. Please try again.')}
                useOneTap
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
              />
            </Box>
          )}

          <Typography variant="caption" color="text.disabled" sx={{ mt: 4, display: 'block' }}>
            Sign in with your Google account to continue
          </Typography>
        </Paper>
      </Box>
    </GoogleOAuthProvider>
  );
}
