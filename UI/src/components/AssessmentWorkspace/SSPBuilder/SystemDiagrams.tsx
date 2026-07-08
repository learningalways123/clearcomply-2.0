import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useParams } from 'react-router-dom';
import { api, apiClient } from '../../../services/api';

export default function SystemDiagrams() {
  const { id = '' } = useParams<{ id: string }>();
  const [hasDiagram, setHasDiagram] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [diagramUrl, setDiagramUrl] = useState<string>('');

  const checkDiagramStatus = async () => {
    if (!id) return;
    try {
      setLoading(true);
      // Try to fetch diagram URL with a cache buster parameter
      const url = `${api.downloadDiagramUrl(id)}?cb=${Date.now()}`;
      // Verify if image exists by doing a quick HEAD request
      await apiClient.head(`/assessments/${id}/diagram`);
      setDiagramUrl(url);
      setHasDiagram(true);
    } catch (err) {
      setHasDiagram(false);
      setDiagramUrl('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDiagramStatus();
  }, [id]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    // Validate type (Images or PDF)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only image files (PNG, JPG, SVG, GIF) are allowed for direct preview.');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('file', file);

      await apiClient.post(`/assessments/${id}/diagram`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Diagram uploaded successfully!');
      await checkDiagramStatus();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to upload network diagram.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this network diagram?')) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      await api.deleteDiagram(id);
      setHasDiagram(false);
      setDiagramUrl('');
      setSuccess('Diagram deleted successfully.');
    } catch (err: any) {
      console.error(err);
      setError('Failed to delete network diagram.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">Diagram</Typography>
        <Typography variant="body2" color="text.secondary">
          Upload and review the authoritative diagram showing security boundaries, network paths, and endpoints.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
          {loading ? (
            <CircularProgress sx={{ my: 4 }} />
          ) : hasDiagram ? (
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Current Diagram
              </Typography>
              
              <Box 
                sx={{ 
                  maxHeight: 500, 
                  overflow: 'auto', 
                  border: '1px dashed #e5e7eb', 
                  borderRadius: 2, 
                  p: 2, 
                  bgcolor: 'grey.50',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 3
                }}
              >
                <img 
                  src={diagramUrl} 
                  alt="System Diagram" 
                  style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain' }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  disabled={uploading}
                >
                  Replace Diagram
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDelete}
                  disabled={uploading}
                >
                  Delete Diagram
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CloudUploadIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>
                No Diagram Uploaded
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                Please upload a detailed diagram mapping out the system boundary, connections, and host servers.
              </Typography>

              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUploadIcon />}
                disabled={uploading}
                sx={{ borderRadius: 2 }}
              >
                {uploading ? 'Uploading...' : 'Upload Diagram'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
