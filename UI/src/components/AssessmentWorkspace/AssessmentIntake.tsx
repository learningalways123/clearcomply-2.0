import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const CONTROL_FAMILIES = [
  'Data Categorization',
  'Disaster Recovery Planning',
  'Identity and Access Management Standard',
  'Incident Management Standard',
  'Information Security Program Standard',
  'Network Security Standard',
  'Physical and Environmental Security Standard',
  'Risk Management',
  'Secure Configuration Standard',
  'Secure Systems Development and Acquisition',
  'Security Awareness Standard',
  'Security Logging and Monitoring Standard',
  'Threat and Vulnerability Management'
];

import { api } from '../../services/api';
import type { IntakeTeam } from '../../services/api';
import { useWorkspace } from './AssessmentWorkspace';

export default function AssessmentIntake() {
  const { assessment } = useWorkspace();
  const [teams, setTeams] = useState<IntakeTeam[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  // Dialog Form States
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [families, setFamilies] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Menu and Edit States
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTeam, setSelectedTeam] = useState<IntakeTeam | null>(null);
  const [editingTeam, setEditingTeam] = useState<IntakeTeam | null>(null);

  const fetchIntakeTeams = async () => {
    if (!assessment) return;
    try {
      const data = await api.getIntake(assessment.id);
      setTeams(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntakeTeams();
  }, [assessment]);

  const handleOpenAdd = () => {
    setEditingTeam(null);
    setName('');
    setLeadName('');
    setLeadEmail('');
    setFamilies('');
    setDueDate('');
    setAddOpen(true);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>, team: IntakeTeam) => {
    setMenuAnchor(event.currentTarget);
    setSelectedTeam(team);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setSelectedTeam(null);
  };

  const handleEditClick = () => {
    if (!selectedTeam) return;
    setEditingTeam(selectedTeam);
    setName(selectedTeam.name);
    setLeadName(selectedTeam.leadName);
    setLeadEmail(selectedTeam.leadEmail);
    setFamilies(selectedTeam.families || '');
    setDueDate(selectedTeam.dueDate || '');
    setAddOpen(true);
    handleCloseMenu();
  };

  const handleDeleteClick = async () => {
    if (!selectedTeam || !assessment) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete intake team "${selectedTeam.name}"?`);
    if (!confirmDelete) return;
    
    try {
      await api.deleteIntakeTeam(assessment.id, selectedTeam.id);
      fetchIntakeTeams();
      alert('Intake team deleted successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to delete intake team.');
    } finally {
      handleCloseMenu();
    }
  };

  const handleAddTeam = async () => {
    if (!assessment || !name.trim() || !leadName.trim() || !leadEmail.trim()) return;
    setSaving(true);
    try {
      if (editingTeam) {
        await api.updateIntakeTeam(assessment.id, editingTeam.id, name, leadName, leadEmail, families, dueDate || undefined);
        alert('Intake team updated successfully!');
      } else {
        await api.addIntakeTeam(assessment.id, name, leadName, leadEmail, families, dueDate || undefined);
        alert('New intake team added successfully!');
      }
      setAddOpen(false);
      setEditingTeam(null);
      fetchIntakeTeams();
    } catch (e) {
      console.error(e);
      alert(editingTeam ? 'Failed to update intake team.' : 'Failed to add intake team.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemindTeam = async (teamId: string) => {
    if (!assessment) return;
    setRemindingId(teamId);
    try {
      const res = await api.remindTeam(assessment.id, teamId);
      alert(res.message || 'Reminder successfully sent!');
      fetchIntakeTeams(); // Refresh to update active days
    } catch (e) {
      console.error(e);
      alert('Failed to send reminder.');
    } finally {
      setRemindingId(null);
    }
  };

  if (loading || !assessment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.leadName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      
      {/* Search & Add Filter Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search teams or leads..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 320, bgcolor: '#fff', borderRadius: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleOpenAdd}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Add Intake Team
          </Button>
        </Box>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
          Showing {filteredTeams.length} responding teams
        </Typography>
      </Box>

      {/* Grid of Team Cards */}
      <Grid container spacing={3}>
        {filteredTeams.map((team) => {
          const isComplete = team.status === 'complete';
          const isOverdue = team.status === 'overdue';
          
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={team.id}>
              <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
                  
                  {/* Title & Status */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="body1" fontWeight={750} color="#0f172a">
                      {team.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip 
                        label={isComplete ? 'Complete' : isOverdue ? 'Overdue' : 'In Progress'} 
                        size="small"
                        color={isComplete ? 'success' : isOverdue ? 'error' : 'primary'}
                        sx={{ fontWeight: 650, fontSize: 11 }}
                      />
                      <IconButton size="small" onClick={(e) => handleOpenMenu(e, team)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Lead Info */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      Intake Owner
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="#334155">
                      {team.leadName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {team.leadEmail}
                    </Typography>
                  </Box>

                  {/* Deadline Date */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      Intake Deadline
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color={isOverdue ? 'error.main' : '#334155'}>
                      {team.dueDate ? new Date(team.dueDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'No deadline set'}
                    </Typography>
                  </Box>

                  {/* Subject Families Scoped */}
                  {team.families && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        Scoped Subject Families
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AssessmentIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                        {team.families}
                      </Typography>
                    </Box>
                  )}

                  {/* Progress bar */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        Progress rate
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="#1e293b">
                        {team.responseRate}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={team.responseRate} 
                      sx={{ 
                        height: 6, 
                        borderRadius: 3, 
                        bgcolor: '#f1f5f9',
                        '& .MuiLinearProgress-bar': { bgcolor: isComplete ? '#10b981' : isOverdue ? '#ef4444' : '#6366f1' }
                      }} 
                    />
                  </Box>

                  {/* Active times & Remind Actions */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {team.lastActiveDaysAgo === 0 ? 'Active today' : `Last active ${team.lastActiveDaysAgo}d ago`}
                    </Typography>
                    {!isComplete && (
                      <Button 
                        size="small" 
                        variant="text" 
                        color={isOverdue ? 'error' : 'primary'}
                        disabled={remindingId === team.id}
                        onClick={() => handleRemindTeam(team.id)}
                        startIcon={remindingId === team.id ? <CircularProgress size={12} /> : <MailOutlineIcon />}
                        sx={{ fontWeight: 700, fontSize: 12 }}
                      >
                        Send reminder
                      </Button>
                    )}
                  </Box>

                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onClose={() => { setAddOpen(false); setEditingTeam(null); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingTeam ? 'Edit Intake Team' : 'Add Intake Team'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} pt={1}>
            <TextField 
              label="Team Name *" 
              placeholder="e.g. Audit Log Administrators" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              size="small" 
              fullWidth 
            />
            <TextField 
              label="Lead Owner Name *" 
              placeholder="e.g. Dianne Ross" 
              value={leadName} 
              onChange={e => setLeadName(e.target.value)} 
              size="small" 
              fullWidth 
            />
            <TextField 
              label="Lead Owner Email *" 
              placeholder="e.g. d.ross@agency.gov" 
              value={leadEmail} 
              onChange={e => setLeadEmail(e.target.value)} 
              size="small" 
              fullWidth 
            />
            <FormControl fullWidth size="small">
              <InputLabel>Scoped Subject Families</InputLabel>
              <Select
                multiple
                value={families ? families.split(', ') : []}
                onChange={e => {
                  const val = e.target.value;
                  setFamilies(typeof val === 'string' ? val : val.join(', '));
                }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                label="Scoped Subject Families"
              >
                {CONTROL_FAMILIES.map((fam) => (
                  <MenuItem key={fam} value={fam}>
                    {fam}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField 
              label="Deadline Date" 
              type="date"
              value={dueDate} 
              onChange={e => setDueDate(e.target.value)} 
              size="small" 
              fullWidth 
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setAddOpen(false); setEditingTeam(null); }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAddTeam} 
            disabled={saving || !name.trim() || !leadName.trim() || !leadEmail.trim()}
          >
            {saving ? <CircularProgress size={16} color="inherit" /> : (editingTeam ? 'Save Changes' : 'Add Intake Team')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Card Options Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleEditClick}>Edit Team</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>Delete Team</MenuItem>
      </Menu>

    </Box>
  );
}
