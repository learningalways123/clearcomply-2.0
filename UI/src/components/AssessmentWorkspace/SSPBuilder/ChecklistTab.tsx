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
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

import { useWorkbook } from './WorkbookContext';

const STATUS_OPTS = ['Completed', '* In Progress', '* Required', 'N/A'];

function getStatusChipColor(status: string) {
  if (status === 'Completed') return 'success';
  if (status === '* In Progress') return 'warning';
  if (status === '* Required') return 'error';
  return 'default';
}

export default function ChecklistTab() {
  const { workbook, updateSection, loading } = useWorkbook();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const checklist = workbook?.checklist || [];

  const handleStatusChange = (index: number, value: string) => {
    const nextChecklist = [...checklist];
    nextChecklist[index] = {
      ...nextChecklist[index],
      status: value
    };
    updateSection('checklist', nextChecklist);
  };

  const handleNotesChange = (index: number, value: string) => {
    const nextChecklist = [...checklist];
    nextChecklist[index] = {
      ...nextChecklist[index],
      notes: value
    };
    updateSection('checklist', nextChecklist);
  };

  const completed = checklist.filter((c: any) => c.status === 'Completed').length;
  const total = checklist.length || 1;
  const percent = Math.round((completed / total) * 100);

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">SSP Checklist</Typography>
          <Typography variant="body2" color="text.secondary">
            Coordinate with primary system contact and security analyst to complete each workbook section.
          </Typography>
        </Box>
        <Card sx={{ minWidth: 150, border: '1px solid #e5e7eb', boxShadow: 'none', borderRadius: 2 }}>
          <CardContent sx={{ p: '12px !important', textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={800} color="success.main">{percent}%</Typography>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Tasks Completed ({completed}/{total})
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell><Typography variant="subtitle2" fontWeight={700}>Workbook Task</Typography></TableCell>
                <TableCell width={160}><Typography variant="subtitle2" fontWeight={700}>Status</Typography></TableCell>
                <TableCell width={160}><Typography variant="subtitle2" fontWeight={700}>Primary Resource</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={700}>Status Notes & Evidence</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checklist.map((item: any, idx: number) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>{item.task}</Typography>
                    {item.guidance && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {item.guidance}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      fullWidth
                      value={item.status || ''}
                      onChange={(e) => handleStatusChange(idx, e.target.value)}
                      size="small"
                      displayEmpty
                      renderValue={(selected) => {
                        if (!selected) return <Typography variant="caption" color="text.disabled">-- Select --</Typography>;
                        return <Chip label={selected} color={getStatusChipColor(selected)} size="small" sx={{ fontWeight: 600 }} />;
                      }}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value=""><em>-- Select --</em></MenuItem>
                      {STATUS_OPTS.map(opt => (
                        <MenuItem key={opt} value={opt}>
                          <Chip label={opt} color={getStatusChipColor(opt)} size="small" sx={{ pointerEvents: 'none', fontWeight: 600 }} />
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{item.resource || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      placeholder="Add status notes..."
                      value={item.notes || ''}
                      onChange={(e) => handleNotesChange(idx, e.target.value)}
                      size="small"
                      variant="standard"
                      InputProps={{ disableUnderline: false }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
