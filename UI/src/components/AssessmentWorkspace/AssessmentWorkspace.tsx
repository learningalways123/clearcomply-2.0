import { useState, useEffect, createContext, useContext } from 'react';
import { useParams, useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import DownloadIcon from '@mui/icons-material/Download';

import DashboardIcon from '@mui/icons-material/Dashboard';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CategoryIcon from '@mui/icons-material/Category';
import ShieldIcon from '@mui/icons-material/Shield';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import StorageIcon from '@mui/icons-material/Storage';

import { api } from '../../services/api';
import type { Assessment } from '../../services/api';

import AssessmentDashboard from './AssessmentDashboard';
import AssessmentChecklist from './AssessmentChecklist';
import AssessmentIntake from './AssessmentIntake';
import AssessmentRisk from './AssessmentRisk';
import AssessmentDataCategorization from './AssessmentDataCategorization';
import AssessmentControls from './AssessmentControls';
import AssessmentFindings from './AssessmentFindings';
import AssessmentInventory from './AssessmentInventory';

const DRAWER_WIDTH = 260;

interface WorkspaceContextProps {
  assessment: Assessment | null;
  refreshAssessment: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextProps>({
  assessment: null,
  refreshAssessment: () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

export default function AssessmentWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);

  const fetchAssessment = async () => {
    if (!id) return;
    try {
      const data = await api.getAssessment(id);
      setAssessment(data);
    } catch (e) {
      console.error(e);
      navigate('/assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  const handleRemindAllOverdue = async () => {
    if (!id) return;
    setReminding(true);
    try {
      const res = await api.remindAllOverdue(id);
      alert(res.message || 'Reminders sent successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to send reminders.');
    } finally {
      setReminding(false);
    }
  };

  const handleExportSSP = async () => {
    if (!id) return;
    try {
      const blob = await api.exportPoamXlsx(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SSP-Report-${assessment?.name.replace(/\s+/g, '-') || 'assessment'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      alert('Failed to export SSP.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const completionPct = assessment ? Math.round(assessment.questionStats?.completionPercent ?? 0) : 0;

  const NAV_ITEMS = [
    { label: 'Dashboard', path: `/assessments/${id}/dashboard`, icon: <DashboardIcon /> },
    { label: 'Checklist', path: `/assessments/${id}/checklist`, icon: <PlaylistAddCheckIcon /> },
    { label: 'Team Intake', path: `/assessments/${id}/intake`, icon: <PeopleIcon /> },
    { label: 'Risk Assessment', path: `/assessments/${id}/risk`, icon: <WarningAmberIcon /> },
    { label: 'Data Categorization', path: `/assessments/${id}/data-categorization`, icon: <CategoryIcon /> },
    { label: 'Controls', path: `/assessments/${id}/controls`, icon: <ShieldIcon /> },
    { label: 'Findings', path: `/assessments/${id}/findings`, icon: <AssignmentLateIcon /> },
    { label: 'Inventory', path: `/assessments/${id}/inventory`, icon: <StorageIcon /> },
  ];

  // Map route path to page header title
  const getPageHeaderTitle = () => {
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/checklist')) return 'SSP checklist';
    if (pathname.includes('/intake')) return 'Team intake tracker';
    if (pathname.includes('/risk')) return 'Risk assessment';
    if (pathname.includes('/data-categorization')) return 'Data categorization';
    if (pathname.includes('/controls')) return 'SSP controls grid';
    if (pathname.includes('/findings')) return 'Findings & POA&M';
    if (pathname.includes('/inventory')) return 'System inventory';
    return 'Assessment Detail';
  };

  return (
    <WorkspaceContext.Provider value={{ assessment, refreshAssessment: fetchAssessment }}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f3f4f6' }}>
        
        {/* ── Left Sidebar Drawer ── */}
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid #e5e7eb',
              background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)',
              color: '#f8fafc',
            },
          }}
        >
          {/* Logo / Header */}
          <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                size="small" 
                onClick={() => navigate('/assessments')} 
                sx={{ color: '#94a3b8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <Typography variant="h6" fontWeight={850} letterSpacing={-0.5} sx={{ color: '#fff' }}>
                SSP Builder
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#64748b', ml: 4, fontWeight: 650 }}>
              Clear Comply · v6.0 Draft
            </Typography>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

          {/* Navigation Links */}
          <Box sx={{ px: 1.5, pt: 2, flexGrow: 1 }}>
            <List disablePadding>
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.path;
                return (
                  <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => navigate(item.path)}
                      selected={active}
                      sx={{
                        borderRadius: 2,
                        py: 1,
                        color: active ? '#fff' : '#94a3b8',
                        bgcolor: active ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                        borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                        '&:hover': {
                          bgcolor: active ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255,255,255,0.04)',
                          color: '#fff',
                        },
                        '&.Mui-selected:hover': {
                          bgcolor: 'rgba(99, 102, 241, 0.35)',
                        },
                        '& .MuiListItemIcon-root': {
                          color: active ? '#818cf8' : '#64748b',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        slotProps={{ primary: { fontSize: 13.5, fontWeight: active ? 650 : 500 } }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>

          {/* Bottom Overall Completion Card */}
          <Box sx={{ p: 2, pb: 3 }}>
            <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, display: 'block', mb: 1 }}>
                  Overall completion
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
                  <Typography variant="h4" fontWeight={800} sx={{ color: '#fff', lineHeight: 1 }}>
                    {completionPct}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#4ade80', fontWeight: 600 }}>
                    +3% this week
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={completionPct} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#6366f1' }
                  }} 
                />
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1.5, fontWeight: 500 }}>
                  ATO target: Jul 16, 2026
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Drawer>

        {/* ── Main Workspace Body ── */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
          
          {/* Top Bar Header */}
          <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #e5e7eb', bgcolor: '#fff' }}>
            <Toolbar sx={{ px: 3, py: 1.5 }}>
              <Box>
                <Typography variant="h5" fontWeight={850} letterSpacing={-0.5} sx={{ color: '#0f172a' }}>
                  {getPageHeaderTitle()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 550, display: 'block', mt: 0.25 }}>
                  {assessment?.name} · {assessment?.frameworkIds.join(', ')} equivalent
                </Typography>
              </Box>

              <Box sx={{ flexGrow: 1 }} />

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button 
                  variant="outlined" 
                  color="warning" 
                  size="small"
                  onClick={handleRemindAllOverdue}
                  disabled={reminding}
                  startIcon={<NotificationImportantIcon />}
                  sx={{ borderRadius: 2, px: 2, py: 0.75, fontWeight: 650, fontSize: 13 }}
                >
                  Remind all overdue
                </Button>
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="small"
                  onClick={handleExportSSP}
                  startIcon={<DownloadIcon />}
                  sx={{ borderRadius: 2, px: 2, py: 0.75, fontWeight: 650, fontSize: 13, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
                >
                  Export SSP
                </Button>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Sub-view Content Router */}
          <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AssessmentDashboard />} />
              <Route path="checklist" element={<AssessmentChecklist />} />
              <Route path="intake" element={<AssessmentIntake />} />
              <Route path="risk" element={<AssessmentRisk />} />
              <Route path="data-categorization" element={<AssessmentDataCategorization />} />
              <Route path="controls" element={<AssessmentControls />} />
              <Route path="findings" element={<AssessmentFindings />} />
              <Route path="inventory" element={<AssessmentInventory />} />
            </Routes>
          </Box>
        </Box>

      </Box>
    </WorkspaceContext.Provider>
  );
}
