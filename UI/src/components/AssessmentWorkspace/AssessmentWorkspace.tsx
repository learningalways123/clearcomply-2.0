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
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';

import DashboardIcon from '@mui/icons-material/Dashboard';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CategoryIcon from '@mui/icons-material/Category';
import ShieldIcon from '@mui/icons-material/Shield';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import StorageIcon from '@mui/icons-material/Storage';

// Workbook specific icons
import DescriptionIcon from '@mui/icons-material/Description';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import CloudIcon from '@mui/icons-material/Cloud';
import ImageIcon from '@mui/icons-material/Image';
import BugReportIcon from '@mui/icons-material/BugReport';
import RouterIcon from '@mui/icons-material/Router';
import LinkIcon from '@mui/icons-material/Link';
import HistoryIcon from '@mui/icons-material/History';

import { api } from '../../services/api';
import type { Assessment } from '../../services/api';

import AssessmentDashboard from './AssessmentDashboard';
import AssessmentIntake from './AssessmentIntake';
import GlobalSearchDialog from './GlobalSearchDialog';

// SSP Workbook imports
import { WorkbookProvider, useWorkbook } from './SSPBuilder/WorkbookContext';
import CoverPage from './SSPBuilder/CoverPage';
import ChecklistTab from './SSPBuilder/ChecklistTab';
import SystemContacts from './SSPBuilder/SystemContacts';
import RiskAssessmentTab from './SSPBuilder/RiskAssessmentTab';
import DataCategorizationTab from './SSPBuilder/DataCategorizationTab';
import EnvironmentsTab from './SSPBuilder/EnvironmentsTab';
import SystemInventoryTab from './SSPBuilder/SystemInventoryTab';
import SystemDiagrams from './SSPBuilder/SystemDiagrams';
import ScanningTesting from './SSPBuilder/ScanningTesting';
import ControlsAssessment from './SSPBuilder/ControlsAssessment';
import FindingsExceptions from './SSPBuilder/FindingsExceptions';
import FirewallRules from './SSPBuilder/FirewallRules';
import AdditionalResources from './SSPBuilder/AdditionalResources';
import RevisionHistory from './SSPBuilder/RevisionHistory';

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
  return (
    <WorkbookProvider>
      <AssessmentWorkspaceInner />
    </WorkbookProvider>
  );
}

function AssessmentWorkspaceInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Sidebar count indicators
  const [poams, setPoams] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  // Consume SSP Workbook state
  const { workbook } = useWorkbook();

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

  const fetchSidebarData = async () => {
    if (!id) return;
    try {
      const [pm, tm] = await Promise.all([
        api.getPoamItems({ assessment_id: id }),
        api.getIntake(id)
      ]);
      setPoams(pm);
      setTeams(tm);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAssessment();
    fetchSidebarData();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRemindAllOverdue = () => {
    setConfirmOpen(true);
  };

  const confirmRemindAll = async () => {
    if (!id) return;
    setConfirmOpen(false);
    setReminding(true);
    try {
      const res = await api.remindAllOverdue(id);
      alert(res.message || 'Reminders sent successfully!');
      fetchSidebarData();
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

  // Calculate live workbook statistics
  const checklist = workbook?.checklist || [];
  const completedChecklist = checklist.filter((c: any) => c.status === 'Completed').length;
  const totalChecklist = checklist.length || 1;
  const completionPct = Math.round((completedChecklist / totalChecklist) * 100);

  const openFindingsCount = poams.filter(p => p.status === 'open').length;

  const NAV_ITEMS = [
    { label: 'Dashboard', path: `/assessments/${id}/dashboard`, icon: <DashboardIcon /> },
    { label: 'Team Intake', path: `/assessments/${id}/intake`, icon: <PeopleIcon /> },
    { label: '1. Cover Page', path: `/assessments/${id}/cover`, icon: <DescriptionIcon /> },
    { label: '2. Checklist', path: `/assessments/${id}/checklist`, icon: <PlaylistAddCheckIcon />, badge: totalChecklist - completedChecklist, badgeColor: 'warning' as const },
    { label: '3. Contacts & Details', path: `/assessments/${id}/contacts`, icon: <ContactMailIcon /> },
    { label: '4. Risk Assessment', path: `/assessments/${id}/risk`, icon: <WarningAmberIcon /> },
    { label: '5. Data Categorization', path: `/assessments/${id}/data-categorization`, icon: <CategoryIcon /> },
    { label: '6. Environments', path: `/assessments/${id}/environments`, icon: <CloudIcon /> },
    { label: '7. System Inventory', path: `/assessments/${id}/inventory`, icon: <StorageIcon /> },
    { label: '8. System Diagrams', path: `/assessments/${id}/diagrams`, icon: <ImageIcon /> },
    { label: '9. Scanning & Testing', path: `/assessments/${id}/scanning`, icon: <BugReportIcon /> },
    { label: '10. Controls Assessment', path: `/assessments/${id}/controls`, icon: <ShieldIcon /> },
    { label: '11. Findings & POAM', path: `/assessments/${id}/findings`, icon: <AssignmentLateIcon />, badge: openFindingsCount, badgeColor: 'error' as const },
    { label: '12. Firewall Planning', path: `/assessments/${id}/firewall`, icon: <RouterIcon /> },
    { label: '13. Additional Resources', path: `/assessments/${id}/resources`, icon: <LinkIcon /> },
    { label: '14. Revision History', path: `/assessments/${id}/revision`, icon: <HistoryIcon /> },
  ];

  // Dynamic Countdown (Target Date: Jul 16, 2026)
  const targetDate = new Date('2026-07-16T00:00:00');
  const getAtoCountdown = () => {
    const now = new Date();
    targetDate.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diffTime = targetDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const daysToAto = getAtoCountdown();
  const getAtoStyle = (days: number) => {
    if (days <= 7) return { color: '#ef4444', label: `${days} days left (Critical)` };
    if (days <= 30) return { color: '#fbbf24', label: `${days} days to target` };
    return { color: '#4ade80', label: `${days} days to target` };
  };
  const atoStyle = getAtoStyle(daysToAto);
  const projectedCompletion = Math.min(100, Math.round(completionPct + (daysToAto * 1.1)));
  const overdueTeams = teams.filter(t => t.status === 'overdue');

  const getPageHeaderTitle = () => {
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/intake')) return 'Team intake tracker';
    if (pathname.includes('/cover')) return 'Cover Page';
    if (pathname.includes('/checklist')) return 'SSP checklist';
    if (pathname.includes('/contacts')) return 'System Contacts';
    if (pathname.includes('/risk')) return 'Risk assessment';
    if (pathname.includes('/data-categorization')) return 'Data categorization';
    if (pathname.includes('/environments')) return 'System Environments';
    if (pathname.includes('/inventory')) return 'System inventory';
    if (pathname.includes('/diagrams')) return 'System Diagrams';
    if (pathname.includes('/scanning')) return 'Scanning & Testing';
    if (pathname.includes('/controls')) return 'Controls Assessment';
    if (pathname.includes('/findings')) return 'Findings & exceptions';
    if (pathname.includes('/firewall')) return 'Firewall rules';
    if (pathname.includes('/resources')) return 'Additional Resources';
    if (pathname.includes('/revision')) return 'Revision history';
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
                onClick={() => {
                  if (assessment?.projectId) {
                    navigate(`/projects/${assessment.projectId}`);
                  } else {
                    navigate('/projects');
                  }
                }} 
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
          <Box sx={{ px: 1.5, pt: 2, flexGrow: 1, overflowY: 'auto' }}>
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
                        slotProps={{ primary: { fontSize: 13, fontWeight: active ? 650 : 500 } }}
                      />
                      {item.badge !== undefined && item.badge > 0 && (
                        <Chip
                          label={item.badge}
                          size="small"
                          color={item.badgeColor}
                          sx={{ 
                            height: 18, 
                            minWidth: 18, 
                            fontSize: 10, 
                            fontWeight: 800, 
                            borderRadius: '9px',
                            px: 0.5 
                          }}
                        />
                      )}
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
                <Tooltip 
                  title={`At current pace, you'll reach ${projectedCompletion}% by the target date.`} 
                  placement="top" 
                  arrow
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: atoStyle.color, 
                      display: 'block', 
                      mt: 1.5, 
                      fontWeight: 700,
                      cursor: 'help'
                    }}
                  >
                    ⚠️ {atoStyle.label}
                  </Typography>
                </Tooltip>
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
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Tooltip title="Global Search (Cmd+K)" arrow>
                  <IconButton 
                    onClick={() => setSearchOpen(true)}
                    sx={{ 
                      color: '#475569', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 2, 
                      p: 1, 
                      mr: 0.5,
                      '&:hover': { bgcolor: '#f8fafc' } 
                    }}
                  >
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Button 
                  variant="outlined" 
                  color="warning" 
                  size="small"
                  onClick={handleRemindAllOverdue}
                  disabled={reminding || overdueTeams.length === 0}
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
              <Route path="intake" element={<AssessmentIntake />} />
              <Route path="cover" element={<CoverPage />} />
              <Route path="checklist" element={<ChecklistTab />} />
              <Route path="contacts" element={<SystemContacts />} />
              <Route path="risk" element={<RiskAssessmentTab />} />
              <Route path="data-categorization" element={<DataCategorizationTab />} />
              <Route path="environments" element={<EnvironmentsTab />} />
              <Route path="inventory" element={<SystemInventoryTab />} />
              <Route path="diagrams" element={<SystemDiagrams />} />
              <Route path="scanning" element={<ScanningTesting />} />
              <Route path="controls" element={<ControlsAssessment />} />
              <Route path="findings" element={<FindingsExceptions />} />
              <Route path="firewall" element={<FirewallRules />} />
              <Route path="resources" element={<AdditionalResources />} />
              <Route path="revision" element={<RevisionHistory />} />
            </Routes>
          </Box>
        </Box>

        {/* Global Search Dialog */}
        {id && (
          <GlobalSearchDialog 
            open={searchOpen} 
            onClose={() => setSearchOpen(false)} 
            assessmentId={id} 
          />
        )}

        {/* Remind All Overdue Confirmation Dialog */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Send Overdue Reminders?</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: 14, mb: 2 }}>
              You are about to send response sweep emails to all intake teams who are currently overdue.
            </DialogContentText>
            {overdueTeams.length > 0 ? (
              <Box sx={{ bgcolor: 'rgba(239, 68, 68, 0.04)', p: 2, borderRadius: 2, border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <Typography variant="caption" fontWeight={700} color="error.main" sx={{ display: 'block', mb: 1 }}>
                  THE FOLLOWING TEAMS WILL BE NOTIFIED:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                  {overdueTeams.map(t => (
                    <li key={t.id} style={{ color: '#1e293b', fontWeight: 600, marginBottom: 4 }}>
                      {t.name} (Lead: {t.leadName})
                    </li>
                  ))}
                </ul>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No teams are currently overdue.
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              color="warning" 
              onClick={confirmRemindAll} 
              disabled={overdueTeams.length === 0}
            >
              Send Reminders
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </WorkspaceContext.Provider>
  );
}
