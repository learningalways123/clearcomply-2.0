import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { apiService } from '../services/api';
import type { Framework } from '../services/api';

const ApiTest: React.FC = () => {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Testing API...');
      
      const result = await apiService.getFrameworks();
      console.log('API Result:', result);
      setFrameworks(result);
    } catch (err) {
      console.error('API Test Error:', err);
      setError(err instanceof Error ? err.message : 'API test failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  return (
    <Box p={3}>
      <Typography variant="h4">API Test</Typography>
      <Button onClick={testApi} disabled={loading}>
        {loading ? 'Testing...' : 'Test API'}
      </Button>
      
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      
      {frameworks.length > 0 && (
        <Box mt={2}>
          <Typography variant="h6">Frameworks ({frameworks.length}):</Typography>
          {frameworks.map(framework => (
            <Box key={framework.id} p={1} border={1} borderColor="grey.300" mt={1}>
              <Typography><strong>{framework.name}</strong></Typography>
              <Typography variant="body2">{framework.description}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ApiTest;
