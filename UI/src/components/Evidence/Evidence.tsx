import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Stack, Button, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, CircularProgress, Tooltip, LinearProgress,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { api } from '../../services/api';

interface EvidenceFile {
  id: string;
  assessmentId: string;
  questionId?: string;
  controlRef?: string;
  filename: string;
  fileSize: number;
  mimeType?: string;
  asOfDate?: string;
  expiryDate?: string;
  description?: string;
  tags: string[];
  uploadedBy?: string;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isExpired(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

interface UploadDialogProps {
  open: boolean;
  assessments: { id: string; name: string }[];
  onClose: () => void;
  onUploaded: () => void;
}

function UploadDialog({ open, assessments, onClose, onUploaded }: UploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assessmentId, setAssessmentId] = useState('');
  const [description, setDescription] = useState('');
  const [asOfDate, setAsOfDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSelectedFile(null);
    setAssessmentId('');
    setDescription('');
    setAsOfDate('');
    setExpiryDate('');
    setTags('');
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      setError('File exceeds 25 MB limit');
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !assessmentId) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('assessment_id', assessmentId);
      if (description) formData.append('description', description);
      if (asOfDate) formData.append('as_of_date', asOfDate);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      if (tags.trim()) {
        const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
        formData.append('tags', JSON.stringify(tagList));
      }
      await api.uploadEvidence(formData);
      onUploaded();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <UploadFileIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
        Upload Evidence
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Drop zone */}
          <Box
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: `2px dashed ${dragOver ? '#4f46e5' : '#d1d5db'}`,
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: dragOver ? 'primary.50' : 'grey.50',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <CloudUploadIcon sx={{ fontSize: 40, color: dragOver ? 'primary.main' : 'grey.400', mb: 1 }} />
            {selectedFile ? (
              <Typography variant="body2" fontWeight={600} color="primary.main">
                <AttachFileIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                {selectedFile.name} ({formatBytes(selectedFile.size)})
              </Typography>
            ) : (
              <>
                <Typography variant="body2" fontWeight={600}>Drag & drop a file here, or click to browse</Typography>
                <Typography variant="caption" color="text.secondary">PDF, images, Office docs, CSV, ZIP — max 25 MB</Typography>
              </>
            )}
          </Box>

          <FormControl fullWidth size="small" required>
            <InputLabel>Assessment</InputLabel>
            <Select
              value={assessmentId}
              label="Assessment"
              onChange={(e) => setAssessmentId(e.target.value)}
            >
              {assessments.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small" fullWidth label="Description" multiline rows={2}
            value={description} onChange={(e) => setDescription(e.target.value)}
          />

          <Stack direction="row" spacing={2}>
            <TextField
              size="small" fullWidth label="As-of Date" type="date"
              value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small" fullWidth label="Expiry Date" type="date"
              value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          <TextField
            size="small" fullWidth label="Tags (comma-separated)"
            placeholder="e.g. SOC2, Access Control, Q1-2026"
            value={tags} onChange={(e) => setTags(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!selectedFile || !assessmentId || uploading}
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Evidence() {
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [assessments, setAssessments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filterAssessmentId, setFilterAssessmentId] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evidenceList, assessmentList] = await Promise.all([
        api.listEvidence(filterAssessmentId || undefined),
        api.getAssessments(),
      ]);
      setFiles(evidenceList);
      setAssessments(assessmentList.map((a: any) => ({ id: a.id, name: a.name })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  }, [filterAssessmentId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.deleteEvidence(deleteId);
      setDeleteId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownload = (id: string, filename: string) => {
    const token = localStorage.getItem('auth_token');
    const a = document.createElement('a');
    a.href = `/api/evidence/${id}/download`;
    // Fetch with auth header
    fetch(a.href, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const assessmentName = (id: string) => assessments.find(a => a.id === id)?.name ?? id.slice(0, 8) + '…';

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Typography variant="h5" fontWeight={700} flex={1}>Evidence Repository</Typography>
        <Tooltip title="Refresh"><IconButton onClick={load}><RefreshIcon /></IconButton></Tooltip>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={() => setUploadOpen(true)}
        >
          Upload Evidence
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} mb={2}>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>Filter by Assessment</InputLabel>
          <Select
            value={filterAssessmentId}
            label="Filter by Assessment"
            onChange={(e) => setFilterAssessmentId(e.target.value)}
          >
            <MenuItem value="">All Assessments</MenuItem>
            {assessments.map((a) => (
              <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'grey.50' } }}>
                <TableCell>File</TableCell>
                <TableCell>Assessment</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>As-of Date</TableCell>
                <TableCell>Expiry</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Uploaded By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No evidence files yet. Click "Upload Evidence" to add files.
                  </TableCell>
                </TableRow>
              ) : (
                files.map((f) => {
                  const expired = isExpired(f.expiryDate);
                  return (
                    <TableRow key={f.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <AttachFileIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 200 }}>
                            {f.filename}
                          </Typography>
                        </Stack>
                        {f.description && (
                          <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 200 }}>
                            {f.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{assessmentName(f.assessmentId)}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{formatBytes(f.fileSize)}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{f.asOfDate ?? '—'}</TableCell>
                      <TableCell>
                        {f.expiryDate ? (
                          <Chip
                            label={f.expiryDate}
                            size="small"
                            color={expired ? 'error' : 'success'}
                            variant="outlined"
                          />
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {f.tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{f.uploadedBy ?? '—'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Download">
                          <IconButton size="small" onClick={() => handleDownload(f.id, f.filename)}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDeleteId(f.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        assessments={assessments}
        onClose={() => setUploadOpen(false)}
        onUploaded={load}
      />

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Delete Evidence</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to permanently delete this evidence file? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} disabled={deleteLoading}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : undefined}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
