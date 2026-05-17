import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, Legend, Cell,
} from 'recharts';

import { api, type DashboardData, type DashboardRisk } from '../../services/api';

// ─── helpers ─────────────────────────────────────────────────────────────────

const CRIT_COLOR: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f97316',
  Low: '#eab308',
};

function critChip(c: string) {
  const colors: Record<string, 'error' | 'warning' | 'default'> = {
    High: 'error',
    Medium: 'warning',
    Low: 'default',
  };
  return <Chip label={c} color={colors[c] ?? 'default'} size="small" />;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, sub, icon, color }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            width: 48, height: 48, borderRadius: 2,
            bgcolor: `${color}18`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Box sx={{ color }}>{icon}</Box>
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700} lineHeight={1}>{value}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{label}</Typography>
          {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <Box mb={2}>
      <Typography variant="h6" fontWeight={700}>{title}</Typography>
      {sub && <Typography variant="body2" color="text.secondary">{sub}</Typography>}
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(e => setError(e?.response?.data?.detail ?? e.message ?? 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  }

  if (!data) return null;

  const riskBarData = [
    { name: 'High', gaps: data.riskGapsByCriticality.High },
    { name: 'Medium', gaps: data.riskGapsByCriticality.Medium },
    { name: 'Low', gaps: data.riskGapsByCriticality.Low },
  ];

  // Shorten assessment names for the trend chart
  const trendData = data.completionTrend.map(t => ({
    ...t,
    shortName: t.name.length > 18 ? t.name.slice(0, 16) + '…' : t.name,
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* ── Page title ── */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>CISO Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Security posture overview across all active assessments
        </Typography>
      </Box>

      {/* ── Stat Cards ── */}
      <Grid container spacing={2} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Total Assessments"
            value={data.totalAssessments}
            icon={<AssessmentIcon />}
            color="#4f46e5"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Avg Completion"
            value={`${data.avgCompletionPercent}%`}
            sub="across all assessments"
            icon={<CheckCircleOutlineIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Total Risk Gaps"
            value={data.totalRiskGaps}
            sub="questions answered No"
            icon={<WarningAmberIcon />}
            color="#f97316"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="High-Risk Gaps"
            value={data.highRiskGaps}
            sub="require immediate action"
            icon={<TrendingUpIcon />}
            color="#ef4444"
          />
        </Grid>
      </Grid>

      {/* ── Charts row ── */}
      <Grid container spacing={3} mb={4}>
        {/* Risk Gaps by Criticality */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <SectionHead
                title="Risk Gaps by Criticality"
                sub="Count of 'No' answers grouped by question criticality"
              />
              {data.totalRiskGaps === 0 ? (
                <Alert severity="success" sx={{ mt: 1 }}>
                  No risk gaps found — all answered questions are compliant.
                </Alert>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={riskBarData} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <RTooltip formatter={(v) => [`${v} gaps`, 'Risk Gaps']} />
                    <Bar dataKey="gaps" radius={[6, 6, 0, 0]}>
                      {riskBarData.map(entry => (
                        <Cell key={entry.name} fill={CRIT_COLOR[entry.name] ?? '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Completion Trend */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <SectionHead
                title="Completion Trend"
                sub="Assessment completion % over time (chronological)"
              />
              {trendData.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1 }}>No assessments yet.</Alert>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                    <RTooltip
                      formatter={(v) => [`${v}%`, 'Completion']}
                      labelFormatter={(_label, payload) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return (payload as any)?.[0]?.payload?.name ?? '';
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="completionPercent"
                      name="Completion %"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Framework Breakdown ── */}
      {data.frameworkBreakdown.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <SectionHead
              title="Framework Breakdown"
              sub="Completion and risk gaps per compliance framework"
            />
            <Grid container spacing={2}>
              {data.frameworkBreakdown.map(fw => (
                <Grid key={fw.frameworkId} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box
                    sx={{
                      p: 2, border: '1px solid #e5e7eb', borderRadius: 2,
                      '&:hover': { borderColor: '#4f46e5', bgcolor: '#f8f7ff' },
                      transition: 'all 0.15s',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} noWrap title={fw.frameworkName}>
                      {fw.frameworkName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fw.assessmentCount} assessment{fw.assessmentCount !== 1 ? 's' : ''}
                    </Typography>
                    <Box mt={1.5}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="text.secondary">Completion</Typography>
                        <Typography variant="caption" fontWeight={600}>{fw.avgCompletionPercent}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={fw.avgCompletionPercent}
                        sx={{
                          height: 6, borderRadius: 3,
                          bgcolor: '#e5e7eb',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: fw.avgCompletionPercent >= 75 ? '#10b981'
                              : fw.avgCompletionPercent >= 40 ? '#f97316'
                              : '#ef4444',
                          },
                        }}
                      />
                    </Box>
                    <Box mt={1} display="flex" alignItems="center" gap={1}>
                      <WarningAmberIcon sx={{ fontSize: 14, color: fw.riskGaps > 0 ? '#ef4444' : '#10b981' }} />
                      <Typography variant="caption" color={fw.riskGaps > 0 ? 'error.main' : 'success.main'}>
                        {fw.riskGaps} risk gap{fw.riskGaps !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* ── Top Outstanding Risks ── */}
      <Card>
        <CardContent>
          <SectionHead
            title="Outstanding Risk Items"
            sub="Questions answered 'No' — sorted by criticality and frequency across assessments"
          />
          {data.topRisks.length === 0 ? (
            <Alert severity="success">
              🎉 No outstanding risks — all yes/no questions are compliant across all assessments.
            </Alert>
          ) : (
            <Box>
              {data.topRisks.map((risk: DashboardRisk, i: number) => (
                <Box key={risk.questionId}>
                  {i > 0 && <Divider sx={{ my: 1.5 }} />}
                  <Box display="flex" alignItems="flex-start" gap={2} py={0.5}>
                    {/* Criticality badge */}
                    <Box sx={{ pt: 0.25, flexShrink: 0 }}>{critChip(risk.criticality)}</Box>

                    {/* Question text */}
                    <Box flex={1} minWidth={0}>
                      <Tooltip title={risk.questionText} placement="top-start">
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {risk.questionText}
                        </Typography>
                      </Tooltip>
                      <Box display="flex" gap={1} mt={0.5} flexWrap="wrap">
                        <Typography variant="caption" color="text.secondary">
                          {risk.familyName}
                        </Typography>
                        {risk.functionName && (
                          <>
                            <Typography variant="caption" color="text.disabled">·</Typography>
                            <Typography variant="caption" color="text.secondary">{risk.functionName}</Typography>
                          </>
                        )}
                        <Typography variant="caption" color="text.disabled">·</Typography>
                        <Typography variant="caption" color="text.secondary">{risk.frameworkId}</Typography>
                      </Box>
                    </Box>

                    {/* Assessment count pill */}
                    <Tooltip title={`Answered 'No' in ${risk.assessmentCount} assessment(s)`}>
                      <Chip
                        label={`${risk.assessmentCount}×`}
                        size="small"
                        sx={{
                          flexShrink: 0,
                          bgcolor: risk.criticality === 'High' ? '#fef2f2' : '#fff7ed',
                          color: risk.criticality === 'High' ? '#ef4444' : '#f97316',
                          fontWeight: 700,
                        }}
                      />
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
