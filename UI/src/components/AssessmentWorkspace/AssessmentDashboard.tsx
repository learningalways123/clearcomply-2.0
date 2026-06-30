import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Avatar from '@mui/material/Avatar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GroupIcon from '@mui/icons-material/Group';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';

import { api } from '../../services/api';
import type { IntakeTeam, PoamItem } from '../../services/api';
import { useWorkspace } from './AssessmentWorkspace';

export default function AssessmentDashboard() {
  const { assessment } = useWorkspace();
  const [teams, setTeams] = useState<IntakeTeam[]>([]);
  const [poams, setPoams] = useState<PoamItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!assessment) return;
      try {
        const [teamsData, poamsData] = await Promise.all([
          api.getIntake(assessment.id),
          api.getPoamItems({ assessment_id: assessment.id }),
        ]);
        setTeams(teamsData);
        setPoams(poamsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [assessment]);

  if (loading || !assessment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Calculate dashboard stats
  const answered = assessment.questionStats?.answeredQuestions ?? 0;
  const total = assessment.questionStats?.totalQuestions ?? 0;
  const progressPercent = total > 0 ? Math.round((answered / total) * 100) : 0;

  const completedTeams = teams.filter(t => t.status === 'complete').length;
  const totalTeams = teams.length;

  const openFindings = poams.filter(p => p.status === 'open').length;

  // Static/dynamic family progress data
  const familyProgress = [
    { family: 'Access Control (AC)', completed: 18, total: 22 },
    { family: 'Identification & Auth (IA)', completed: 12, total: 15 },
    { family: 'Audit & Accountability (AU)', completed: 9, total: 14 },
    { family: 'Risk Assessment (RA)', completed: 5, total: 8 },
    { family: 'Incident Response (IR)', completed: 6, total: 10 },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      
      {/* ── Stat Cards ── */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', width: 48, height: 48 }}>
                <CheckCircleOutlineIcon fontSize="medium" />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Controls Complete
                </Typography>
                <Typography variant="h4" fontWeight={850} sx={{ color: '#0f172a', mt: 0.25 }}>
                  {answered}/{total}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {progressPercent}% total progress
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: 48, height: 48 }}>
                <GroupIcon fontSize="medium" />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Teams Responded
                </Typography>
                <Typography variant="h4" fontWeight={850} sx={{ color: '#0f172a', mt: 0.25 }}>
                  {completedTeams}/{totalTeams}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  Active responses tracker
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: 48, height: 48 }}>
                <WarningAmberIcon fontSize="medium" />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Open Findings
                </Typography>
                <Typography variant="h4" fontWeight={850} sx={{ color: '#ef4444', mt: 0.25 }}>
                  {openFindings}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  Requires POA&M mitigation
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: 48, height: 48 }}>
                <QueryBuilderIcon fontSize="medium" />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Days to ATO
                </Typography>
                <Typography variant="h4" fontWeight={850} sx={{ color: '#0f172a', mt: 0.25 }}>
                  17
                </Typography>
                <Typography variant="caption" color="warning.main" fontWeight={650} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Target date: Jul 16
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Main Layout Split ── */}
      <Grid container spacing={3.5}>
        
        {/* Left Side: Family Progress */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ borderRadius: 3, p: 1, border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={750} color="#0f172a" sx={{ mb: 2.5 }}>
                Controls Progress by Family
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {familyProgress.map((item) => {
                  const pct = Math.round((item.completed / item.total) * 100);
                  return (
                    <Box key={item.family}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                        <Typography variant="body2" fontWeight={600} color="#334155">
                          {item.family}
                        </Typography>
                        <Typography variant="body2" fontWeight={650} color="text.secondary">
                          {item.completed}/{item.total} ({pct}%)
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={pct} 
                        sx={{ 
                          height: 7, 
                          borderRadius: 3.5, 
                          bgcolor: '#f1f5f9',
                          '& .MuiLinearProgress-bar': { bgcolor: '#6366f1' }
                        }} 
                      />
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Overdue Teams */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ borderRadius: 3, p: 1, border: '1px solid #e2e8f0', minHeight: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={750} color="#0f172a" sx={{ mb: 2.5 }}>
                Intake Status & Overdue Teams
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {teams.map((t) => (
                  <Box 
                    key={t.id} 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      border: '1px solid #f1f5f9',
                      bgcolor: t.status === 'overdue' ? 'rgba(239, 68, 68, 0.03)' : '#fff',
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      <Typography variant="body2" fontWeight={700} color="#1e293b">
                        {t.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Lead: {t.leadName} · {t.responseRate}% done
                      </Typography>
                    </Box>
                    <Chip 
                      label={t.status === 'complete' ? 'Completed' : t.status === 'overdue' ? 'Overdue' : 'Active'} 
                      size="small"
                      color={t.status === 'complete' ? 'success' : t.status === 'overdue' ? 'error' : 'primary'}
                      variant={t.status === 'complete' ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 650, fontSize: 11 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* ── Recent Findings ── */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Box sx={{ p: 3, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={750} color="#0f172a">
            Recent Open Findings
          </Typography>
          <Chip label={`${openFindings} unresolved findings`} size="small" color="error" sx={{ fontWeight: 650 }} />
        </Box>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer component={Paper} elevation={0} sx={{ border: 'none', borderRadius: 0 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Finding Title</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Severity</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Assigned Owner</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {poams.slice(0, 5).map((row) => (
                  <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{row.title}</TableCell>
                    <TableCell>
                      <Chip 
                        label={row.priority.toUpperCase()} 
                        size="small" 
                        color={row.priority === 'high' ? 'error' : row.priority === 'medium' ? 'warning' : 'default'}
                        sx={{ fontWeight: 700, fontSize: 10, borderRadius: 1.5 }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#475569', fontSize: 13 }}>{row.owner}</TableCell>
                    <TableCell sx={{ color: '#475569', fontSize: 13 }}>{row.dueDate}</TableCell>
                    <TableCell>
                      <Chip 
                        label={row.status === 'open' ? 'Open' : 'Closed'} 
                        size="small"
                        color={row.status === 'open' ? 'warning' : 'success'}
                        variant="outlined"
                        sx={{ fontWeight: 650, fontSize: 11 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {poams.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#64748b' }}>
                      No open findings reported for this assessment.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

    </Box>
  );
}
