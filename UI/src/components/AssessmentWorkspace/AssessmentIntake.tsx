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
  const [saving, setSaving] = useState(false);

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
    setName('');
    setLeadName('');
    setLeadEmail('');
    setFamilies('');
    setAddOpen(true);
  };

  const handleAddTeam = async () => {
    if (!assessment || !name.trim() || !leadName.trim() || !leadEmail.trim()) return;
    setSaving(true);
    try {
      await api.addIntakeTeam(assessment.id, name, leadName, leadEmail, families);
      setAddOpen(false);
      fetchIntakeTeams();
      alert('New intake team added successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to add intake team.');
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
                    <Chip 
                      label={isComplete ? 'Complete' : isOverdue ? 'Overdue' : 'In Progress'} 
                      size="small"
                      color={isComplete ? 'success' : isOverdue ? 'error' : 'primary'}
                      sx={{ fontWeight: 650, fontSize: 11 }}
                    />
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

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Intake Team</DialogTitle>
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
            <TextField 
              label="Scoped Subject Families" 
              placeholder="e.g. Access Control, Auditing" 
              value={families} 
              onChange={e => setFamilies(e.target.value)} 
              size="small" 
              fullWidth 
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAddTeam} 
            disabled={saving || !name.trim() || !leadName.trim() || !leadEmail.trim()}
          >
            {saving ? <CircularProgress size={16} color="inherit" /> : 'Add Intake Team'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
