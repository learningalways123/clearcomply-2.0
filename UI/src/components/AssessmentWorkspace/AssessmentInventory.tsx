import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
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
import AddIcon from '@mui/icons-material/Add';
import DnsIcon from '@mui/icons-material/Dns';

import { api } from '../../services/api';
import type { InventoryItem } from '../../services/api';
import { useWorkspace } from './AssessmentWorkspace';

export default function AssessmentInventory() {
  const { assessment } = useWorkspace();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading || !assessment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      
      {/* Header bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Track and audit your system physical/logical servers, virtual machines, databases, and network assets in scope.
        </Typography>
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

      {/* Table Card */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
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
