import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';

import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import type { Assessment } from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
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
  const color = value >= 80 ? '#10b981' : value >= 50 ? '#f97316' : '#ef4444';
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
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f97316' : '#ef4444';
  const label = score >= 80 ? 'Low Risk' : score >= 50 ? 'Med Risk' : 'High Risk';
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

export default function ProjectDetails() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const fetchProjectWithSsp = useCallback(
    () => Promise.all([api.getProject(id), api.getFrameworks()]),
    [id],
  );
  const { data, loading, error, execute } = useAsync(fetchProjectWithSsp, true);

  const [projectData, frameworks] = data ?? [null, []];
  const project = projectData;
  const ssps: Assessment[] = project?.ssps ?? [];

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project? All nested SSPs will be permanently removed.')) return;
    setDeleting(true);
    try {
      await api.deleteProject(id);
      navigate('/projects');
    } catch (e) {
      console.error(e);
      alert('Failed to delete project.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Project not found.</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')} sx={{ mt: 2 }}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* ── Back link ── */}
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/projects')} 
        sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
      >
        Projects
      </Button>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>{project.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            Project created on {formatDate(project.createdAt)} {project.createdByEmail ? `by ${project.createdByEmail}` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteIcon />} 
            onClick={handleDelete} 
            disabled={deleting}
            sx={{ borderRadius: 2 }}
          >
            Delete Project
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => navigate(`/new-assessment?projectId=${id}`)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Create New SSP
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

      {/* ── SSPs Table ── */}
      <Card>
        {ssps.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>No System Security Plans (SSPs) yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first System Security Plan (SSP) for this project to start tracking controls.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => navigate(`/new-assessment?projectId=${id}`)}
            >
              Create SSP
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  {['SSP Name', 'Frameworks', 'Status', 'Completion', 'Risk Score', 'Created', ''].map(h => (
                    <TableCell key={h}>
                      <Typography variant="subtitle2" fontWeight={600}>{h}</Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {ssps.map((s) => (
                  <TableRow key={s.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/assessments/${s.id}`)}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>{s.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.id.substring(0, 8)}…</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {s.frameworkIds.map(fId => (
                          <Chip 
                            key={fId} 
                            label={frameworks.find((f: any) => f.id === fId)?.name ?? fId} 
                            size="small" 
                            variant="outlined" 
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell><StatusChip status={s.status} /></TableCell>
                    <TableCell><CompletionRing value={s.questionStats?.completionPercent ?? 0} /></TableCell>
                    <TableCell><RiskBadge score={s.riskScore} /></TableCell>
                    <TableCell><Typography variant="body2">{formatDate(s.createdAt)}</Typography></TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        startIcon={<VisibilityIcon />}
                        onClick={(e) => { e.stopPropagation(); navigate(`/assessments/${s.id}`); }}
                      >
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
