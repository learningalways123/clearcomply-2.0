// Sidebar summary card for the New Assessment wizard.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import AssessmentIcon from '@mui/icons-material/Assessment';

import type { Framework, Module, Family } from '../../services/api';

interface Props {
  name: string;
  selectedFrameworks: Framework[];
  totalControls: number;
  selectedControls: number;
  selectedFamilies: Family[];
  selectedModules: Module[];
  totalQuestions: number;
  creating: boolean;
  onSubmit: () => void;
}

function StatRow({ label, value, color = 'text.primary' }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={700} color={color}>{value}</Typography>
    </Box>
  );
}

export default function SummaryPanel({
  name, selectedFrameworks, totalControls, selectedControls,
  selectedFamilies, selectedModules, totalQuestions, creating, onSubmit,
}: Props) {
  const isNist = selectedFrameworks.some(f => f.id === 'NIST-800-53');
  const isCsf = selectedFrameworks.some(f => f.id === 'NIST-CSF-2.0');
  const coveragePct = totalControls > 0
    ? Math.round((selectedControls / totalControls) * 1000) / 10
    : 0;

  const canSubmit = name.trim().length > 0 && selectedFrameworks.length > 0;

  return (
    <Card sx={{ position: 'sticky', top: 80 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Summary</Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">Name</Typography>
          <Typography variant="body1" fontWeight={500}>{name || '—'}</Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">Frameworks</Typography>
          <Typography variant="body1">
            {selectedFrameworks.length > 0 ? selectedFrameworks.map(f => f.name).join(', ') : 'None'}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <StatRow label="Total Controls" value={totalControls} color="primary.main" />
        <StatRow label="Selected Controls" value={selectedControls} color="success.main" />
        <StatRow label="Coverage" value={`${coveragePct}%`} color="warning.main" />

        {isNist && (
          <>
            <Divider sx={{ my: 2 }} />
            <StatRow label="Selected Families" value={selectedFamilies.length} color="secondary.main" />
          </>
        )}

        {isCsf && (
          <>
            <Divider sx={{ my: 2 }} />
            <StatRow label="Selected Modules" value={selectedModules.length} color="secondary.main" />
          </>
        )}

        {(selectedFamilies.length > 0 || selectedModules.length > 0) && (
          <StatRow label="Total Questions" value={totalQuestions} color="info.main" />
        )}

        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <AssessmentIcon />}
          onClick={onSubmit}
          disabled={creating || !canSubmit}
          sx={{ mt: 1 }}
        >
          {creating ? 'Creating…' : 'Create Assessment'}
        </Button>
      </CardContent>
    </Card>
  );
}
