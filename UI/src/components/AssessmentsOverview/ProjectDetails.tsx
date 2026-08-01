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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

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
  const [editSsp, setEditSsp] = useState<{ id: string; name: string } | null>(null);
  const [savingName, setSavingName] = useState(false);

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [savingProjectName, setSavingProjectName] = useState(false);

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

  const handleDeleteSsp = async (sspId: string) => {
    if (!window.confirm('Are you sure you want to delete this SSP? All associated data will be permanently removed.')) return;
    try {
      await api.deleteAssessment(sspId);
      execute();
    } catch (e) {
      console.error(e);
      alert('Failed to delete SSP.');
    }
  };

  const handleEditSsp = (ssp: Assessment) => {
    setEditSsp({ id: ssp.id, name: ssp.name });
  };

  const handleSaveSspName = async () => {
    if (!editSsp || !editSsp.name.trim()) return;
    setSavingName(true);
    try {
      await api.updateAssessment(editSsp.id, { name: editSsp.name.trim() });
      setEditSsp(null);
      execute();
    } catch (e) {
      console.error(e);
      alert('Failed to update SSP name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleOpenEditProject = () => {
    setEditingProjectName(project?.name || '');
    setEditProjectOpen(true);
  };

  const handleSaveProjectTitle = async () => {
    if (!id || !editingProjectName.trim()) return;
    setSavingProjectName(true);
    try {
      await api.updateProject(id, { name: editingProjectName.trim() });
      setEditProjectOpen(false);
      execute();
    } catch (e) {
      console.error(e);
      alert('Failed to update project name.');
    } finally {
      setSavingProjectName(false);
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h4">{project.name}</Typography>
            <Tooltip title="Edit Project Name">
              <IconButton 
                size="small" 
                onClick={handleOpenEditProject} 
                sx={{ color: 'text.secondary', opacity: 0.7, '&:hover': { opacity: 1, color: 'primary.main' } }}
              >
                <EditIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
          </Box>
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
            variant="outlined" 
            color="primary" 
            startIcon={<AddIcon />} 
            onClick={() => navigate(`/new-assessment?projectId=${id}&type=risk_assessment`)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Create Risk Assessment
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
            <Typography variant="h6" color="text.secondary" gutterBottom>No System Security Plans (SSPs) or Risk Assessments yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first System Security Plan (SSP) or Risk Assessment for this project to start tracking controls.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />} 
                onClick={() => navigate(`/new-assessment?projectId=${id}&type=risk_assessment`)}
              >
                Create Risk Assessment
              </Button>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => navigate(`/new-assessment?projectId=${id}`)}
              >
                Create SSP
              </Button>
            </Box>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  {['Name', 'Frameworks', 'Status', 'Completion', 'Risk Score', 'Created', ''].map(h => (
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>{s.name}</Typography>
                        <Tooltip title="Edit Name">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSsp(s);
                            }}
                            sx={{ color: 'text.secondary', opacity: 0.6, '&:hover': { opacity: 1, color: 'primary.main' } }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          size="small" 
                          startIcon={<VisibilityIcon />}
                          onClick={() => navigate(`/assessments/${s.id}`)}
                        >
                          View
                        </Button>
                        <Button 
                          size="small" 
                          color="primary"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditSsp(s)}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="small" 
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteSsp(s.id)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* ── Edit SSP Name Dialog ── */}
      <Dialog 
        open={Boolean(editSsp)} 
        onClose={() => !savingName && setEditSsp(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Name</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            margin="dense"
            label="SSP / Risk Assessment Name"
            type="text"
            fullWidth
            value={editSsp?.name ?? ''}
            onChange={(e) => setEditSsp(prev => prev ? { ...prev, name: e.target.value } : null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveSspName();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditSsp(null)} disabled={savingName}>Cancel</Button>
          <Button 
            onClick={handleSaveSspName} 
            variant="contained" 
            disabled={savingName || !editSsp?.name.trim()}
          >
            {savingName ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Project Name Dialog ── */}
      <Dialog 
        open={editProjectOpen} 
        onClose={() => !savingProjectName && setEditProjectOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Project Name</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            type="text"
            fullWidth
            value={editingProjectName}
            onChange={(e) => setEditingProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveProjectTitle();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditProjectOpen(false)} disabled={savingProjectName}>Cancel</Button>
          <Button 
            onClick={handleSaveProjectTitle} 
            variant="contained" 
            disabled={savingProjectName || !editingProjectName.trim()}
          >
            {savingProjectName ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
