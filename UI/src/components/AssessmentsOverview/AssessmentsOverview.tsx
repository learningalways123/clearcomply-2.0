import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';

import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import type { Assessment, Framework } from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function frameworkName(id: string, frameworks: Framework[]) {
  return frameworks.find(f => f.id === id)?.name ?? id;
}

const STATUS_META: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' }> = {
  draft:       { label: 'Draft',       color: 'default' },
  in_progress: { label: 'In Progress', color: 'info' },
  submitted:   { label: 'Submitted',   color: 'warning' },
  reviewed:    { label: 'Reviewed',    color: 'success' },
};

function StatusChip({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: 'default' as const };
  return <Chip label={meta.label} color={meta.color} size="small" />;
}

function CompletionRing({ value }: { value: number }) {
  const color = value >= 75 ? '#10b981' : value >= 40 ? '#f97316' : '#ef4444';
  return (
    <Tooltip title={`${value.toFixed(1)}% answered`}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress variant="determinate" value={100} size={44}
          sx={{ color: '#e5e7eb', position: 'absolute', top: 0, left: 0 }} />
        <CircularProgress variant="determinate" value={Math.min(value, 100)} size={44}
          sx={{ color }} />
        <Box sx={{
          top: 0, left: 0, bottom: 0, right: 0, position: 'absolute',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography variant="caption" fontWeight={700} fontSize={9} sx={{ color }}>
            {Math.round(value)}%
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );
}

function RiskBadge({ score }: { score?: number | null }) {
  if (score == null) return <Typography variant="caption" color="text.disabled">—</Typography>;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f97316' : '#ef4444';
  const label = score >= 75 ? 'Low Risk' : score >= 50 ? 'Med Risk' : 'High Risk';
  return (
    <Tooltip title={`Weighted compliance score: ${score}%`}>
      <Box sx={{
        px: 1, py: 0.25, borderRadius: 1, bgcolor: `${color}18`,
        display: 'inline-flex', alignItems: 'center', gap: 0.5,
      }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} />
        <Typography variant="caption" fontWeight={700} sx={{ color }}>
          {score}% · {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentsOverview() {
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);

  const fetchAll = useCallback(
    () => Promise.all([api.getAssessments(), api.getFrameworks()]),
    [],
  );
  const { data, loading, error, execute } = useAsync(fetchAll, true);

  const [assessments, frameworks]: [Assessment[], Framework[]] = data ?? [[], []];

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const res = await api.seedDemoAssessment();
      alert('Demo NIST 800-53 assessment seeded successfully!');
      execute();
      navigate(`/assessments/${res.assessmentId}/dashboard`);
    } catch (e) {
      console.error(e);
      alert('Failed to seed demo assessment.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Assessments</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and track your compliance assessments
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleSeedDemo} 
            disabled={seeding}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {seeding ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
            Seed Demo Assessment
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/new-assessment')} sx={{ borderRadius: 2, fontWeight: 700 }}>
            New Assessment
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button size="small" onClick={execute}>Retry</Button>
        }>
          {error}
        </Alert>
      )}

      <Card>
        {assessments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>No assessments yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first assessment to start tracking compliance.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/new-assessment')}>
              Create Assessment
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  {['Assessment', 'Frameworks', 'Status', 'Completion', 'Risk Score', 'Created', ''].map(h => (
                    <TableCell key={h}>
                      <Typography variant="subtitle2" fontWeight={600}>{h}</Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.map((a) => (
                  <TableRow key={a.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/assessments/${a.id}`)}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={500}>{a.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.id.substring(0, 8)}…</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {a.frameworkIds.map(id => (
                          <Chip key={id} label={frameworkName(id, frameworks)} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell><StatusChip status={a.status} /></TableCell>
                    <TableCell><CompletionRing value={a.questionStats?.completionPercent ?? 0} /></TableCell>
                    <TableCell><RiskBadge score={a.riskScore} /></TableCell>
                    <TableCell><Typography variant="body2">{formatDate(a.createdAt)}</Typography></TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<VisibilityIcon />}
                        onClick={(e) => { e.stopPropagation(); navigate(`/assessments/${a.id}`); }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
