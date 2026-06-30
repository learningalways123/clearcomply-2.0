import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import ShieldIcon from '@mui/icons-material/Shield';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import { api } from '../../services/api';
import type { RiskQuestion } from '../../services/api';
import { useWorkspace } from './AssessmentWorkspace';

export default function AssessmentRisk() {
  const { assessment } = useWorkspace();
  const [questions, setQuestions] = useState<RiskQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRiskData = async () => {
      if (!assessment) return;
      try {
        const data = await api.getRiskQuestions(assessment.id);
        setQuestions(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadRiskData();
  }, [assessment]);

  if (loading || !assessment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Calculate stats
  const totalMissed = questions.reduce((sum, q) => sum + q.pointsMissed, 0);
  const complianceScore = Math.max(100 - totalMissed, 0);

  // Risk Rating Level
  const getRiskLevel = (score: number) => {
    if (score >= 85) return { label: 'Low Compliance Risk', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    if (score >= 70) return { label: 'Medium Compliance Risk', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    return { label: 'High Compliance Risk', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
  };

  const riskLevel = getRiskLevel(complianceScore);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      
      {/* ── Summary Overview cards ── */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: riskLevel.bg, boxShadow: 'none' }}>
            <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <ErrorOutlineIcon sx={{ color: riskLevel.color, fontSize: 40 }} />
              <Box>
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 650 }}>
                  Compliance Risk Level
                </Typography>
                <Typography variant="h6" fontWeight={850} sx={{ color: riskLevel.color, mt: 0.25 }}>
                  {riskLevel.label}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <ShieldIcon sx={{ color: '#6366f1', fontSize: 40 }} />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={650}>
                  Weighted Compliance Score
                </Typography>
                <Typography variant="h4" fontWeight={850} sx={{ color: '#0f172a', mt: 0.25 }}>
                  {complianceScore} / 100
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', bgcolor: 'rgba(239, 68, 68, 0.1)' }}>
                <Typography fontWeight={800} color="#ef4444">!</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={650}>
                  Total Missed Points
                </Typography>
                <Typography variant="h4" fontWeight={850} sx={{ color: '#ef4444', mt: 0.25 }}>
                  -{totalMissed}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Detailed Risk Questions Table ── */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Box sx={{ p: 3, pb: 1 }}>
          <Typography variant="subtitle1" fontWeight={750} color="#0f172a">
            Risk Assessment Framework Questions
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Specific questions driving compliance risk metrics based on intake inputs.
          </Typography>
        </Box>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer component={Paper} elevation={0} sx={{ border: 'none', borderRadius: 0 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', width: '50%' }}>Risk Parameter / Question</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Mapped Control</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Response Value</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Points Missed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {questions.map((row) => (
                  <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{row.questionText}</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: '#6366f1' }}>{row.mappedControl || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={row.response} 
                        size="small" 
                        color={row.response === 'Full' ? 'success' : row.response === 'Partial' ? 'warning' : row.response === 'N/A' ? 'default' : 'error'}
                        sx={{ fontWeight: 700, fontSize: 11, borderRadius: 1.5 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 750, color: row.pointsMissed > 0 ? '#ef4444' : '#10b981' }}>
                      {row.pointsMissed > 0 ? `+${row.pointsMissed}` : '0'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

    </Box>
  );
}
