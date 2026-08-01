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
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';

import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FolderIcon from '@mui/icons-material/Folder';
import EditIcon from '@mui/icons-material/Edit';

import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import type { Project } from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentsOverview() {
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  const [editProject, setEditProject] = useState<{ id: string; name: string } | null>(null);
  const [savingProject, setSavingProject] = useState(false);

  const fetchProjects = useCallback(
    () => api.getProjects(),
    [],
  );
  const { data: projectsData, loading, error, execute } = useAsync(fetchProjects, true);
  const projects = projectsData ?? [];

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const res = await api.seedDemoAssessment();
      alert('Demo NIST 800-53 assessment seeded successfully!');
      navigate(`/assessments/${res.assessmentId}/dashboard`);
    } catch (e) {
      console.error(e);
      alert('Failed to seed demo assessment.');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    setCreating(true);
    try {
      const proj = await api.createProject(projectName.trim());
      setIsModalOpen(false);
      setProjectName('');
      execute();
      navigate(`/projects/${proj.id}`);
    } catch (e) {
      console.error(e);
      alert('Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveProjectName = async () => {
    if (!editProject || !editProject.name.trim()) return;
    setSavingProject(true);
    try {
      await api.updateProject(editProject.id, { name: editProject.name.trim() });
      setEditProject(null);
      execute();
    } catch (e) {
      console.error(e);
      alert('Failed to update project name.');
    } finally {
      setSavingProject(false);
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
          <Typography variant="h4" gutterBottom>Projects</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your compliance projects and system security plans (SSPs)
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
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setIsModalOpen(true)} 
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            New Project
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
        {projects.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>No projects yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first project to start organizing your compliance SSPs.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)}>
              Create Project
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  {['Project Name', 'Linked SSPs', 'Created Date', ''].map(h => (
                    <TableCell key={h}>
                      <Typography variant="subtitle2" fontWeight={600}>{h}</Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {projects.map((p: Project) => (
                  <TableRow key={p.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/projects/${p.id}`)}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <FolderIcon sx={{ color: 'primary.main' }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600}>{p.name}</Typography>
                          <Tooltip title="Edit Project Name">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditProject({ id: p.id, name: p.name });
                              }}
                              sx={{ color: 'text.secondary', opacity: 0.6, '&:hover': { opacity: 1, color: 'primary.main' } }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{p.sspCount ?? 0} SSPs</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(p.createdAt)}</Typography>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" startIcon={<VisibilityIcon />}
                          onClick={() => navigate(`/projects/${p.id}`)}>
                          View
                        </Button>
                        <Button size="small" color="primary" startIcon={<EditIcon />}
                          onClick={() => setEditProject({ id: p.id, name: p.name })}>
                          Edit
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

      {/* ── New Project Dialog Modal ── */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={creating}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateProject} 
            variant="contained" 
            disabled={creating || !projectName.trim()}
          >
            {creating ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Project Name Dialog Modal ── */}
      <Dialog open={Boolean(editProject)} onClose={() => !savingProject && setEditProject(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Project Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editProject?.name ?? ''}
            onChange={(e) => setEditProject(prev => prev ? { ...prev, name: e.target.value } : null)}
            disabled={savingProject}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveProjectName();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProject(null)} disabled={savingProject}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveProjectName} 
            variant="contained" 
            disabled={savingProject || !editProject?.name.trim()}
          >
            {savingProject ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
