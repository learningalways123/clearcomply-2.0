import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { api } from '../../services/api';

export default function NewAssessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || undefined;

  // ── Form state ──
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // ── NIST metadata (loaded automatically under the hood) ──
  const [allControlIds, setAllControlIds] = useState<string[]>([]);
  const [allQuestionIds, setAllQuestionIds] = useState<string[]>([]);
  const [allFamilyIds, setAllFamilyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMetadata = async () => {
      try {
        const [controls, families, questions] = await Promise.all([
          api.getControls('NIST-800-53'),
          api.getFamilies('NIST-800-53'),
          api.getQuestions('NIST-800-53'),
        ]);
        if (cancelled) return;
        setAllControlIds(controls.map(c => c.id));
        setAllFamilyIds(families.map(f => f.familyId));
        setAllQuestionIds(questions.map(q => q.id));
      } catch (e) {
        console.error("Failed to pre-load NIST metadata:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMetadata();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setCreateError('Please enter an SSP name.'); return; }
    if (!startDate) { setCreateError('Please select a start date.'); return; }
    if (!endDate) { setCreateError('Please select a target end date.'); return; }
    
    setCreating(true);
    setCreateError(null);
    try {
      const assessment = await api.createAssessment({
        name: name.trim(),
        frameworkIds: ['NIST-800-53'],
        selectedControlIds: allControlIds,
        selectedQuestionIds: allQuestionIds,
        familyIds: allFamilyIds,
        moduleIds: [],
        projectId: projectId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      if (projectId) {
        navigate(`/projects/${projectId}`);
      } else {
        navigate(`/assessments/${assessment.id}/dashboard`);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create SSP');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress size={40} sx={{ color: '#4f46e5' }} />
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Preparing NIST 800-53 template...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={850} sx={{ color: '#1e1b4b', letterSpacing: '-0.75px', mb: 1 }}>
          Create New SSP
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Enter details below to initialize your System Security Plan using NIST 800-53 standards.
        </Typography>
      </Box>

      {createError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setCreateError(null)}>
          {createError}
        </Alert>
      )}

      <Card sx={{ borderRadius: 3, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            
            {/* SSP Name */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1e1b4b' }}>
                SSP Name
              </Typography>
              <TextField
                fullWidth
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Agency System Security Plan - Production"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Box>

            {/* Dates */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1e1b4b' }}>
                Timeline / Schedule
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
                <TextField
                  fullWidth
                  type="date"
                  label="Target Completion Date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Box>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2, borderTop: '1px solid #f1f5f9' }}>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate(-1)}
                disabled={creating}
                sx={{ borderRadius: 2, px: 3, borderColor: '#cbd5e1', color: '#64748b', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' } }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4338ca 0%, #2e2685 100%)',
                  }
                }}
              >
                {creating ? <CircularProgress size={20} color="inherit" /> : 'Create SSP'}
              </Button>
            </Box>

          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
