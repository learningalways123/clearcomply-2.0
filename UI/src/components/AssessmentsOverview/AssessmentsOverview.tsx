import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import type { Assessment, Framework } from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function coverageColor(pct: number): 'success' | 'warning' | 'error' {
  if (pct >= 80) return 'success';
  if (pct >= 50) return 'warning';
  return 'error';
}

function frameworkName(id: string, frameworks: Framework[]) {
  return frameworks.find(f => f.id === id)?.name ?? id;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentsOverview() {
  const navigate = useNavigate();

  const fetchAll = useCallback(
    () => Promise.all([api.getAssessments(), api.getFrameworks()]),
    [],
  );
  const { data, loading, error, execute } = useAsync(fetchAll, true);

  const [assessments, frameworks]: [Assessment[], Framework[]] = data ?? [[], []];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Assessments</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and track your compliance assessments
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/new-assessment')}
        >
          New Assessment
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button size="small" onClick={execute}>Retry</Button>
        }>
          {error}
        </Alert>
      )}

      <Card>
        {assessments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No assessments yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first assessment to start tracking compliance.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/new-assessment')}>
              Create Assessment
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  {['Assessment', 'Frameworks', 'Coverage', 'Controls', 'Created', ''].map(h => (
                    <TableCell key={h}>
                      <Typography variant="subtitle2" fontWeight={600}>{h}</Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.map((a) => (
                  <TableRow
                    key={a.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/assessments/${a.id}`)}
                  >
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={500}>{a.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.id.substring(0, 8)}…
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {a.frameworkIds.map(id => (
                          <Chip key={id} label={frameworkName(id, frameworks)} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={a.stats.coveragePercent}
                          color={coverageColor(a.stats.coveragePercent)}
                          sx={{ width: 64, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="body2" fontWeight={500}>
                          {a.stats.coveragePercent.toFixed(1)}%
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {a.stats.selectedControls} / {a.stats.totalControls}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{formatDate(a.createdAt)}</Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={(e) => { e.stopPropagation(); navigate(`/assessments/${a.id}`); }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
