import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

import { useWorkbook } from './WorkbookContext';
import { api } from '../../../services/api';
import type { PoamItem } from '../../../services/api';

function getPriorityColor(p: string) {
  if (p === 'high') return 'error';
  if (p === 'medium') return 'warning';
  return 'info';
}

export default function FindingsExceptions() {
  const { workbook, updateSection, loading: wbLoading } = useWorkbook();
  const [poamItems, setPoamItems] = useState<PoamItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workbook) return;
    setLoading(true);
    api.getPoamItems({ assessment_id: workbook.assessmentId })
      .then(items => setPoamItems(items))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [workbook?.assessmentId]);

  if (wbLoading || loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const fe = workbook?.findingsExtra || { activeExceptions: '' };

  const handleExceptionsChange = (value: string) => {
    updateSection('findingsExtra', {
      ...fe,
      activeExceptions: value
    });
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">Findings & Policy Exceptions</Typography>
        <Typography variant="body2" color="text.secondary">
          Track discovered gaps, plan of action and milestones (POA&M) targets, and active security policy exceptions.
        </Typography>
      </Box>

      {/* Part 1: Active POA&M Findings */}
      <Card sx={{ mb: 4, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Active POA&M Findings</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These findings are synchronized directly from your project's POA&M dashboard.
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>ID / Title</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {poamItems.length > 0 ? (
                  poamItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" fontWeight={700}>{item.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {item.description || 'No description provided.'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip label={item.priority.toUpperCase()} color={getPriorityColor(item.priority)} size="small" sx={{ fontWeight: 700, fontSize: 10 }} />
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Typography variant="body2">{item.dueDate || '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Typography variant="body2">{item.owner || 'Unassigned'}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Chip label={item.status.replace('_', ' ').toUpperCase()} variant="outlined" size="small" sx={{ fontWeight: 700, fontSize: 10 }} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary">No active POA&M findings recorded for this project.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Part 2: Active Security Policy Exceptions */}
      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Active Security Policy Exceptions</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Record approved agency security exceptions, policy deviations, or accepted risk agreements.
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={8}
            label="Exceptions Narrative & Approvals"
            helperText="Include policy code, date approved, expiration date, business justification, and mitigation details."
            placeholder="e.g. Exception 2026-004: MFA on internal administration bypass due to offline system state. Approved by Agency CISO on 2026-01-15. Expiration: 2027-01-15."
            value={fe.activeExceptions || ''}
            onChange={(e) => handleExceptionsChange(e.target.value)}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
