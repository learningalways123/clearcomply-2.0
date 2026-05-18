/**
 * CsfProfile — Phase 2 component for viewing/editing NIST CSF 2.0 function
 * tier profiles (Identify, Protect, Detect, Respond, Recover, Govern).
 */
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Snackbar from '@mui/material/Snackbar';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend,
} from 'recharts';

import { api } from '../../services/api';
import type { CsfFunctionProfile, CsfProfileResponse } from '../../services/api';

interface Props {
  assessmentId: string;
}

const DEFAULT_FUNCTIONS: CsfFunctionProfile[] = [
  { functionId: 'GV', functionName: 'Govern',   currentTier: 1, targetTier: 3 },
  { functionId: 'ID', functionName: 'Identify',  currentTier: 1, targetTier: 3 },
  { functionId: 'PR', functionName: 'Protect',   currentTier: 1, targetTier: 3 },
  { functionId: 'DE', functionName: 'Detect',    currentTier: 1, targetTier: 3 },
  { functionId: 'RS', functionName: 'Respond',   currentTier: 1, targetTier: 3 },
  { functionId: 'RC', functionName: 'Recover',   currentTier: 1, targetTier: 3 },
];

const TIER_MARKS = [1, 2, 3, 4].map(v => ({ value: v, label: `T${v}` }));

const TIER_LABELS: Record<number, string> = {
  1: 'Partial',
  2: 'Risk Informed',
  3: 'Repeatable',
  4: 'Adaptive',
};

export default function CsfProfile({ assessmentId }: Props) {
  const [profiles, setProfiles] = useState<CsfFunctionProfile[]>(DEFAULT_FUNCTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getCsfProfile(assessmentId)
      .then((res: CsfProfileResponse) => {
        if (res.profiles.length > 0) setProfiles(res.profiles);
      })
      .catch(() => { /* use defaults */ })
      .finally(() => setLoading(false));
  }, [assessmentId]);

  const handleChange = (functionId: string, field: 'currentTier' | 'targetTier', value: number) => {
    setProfiles(prev => prev.map(p => p.functionId === functionId ? { ...p, [field]: value } : p));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.upsertCsfProfile(assessmentId, profiles);
      if (res.profiles.length > 0) setProfiles(res.profiles);
      setToast('CSF Profile saved successfully');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  const radarData = profiles.map(p => ({
    subject: p.functionName,
    Current: p.currentTier,
    Target: p.targetTier,
  }));

  const gapCount = profiles.filter(p => p.currentTier < p.targetTier).length;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
        {/* Radar chart */}
        <Card sx={{ flex: '0 0 340px' }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              CSF 2.0 Function Tiers
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 4]} tickCount={5} tick={{ fontSize: 10 }} />
                  <Radar name="Current" dataKey="Current" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                  <Radar name="Target"  dataKey="Target"  stroke="#059669" fill="#059669" fillOpacity={0.15} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Gap summary */}
        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Profile Summary</Typography>
            <Divider sx={{ mb: 2 }} />
            {[
              { label: 'Functions with gaps',   value: gapCount, color: gapCount > 0 ? '#dc2626' : '#059669' },
              { label: 'Functions at target',   value: profiles.filter(p => p.currentTier >= p.targetTier).length, color: '#059669' },
              { label: 'Avg current tier',      value: (profiles.reduce((s, p) => s + p.currentTier, 0) / profiles.length).toFixed(1), color: '#2563eb' },
              { label: 'Avg target tier',       value: (profiles.reduce((s, p) => s + p.targetTier,  0) / profiles.length).toFixed(1), color: '#7c3aed' },
            ].map(({ label, value, color }) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="h6" fontWeight={700} sx={{ color }}>{value}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>

      {/* Per-function tier sliders */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Adjust Tiers
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Tier 1 = Partial · Tier 2 = Risk Informed · Tier 3 = Repeatable · Tier 4 = Adaptive
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 3 }}>
            {profiles.map(p => (
              <Box key={p.functionId}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip label={p.functionId} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700 }} />
                  <Typography variant="body2" fontWeight={600}>{p.functionName}</Typography>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Current tier: <strong>{TIER_LABELS[p.currentTier]}</strong>
                </Typography>
                <Slider
                  value={p.currentTier}
                  min={1} max={4} step={1}
                  marks={TIER_MARKS}
                  onChange={(_, v) => handleChange(p.functionId, 'currentTier', v as number)}
                  color="primary"
                  size="small"
                  sx={{ mb: 1 }}
                />

                <Typography variant="caption" color="text.secondary">
                  Target tier: <strong>{TIER_LABELS[p.targetTier]}</strong>
                </Typography>
                <Slider
                  value={p.targetTier}
                  min={1} max={4} step={1}
                  marks={TIER_MARKS}
                  onChange={(_, v) => handleChange(p.functionId, 'targetTier', v as number)}
                  color="success"
                  size="small"
                />

                {p.currentTier < p.targetTier && (
                  <Typography variant="caption" sx={{ color: '#d97706' }}>
                    Gap: {p.targetTier - p.currentTier} tier{p.targetTier - p.currentTier > 1 ? 's' : ''}
                  </Typography>
                )}
                {p.currentTier >= p.targetTier && (
                  <Typography variant="caption" sx={{ color: '#059669' }}>✓ At or above target</Typography>
                )}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? 'Saving…' : 'Save CSF Profile'}
        </Button>
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast} />
    </Box>
  );
}
