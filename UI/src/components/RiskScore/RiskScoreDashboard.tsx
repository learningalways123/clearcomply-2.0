/**
 * RiskScoreDashboard — Phase 2 component showing weighted risk score gauge,
 * domain-level bar chart, and gap summary table.
 */
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import {
  RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, Cell,
} from 'recharts';

import { api } from '../../services/api';
import type { RiskScoreResponse, DomainRiskScore } from '../../services/api';

interface Props {
  assessmentId: string;
}

function riskColor(score: number): string {
  if (score >= 80) return '#059669'; // green
  if (score >= 60) return '#2563eb'; // blue
  if (score >= 40) return '#d97706'; // amber
  if (score >= 20) return '#dc2626'; // red
  return '#7f1d1d';                  // dark red
}

function riskBandChipColor(band: string): 'success' | 'info' | 'warning' | 'error' | 'default' {
  return band === 'Minimal' ? 'success'
       : band === 'Low'     ? 'info'
       : band === 'Medium'  ? 'warning'
       : band === 'High'    ? 'error'
       : 'default';
}

export default function RiskScoreDashboard({ assessmentId }: Props) {
  const [data, setData] = useState<RiskScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getRiskScore(assessmentId)
      .then(setData)
      .catch(e => setError(e?.response?.data?.detail ?? e.message ?? 'Failed to load risk score'))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="warning">{error}</Alert>;
  if (!data)   return null;

  const gaugeData = [{ name: 'Risk Score', value: data.overallScore, fill: riskColor(data.overallScore) }];
  const domainData = data.domainScores.map((d: DomainRiskScore) => ({
    name: d.domain.length > 18 ? d.domain.slice(0, 16) + '…' : d.domain,
    fullName: d.domain,
    score: Math.round(d.score),
    highGaps: d.highGaps,
  }));

  return (
    <Box>
      {/* Overall score gauge + summary */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '0 0 220px' }}>
          <CardContent sx={{ textAlign: 'center', pb: '16px !important' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Overall Risk Score
            </Typography>
            <Box sx={{ height: 180, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%" cy="50%" innerRadius="65%" outerRadius="90%"
                  data={gaugeData} startAngle={225} endAngle={-45}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f3f4f6' }} angleAxisId={0} />
                </RadialBarChart>
              </ResponsiveContainer>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={800} sx={{ color: riskColor(data.overallScore), lineHeight: 1 }}>
                  {Math.round(data.overallScore)}
                </Typography>
                <Typography variant="caption" color="text.secondary">/ 100</Typography>
              </Box>
            </Box>
            <Chip label={data.riskBand} color={riskBandChipColor(data.riskBand)} size="small" sx={{ mt: 0.5 }} />
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Gap Summary</Typography>
            <Divider sx={{ mb: 2 }} />
            {[
              { label: 'High-severity gaps', value: data.highGaps,   color: '#dc2626' },
              { label: 'Medium-severity gaps', value: data.mediumGaps, color: '#d97706' },
              { label: 'Low-severity gaps',  value: data.lowGaps,    color: '#2563eb' },
            ].map(({ label, value, color }) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="h6" fontWeight={700} sx={{ color }}>{value}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Controls assessed</Typography>
              <Typography variant="body2" fontWeight={600}>
                {data.answeredControls} / {data.totalControls}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Domain bar chart */}
      {domainData.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Domain Scores</Typography>
            <Box sx={{ height: Math.max(220, domainData.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainData} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <RechartTooltip
                    formatter={(v, _, entry) => {
                      const p = entry.payload as DomainRiskScore & { fullName: string };
                      return [`${v} (${p.highGaps} high gaps)`, p.fullName];
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {domainData.map((entry, i) => (
                      <Cell key={i} fill={riskColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Domain detail table */}
      {domainData.length > 0 && (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell><Typography variant="caption" fontWeight={700}>Domain</Typography></TableCell>
                  <TableCell align="right"><Typography variant="caption" fontWeight={700}>Score</Typography></TableCell>
                  <TableCell align="right"><Typography variant="caption" fontWeight={700}>High Gaps</Typography></TableCell>
                  <TableCell align="right"><Typography variant="caption" fontWeight={700}>Med Gaps</Typography></TableCell>
                  <TableCell align="right"><Typography variant="caption" fontWeight={700}>Controls</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.domainScores.map(d => (
                  <TableRow key={d.domain} hover>
                    <TableCell><Typography variant="body2">{d.domain}</Typography></TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} sx={{ color: riskColor(d.score) }}>
                        {Math.round(d.score)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: d.highGaps > 0 ? '#dc2626' : 'text.secondary' }}>
                        {d.highGaps}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: d.mediumGaps > 0 ? '#d97706' : 'text.secondary' }}>
                        {d.mediumGaps}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {d.answeredControls}/{d.totalControls}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
