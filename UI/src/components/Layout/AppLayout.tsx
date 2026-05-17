import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';

import AssessmentIcon from '@mui/icons-material/Assessment';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ListAltIcon from '@mui/icons-material/ListAlt';
import HistoryIcon from '@mui/icons-material/History';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';

import { useAuth } from '../../contexts/AuthContext';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Assessments', path: '/assessments', icon: <ListAltIcon /> },
  { label: 'New Assessment', path: '/new-assessment', icon: <AddCircleOutlineIcon /> },
  { label: 'POA\u0026M', path: '/poam', icon: <AssignmentLateIcon /> },
  { label: 'Evidence', path: '/evidence', icon: <FolderIcon /> },
  { label: 'Audit Log', path: '/audit-log', icon: <HistoryIcon /> },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const handleLogout = () => {
    setMenuAnchor(null);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Top bar ── */}
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          ml: `${DRAWER_WIDTH}px`,
          bgcolor: '#ffffff',
          color: 'text.primary',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Toolbar>
          <AssessmentIcon sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ mr: 1 }}>
            ClearComply
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compliance Assessment Platform
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Account">
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} size="small">
              <Avatar
                src={user?.picture}
                sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}
              >
                {!user?.picture && <PersonIcon fontSize="small" />}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            slotProps={{ paper: { elevation: 3, sx: { mt: 1, minWidth: 200 } } }}
          >
            <MenuItem disabled>
              <Typography variant="body2" fontWeight={600}>{user?.name}</Typography>
            </MenuItem>
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary" fontSize={12}>{user?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* ── Sidebar ── */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid #e5e7eb',
            bgcolor: '#fafafa',
          },
        }}
      >
        {/* Spacer to sit below AppBar */}
        <Toolbar />

        <Box sx={{ px: 1, pt: 2 }}>
          <List disablePadding>
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.path || pathname.startsWith(item.path + '/');
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    selected={active}
                    sx={{
                      borderRadius: 2,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: '#fff',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '& .MuiListItemIcon-root': { color: '#fff' },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: active ? 'inherit' : 'text.secondary',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      slotProps={{ primary: { fontSize: 14, fontWeight: active ? 600 : 400 } }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {/* ── Main content ── */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        {children}
      </Box>
    </Box>
  );
}
