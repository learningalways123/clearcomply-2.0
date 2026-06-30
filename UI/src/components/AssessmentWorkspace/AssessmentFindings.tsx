import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BuildIcon from '@mui/icons-material/Build';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

import { api } from '../../services/api';
import type { PoamItem, CreatePoamRequest, UpdatePoamRequest } from '../../services/api';
import { useWorkspace } from './AssessmentWorkspace';

const PRIORITY_META = {
  high:   { label: 'High',   color: 'error'   as const, icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
  medium: { label: 'Medium', color: 'warning' as const, icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
  low:    { label: 'Low',    color: 'default' as const, icon: null },
};

const STATUS_META = {
  open:           { label: 'Open',           color: 'error'   as const, icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
  in_remediation: { label: 'In Remediation', color: 'warning' as const, icon: <BuildIcon sx={{ fontSize: 14 }} /> },
  closed:         { label: 'Closed',         color: 'success' as const, icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
};

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AssessmentFindings() {
  const { assessment } = useWorkspace();
  const [items, setItems] = useState<PoamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [opError, setOpError] = useState<string | null>(null);
  const [autoPoamLoading, setAutoPoamLoading] = useState(false);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<PoamItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [formStatus, setFormStatus] = useState<'open' | 'in_remediation' | 'closed'>('open');
  const [formDueDate, setFormDueDate] = useState('');
  const [formOwner, setFormOwner] = useState('');

  const fetchPoams = async () => {
    if (!assessment) return;
    try {
      const data = await api.getPoamItems({ assessment_id: assessment.id });
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoams();
  }, [assessment]);

  const handleOpenCreate = () => {
    setFormTitle('');
    setFormDesc('');
    setFormPriority('medium');
    setFormStatus('open');
    setFormDueDate('');
    setFormOwner('');
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: PoamItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDesc(item.description || '');
    setFormPriority(item.priority as 'high' | 'medium' | 'low');
    setFormStatus(item.status as 'open' | 'in_remediation' | 'closed');
    setFormDueDate(item.dueDate || '');
    setFormOwner(item.owner || '');
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!assessment || !formTitle.trim()) return;
    try {
      if (dialogMode === 'create') {
        const req: CreatePoamRequest = {
          assessmentId: assessment.id,
          title: formTitle,
          description: formDesc || undefined,
          priority: formPriority,
          dueDate: formDueDate || undefined,
          owner: formOwner || undefined,
        };
        await api.createPoamItem(req);
      } else if (dialogMode === 'edit' && editingItem) {
        const req: UpdatePoamRequest = {
          title: formTitle,
          description: formDesc || undefined,
          priority: formPriority,
          status: formStatus,
          dueDate: formDueDate || undefined,
          owner: formOwner || undefined,
        };
        await api.updatePoamItem(editingItem.id, req);
      }
      setDialogOpen(false);
      fetchPoams();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deletePoamItem(deleteId);
      setDeleteId(null);
      fetchPoams();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleAutoGeneratePoam = async () => {
    if (!assessment) return;
    setAutoPoamLoading(true);
    try {
      await api.autoGeneratePoam(assessment.id);
      fetchPoams();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Auto-generation failed');
    } finally {
      setAutoPoamLoading(false);
    }
  };

  const handleQuickStatus = async (item: PoamItem, next: 'open' | 'in_remediation' | 'closed') => {
    try {
      await api.updatePoamItem(item.id, { status: next });
      fetchPoams();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (loading || !assessment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const filtered = items.filter(i =>
    (filterStatus === 'all' || i.status === filterStatus) &&
    (filterPriority === 'all' || i.priority === filterPriority)
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      
      {/* Action Header bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Manage unresolved vulnerability findings, non-compliance issues, and milestones (POA&M).
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button 
            variant="outlined" 
            color="warning"
            startIcon={autoPoamLoading ? <CircularProgress size={14} color="inherit" /> : <AutoFixHighIcon />}
            onClick={handleAutoGeneratePoam}
            disabled={autoPoamLoading}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Auto-generate POA&M
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            New Item
          </Button>
        </Stack>
      </Box>

      {opError && <Alert severity="error" onClose={() => setOpError(null)} sx={{ borderRadius: 2 }}>{opError}</Alert>}

      {/* Summary Cards */}
      <Stack direction="row" spacing={2.5} flexWrap="wrap">
        {[
          { label: 'Total Findings', val: items.length, color: '#4f46e5' },
          { label: 'Open', val: items.filter(i => i.status === 'open').length, color: '#ef4444' },
          { label: 'In Remediation', val: items.filter(i => i.status === 'in_remediation').length, color: '#f59e0b' },
          { label: 'Closed', val: items.filter(i => i.status === 'closed').length, color: '#10b981' },
        ].map(({ label, val, color }) => (
          <Card key={label} sx={{ flex: '1 1 180px', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
              <Typography variant="h5" fontWeight={850} sx={{ color }}>{val}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="in_remediation">In Remediation</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Priority</InputLabel>
          <Select value={filterPriority} label="Priority" onChange={e => setFilterPriority(e.target.value)}>
            <MenuItem value="all">All Priorities</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
          Showing {filtered.length} items
        </Typography>
      </Stack>

      {/* Table Card */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
        {filtered.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Typography color="text.secondary" variant="body2">
              No findings match your current filters.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', width: '35%' }}>Title / Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Owner</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(item => {
                  const pm = PRIORITY_META[item.priority as 'high' | 'medium' | 'low'] ?? PRIORITY_META.medium;
                  const sm = STATUS_META[item.status as 'open' | 'in_remediation' | 'closed'] ?? STATUS_META.open;
                  const overdue = item.dueDate && item.status !== 'closed' && new Date(item.dueDate) < new Date();
                  
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Chip label={pm.label} color={pm.color} size="small" icon={pm.icon ?? undefined} sx={{ fontWeight: 700, fontSize: 10 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={650} color="#1e293b">
                          {item.title}
                        </Typography>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {item.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={sm.label} color={sm.color} size="small" icon={sm.icon} sx={{ fontWeight: 650, fontSize: 11 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={overdue ? 'error.main' : 'text.primary'} fontWeight={overdue ? 750 : 500}>
                          {formatDate(item.dueDate)}{overdue ? ' ⚠' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="#475569">{item.owner ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {item.status === 'open' && (
                            <Tooltip title="Start Remediation">
                              <IconButton size="small" color="warning" onClick={() => handleQuickStatus(item, 'in_remediation')}>
                                <BuildIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {item.status === 'in_remediation' && (
                            <Tooltip title="Mark Closed">
                              <IconButton size="small" color="success" onClick={() => handleQuickStatus(item, 'closed')}>
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Divider orientation="vertical" flexItem />
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteId(item.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{dialogMode === 'create' ? 'Create POA&M Finding' : 'Edit Finding'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} pt={1}>
            <TextField 
              label="Title *" 
              value={formTitle} 
              onChange={e => setFormTitle(e.target.value)} 
              size="small" 
              fullWidth 
            />
            <TextField 
              label="Description" 
              value={formDesc} 
              onChange={e => setFormDesc(e.target.value)} 
              size="small" 
              fullWidth 
              multiline 
              rows={3} 
            />
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Priority</InputLabel>
                <Select value={formPriority} label="Priority" onChange={e => setFormPriority(e.target.value as 'high' | 'medium' | 'low')}>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
              {dialogMode === 'edit' && (
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={formStatus} label="Status" onChange={e => setFormStatus(e.target.value as 'open' | 'in_remediation' | 'closed')}>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="in_remediation">In Remediation</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField 
                label="Due Date" 
                type="date" 
                value={formDueDate} 
                onChange={e => setFormDueDate(e.target.value)} 
                size="small" 
                sx={{ flex: 1 }} 
                InputLabelProps={{ shrink: true }} 
              />
              <TextField 
                label="Owner" 
                value={formOwner} 
                onChange={e => setFormOwner(e.target.value)} 
                size="small" 
                sx={{ flex: 1 }} 
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!formTitle.trim()}>
            Save Finding
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete POA&M Finding?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This action is permanent and cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
