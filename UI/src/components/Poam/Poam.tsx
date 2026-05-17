import { useCallback, useState } from 'react';

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

import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import type { PoamItem, Assessment, CreatePoamRequest, UpdatePoamRequest } from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Summary Bar ─────────────────────────────────────────────────────────────

function SummaryBar({ items }: { items: PoamItem[] }) {
  const open = items.filter(i => i.status === 'open').length;
  const inRem = items.filter(i => i.status === 'in_remediation').length;
  const closed = items.filter(i => i.status === 'closed').length;
  const highOpen = items.filter(i => i.priority === 'high' && i.status !== 'closed').length;

  return (
    <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
      {[
        { label: 'Total Items', val: items.length, color: '#4f46e5' },
        { label: 'Open', val: open, color: '#ef4444' },
        { label: 'In Remediation', val: inRem, color: '#f97316' },
        { label: 'Closed', val: closed, color: '#10b981' },
        { label: 'High-Priority Open', val: highOpen, color: '#dc2626' },
      ].map(({ label, val, color }) => (
        <Card key={label} sx={{ flex: '0 1 160px' }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="h5" fontWeight={700} sx={{ color }}>{val}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

// ─── Create/Edit Dialog ───────────────────────────────────────────────────────

interface DialogState {
  open: boolean;
  mode: 'create' | 'edit';
  item?: PoamItem;
}

const EMPTY_FORM = {
  assessmentId: '',
  title: '',
  description: '',
  priority: 'medium' as 'high' | 'medium' | 'low',
  dueDate: '',
  owner: '',
  status: 'open' as 'open' | 'in_remediation' | 'closed',
};

function PoamDialog({
  dialogState,
  assessments,
  onClose,
  onSave,
}: {
  dialogState: DialogState;
  assessments: Assessment[];
  onClose: () => void;
  onSave: (form: typeof EMPTY_FORM) => Promise<void>;
}) {
  const [form, setForm] = useState(() =>
    dialogState.mode === 'edit' && dialogState.item
      ? {
          assessmentId: dialogState.item.assessmentId,
          title: dialogState.item.title,
          description: dialogState.item.description ?? '',
          priority: dialogState.item.priority as 'high' | 'medium' | 'low',
          dueDate: dialogState.item.dueDate ?? '',
          owner: dialogState.item.owner ?? '',
          status: dialogState.item.status as 'open' | 'in_remediation' | 'closed',
        }
      : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);

  const f = (field: string) => (e: React.ChangeEvent<{ value: unknown }>) =>
    setForm(p => ({ ...p, [field]: e.target.value as string }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.assessmentId) return;
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={dialogState.open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{dialogState.mode === 'create' ? 'New POA&M Item' : 'Edit POA&M Item'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} pt={0.5}>
          {dialogState.mode === 'create' && (
            <FormControl fullWidth size="small">
              <InputLabel>Assessment *</InputLabel>
              <Select value={form.assessmentId} label="Assessment *"
                onChange={e => setForm(p => ({ ...p, assessmentId: e.target.value }))}>
                {assessments.map(a => (
                  <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField label="Title *" value={form.title} onChange={f('title')} size="small" fullWidth />
          <TextField label="Description" value={form.description} onChange={f('description')}
            size="small" fullWidth multiline rows={2} />
          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Priority</InputLabel>
              <Select value={form.priority} label="Priority"
                onChange={e => setForm(p => ({ ...p, priority: e.target.value as 'high' | 'medium' | 'low' }))}>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
            {dialogState.mode === 'edit' && (
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status"
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as 'open' | 'in_remediation' | 'closed' }))}>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_remediation">In Remediation</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Due Date" type="date" value={form.dueDate} onChange={f('dueDate')}
              size="small" sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
            <TextField label="Owner" value={form.owner} onChange={f('owner')} size="small" sx={{ flex: 1 }} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.title.trim() || !form.assessmentId}>
          {saving ? <CircularProgress size={16} color="inherit" /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Poam() {
  const fetchAll = useCallback(
    () => Promise.all([api.getPoamItems(), api.getAssessments()]),
    [],
  );
  const { data, loading, error, execute } = useAsync(fetchAll, true);
  const [items, assessments]: [PoamItem[], Assessment[]] = (data as [PoamItem[], Assessment[]]) ?? [[], []];

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const assessmentName = (id: string) => assessments.find(a => a.id === id)?.name ?? id.slice(0, 8) + '…';

  const filtered = items.filter(i =>
    (filterStatus === 'all' || i.status === filterStatus) &&
    (filterPriority === 'all' || i.priority === filterPriority)
  );

  const handleCreate = async (form: typeof EMPTY_FORM) => {
    const req: CreatePoamRequest = {
      assessmentId: form.assessmentId,
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      owner: form.owner || undefined,
    };
    await api.createPoamItem(req);
    execute();
  };

  const handleEdit = async (form: typeof EMPTY_FORM) => {
    if (!dialog.item) return;
    const req: UpdatePoamRequest = {
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate || undefined,
      owner: form.owner || undefined,
    };
    await api.updatePoamItem(dialog.item.id, req);
    execute();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deletePoamItem(deleteId);
      setDeleteId(null);
      execute();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const quickStatus = async (item: PoamItem, next: 'open' | 'in_remediation' | 'closed') => {
    try {
      await api.updatePoamItem(item.id, { status: next });
      execute();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" pt={8}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Plan of Action &amp; Milestones</Typography>
          <Typography variant="body2" color="text.secondary">
            Track remediation items and close outstanding risk gaps
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => setDialog({ open: true, mode: 'create' })}
          disabled={assessments.length === 0}>
          New Item
        </Button>
      </Box>

      {(error || opError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setOpError(null)}>
          {error ?? opError}
        </Alert>
      )}

      <SummaryBar items={items} />

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={2}>
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
        <Typography variant="body2" color="text.secondary" alignSelf="center">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''} shown
        </Typography>
      </Stack>

      <Card>
        {filtered.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Typography color="text.secondary">
              {items.length === 0
                ? 'No POA&M items yet. Create one from the dashboard risk gaps or click "New Item".'
                : 'No items match the current filters.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  {['Priority', 'Title', 'Assessment', 'Status', 'Due Date', 'Owner', 'Actions'].map(h => (
                    <TableCell key={h}><Typography variant="subtitle2" fontWeight={600}>{h}</Typography></TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(item => {
                  const pm = PRIORITY_META[item.priority] ?? PRIORITY_META.medium;
                  const sm = STATUS_META[item.status] ?? STATUS_META.open;
                  const overdue = item.dueDate && item.status !== 'closed' && new Date(item.dueDate) < new Date();
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Chip label={pm.label} color={pm.color} size="small" icon={pm.icon ?? undefined} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Tooltip title={item.description ?? ''} placement="top-start">
                          <Typography variant="body2" fontWeight={500}
                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                            {item.title}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {assessmentName(item.assessmentId)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={sm.label} color={sm.color} size="small" icon={sm.icon} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={overdue ? 'error.main' : 'text.primary'}
                          fontWeight={overdue ? 700 : 400}>
                          {formatDate(item.dueDate)}{overdue ? ' ⚠' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.owner ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {item.status === 'open' && (
                            <Tooltip title="Start Remediation">
                              <IconButton size="small" color="warning"
                                onClick={() => quickStatus(item, 'in_remediation')}>
                                <BuildIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {item.status === 'in_remediation' && (
                            <Tooltip title="Mark Closed">
                              <IconButton size="small" color="success"
                                onClick={() => quickStatus(item, 'closed')}>
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Divider orientation="vertical" flexItem />
                          <Tooltip title="Edit">
                            <IconButton size="small"
                              onClick={() => setDialog({ open: true, mode: 'edit', item })}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error"
                              onClick={() => setDeleteId(item.id)}>
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

      {/* Create/Edit dialog */}
      {dialog.open && (
        <PoamDialog
          dialogState={dialog}
          assessments={assessments}
          onClose={() => setDialog({ open: false, mode: 'create' })}
          onSave={dialog.mode === 'create' ? handleCreate : handleEdit}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete POA&M Item?</DialogTitle>
        <DialogContent>
          <Typography>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
