import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
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
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DnsIcon from '@mui/icons-material/Dns';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import SchemaIcon from '@mui/icons-material/Schema';

import { api } from '../../services/api';
import type { InventoryItem } from '../../services/api';
import { useWorkspace } from './AssessmentWorkspace';

export default function AssessmentInventory() {
  const { assessment, refreshAssessment } = useWorkspace();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Modal form states
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('VM');
  const [owner, setOwner] = useState('IT Operations');
  const [saving, setSaving] = useState(false);

  const fetchInventory = async () => {
    if (!assessment) return;
    try {
      const data = await api.getInventory(assessment.id);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [assessment]);

  const handleOpen = () => {
    setName('');
    setType('VM');
    setOwner('IT Operations');
    setOpen(true);
  };

  const handleAdd = async () => {
    if (!assessment || !name.trim()) return;
    setSaving(true);
    try {
      await api.addInventoryItem(assessment.id, name, type, owner);
      setOpen(false);
      fetchInventory();
    } catch (e) {
      console.error(e);
      alert('Failed to add inventory item.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDiagram = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!assessment || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      await api.uploadDiagram(assessment.id, file);
      if (refreshAssessment) refreshAssessment();
      alert('Data flow diagram uploaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to upload data flow diagram.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDiagram = async () => {
    if (!assessment) return;
    if (!window.confirm('Are you sure you want to delete the data flow diagram?')) return;
    try {
      await api.deleteDiagram(assessment.id);
      if (refreshAssessment) refreshAssessment();
      alert('Data flow diagram deleted.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete diagram.');
    }
  };

  if (loading || !assessment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      
      {/* ── Section 1: System Diagram Uploader ── */}
      <Card sx={{ borderRadius: 3.5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <SchemaIcon sx={{ color: '#4f46e5' }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={750} color="#0f172a">
                System Architecture & Data Flow Diagram
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Upload a data flow map or architectural topology diagram to satisfy NIST security boundary documentation requirements.
              </Typography>
            </Box>
          </Stack>

          {assessment.diagramFilename ? (
            <Box 
              sx={{ 
                p: 2.5, 
                bgcolor: '#f8fafc', 
                borderRadius: 2.5, 
                border: '1px solid #e2e8f0',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box 
                  sx={{ 
                    bgcolor: '#e0e7ff', 
                    color: '#4f46e5', 
                    borderRadius: 2, 
                    p: 1.5, 
                    display: 'flex', 
                    alignItems: 'center' 
                  }}
                >
                  <CloudUploadIcon />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={700} color="#1e293b">
                    {assessment.diagramFilename}
                  </Typography>
                  <Typography variant="caption" color="#64748b">
                    Uploaded successfully
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<GetAppIcon />}
                  onClick={() => window.open(api.downloadDiagramUrl(assessment.id), '_blank')}
                  sx={{ borderRadius: 2, fontWeight: 650, px: 2 }}
                >
                  Download
                </Button>
                <IconButton 
                  color="error" 
                  onClick={handleDeleteDiagram}
                  sx={{ border: '1px solid #fee2e2', borderRadius: 2, p: 0.75 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          ) : (
            <Box 
              sx={{ 
                border: '2px dashed #cbd5e1', 
                borderRadius: 3, 
                p: 4, 
                textBlock: 'center',
                textAlign: 'center',
                bgcolor: '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: '#f1f5f9', borderColor: '#4f46e5' }
              }}
              component="label"
            >
              <input 
                type="file" 
                hidden 
                accept="image/*,.pdf" 
                onChange={handleUploadDiagram} 
                disabled={uploading} 
              />
              {uploading ? (
                <Stack spacing={1.5} alignItems="center">
                  <CircularProgress size={32} />
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Uploading data flow map...
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={1.5} alignItems="center">
                  <CloudUploadIcon sx={{ fontSize: 40, color: '#94a3b8' }} />
                  <Box>
                    <Typography variant="body2" fontWeight={750} color="#1e293b">
                      Click to upload system architecture diagram
                    </Typography>
                    <Typography variant="caption" color="#64748b">
                      Supports PNG, JPG, SVG, and PDF files
                    </Typography>
                  </Box>
                </Stack>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Asset Inventory List ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={750} color="#0f172a">
              Scoped System Components
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Track physical/logical servers, databases, containers, and network elements.
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpen}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Add Asset
          </Button>
        </Box>

        <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          {items.length === 0 ? (
            <Box textAlign="center" py={6}>
              <Typography color="text.secondary" variant="body2">
                No inventory items defined yet. Click "Add Asset" to start populating your system inventory.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Asset Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Owner Team</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <DnsIcon sx={{ color: '#94a3b8' }} />
                          <Typography variant="body2" fontWeight={650} color="#1e293b">
                            {item.name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 550 }}>{item.type}</TableCell>
                      <TableCell>
                        <Chip label={item.status} size="small" color="success" sx={{ fontWeight: 700, fontSize: 11 }} />
                      </TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 500 }}>{item.owner || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Box>

      {/* Add Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add System Asset</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} pt={1}>
            <TextField 
              label="Asset Name *" 
              placeholder="e.g. Production Database, Gateway Proxy" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              size="small" 
              fullWidth 
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Asset Type</InputLabel>
              <Select value={type} label="Asset Type" onChange={e => setType(e.target.value)}>
                <MenuItem value="VM">Virtual Machine (VM)</MenuItem>
                <MenuItem value="Database">Database Instance</MenuItem>
                <MenuItem value="Container">Docker / Kubernetes Container</MenuItem>
                <MenuItem value="SaaS">SaaS Provider / Integration</MenuItem>
                <MenuItem value="Network Device">Network Switch / Firewall / Router</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Owner Team</InputLabel>
              <Select value={owner} label="Owner Team" onChange={e => setOwner(e.target.value)}>
                <MenuItem value="IT Operations">IT Operations</MenuItem>
                <MenuItem value="Business / Data Owners">Business / Data Owners</MenuItem>
                <MenuItem value="IAM / IT Ops">IAM / IT Ops</MenuItem>
                <MenuItem value="Security Team">Security Team</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={saving || !name.trim()}>
            {saving ? <CircularProgress size={16} color="inherit" /> : 'Add Asset'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
