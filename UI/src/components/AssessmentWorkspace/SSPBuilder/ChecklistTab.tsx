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
import LinearProgress from '@mui/material/LinearProgress';

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

  // Dynamic progress calculator for each checklist task mapping to their SSP sections
  const getSectionProgress = (taskName: string): number => {
    if (!workbook) return 0;
    
    switch (taskName) {
      case 'Application Inventory': {
        const cp = workbook.coverPage || {};
        const fields = [cp.systemName, cp.accreditationBoundary, cp.accreditationDate, cp.accreditationStatus];
        const filled = fields.filter(f => typeof f === 'string' && f.trim() !== '').length;
        return Math.round((filled / fields.length) * 100);
      }
      case 'Step #1 - System Contacts & Data': {
        const ci = workbook.contactsInfo || {};
        const contacts = ci.contacts || [];
        if (contacts.length === 0) return 0;
        const filled = contacts.filter((c: any) => c.name && c.name.trim() !== '').length;
        return Math.round((filled / contacts.length) * 100);
      }
      case 'Application Risk Assessment': {
        const ra = workbook.riskAssessment || {};
        const answers = ra.answers || {};
        const qDefs = ra.questionDefinitions || [];
        if (qDefs.length === 0) return 0;
        const answered = qDefs.filter((q: any) => answers[q.id] && answers[q.id].trim() !== '').length;
        return Math.round((answered / qDefs.length) * 100);
      }
      case 'Vendor Risk Assessment': {
        const ci = workbook.contactsInfo || {};
        const fields = [ci.vendorServices, ci.downtimeTolerance];
        const filled = fields.filter(f => typeof f === 'string' && f.trim() !== '').length;
        return Math.round((filled / fields.length) * 100);
      }
      case 'Data Categorization': {
        const dc = workbook.dataCategorization || {};
        const records = dc.records || [];
        if (records.length === 0) return 0;
        const filled = records.filter((r: any) => r.selection && r.selection.trim() !== '').length;
        return Math.round((filled / records.length) * 100);
      }
      case 'System Environments': {
        const envs = workbook.environments || [];
        if (envs.length === 0) return 0;
        const filled = envs.filter((e: any) => e.type && e.type.trim() !== '').length;
        return Math.round((filled / envs.length) * 100);
      }
      case 'Scanning Strategy ': {
        const scanning = workbook.scanning || [];
        if (scanning.length === 0) return 0;
        const filled = scanning.filter((s: any) => s.tool && s.tool.trim() !== '').length;
        return Math.round((filled / scanning.length) * 100);
      }
      case 'System Inventory': {
        const inv = workbook.inventory || {};
        const hardware = inv.hardware || [];
        const software = inv.software || [];
        const total = hardware.length + software.length;
        if (total === 0) return 0;
        const hwFilled = hardware.filter((h: any) => h.ip && h.ip.trim() !== '').length;
        const swFilled = software.filter((s: any) => s.software && s.software.trim() !== '').length;
        return Math.round(((hwFilled + swFilled) / total) * 100);
      }
      case 'System Diagrams': {
        const diag = workbook.diagrams || {};
        return diag.dfdStored || diag.appAttached ? 100 : 0;
      }
      case 'Controls Assessment': {
        const ctrlDefs = workbook.controlDefinitions || [];
        const ctrlAnswers = workbook.controls || [];
        if (ctrlDefs.length === 0) return 0;
        const selectedControls = ctrlAnswers.filter((c: any) => c.selected);
        const targetList = selectedControls.length > 0 ? selectedControls : ctrlAnswers;
        const denominator = selectedControls.length > 0 ? selectedControls.length : ctrlDefs.length;
        const answered = targetList.filter((c: any) => (c.response && c.response.trim() !== '') || (c.compliant && c.compliant.trim() !== '')).length;
        return Math.min(100, Math.round((answered / denominator) * 100));
      }
      case 'Findings & Policy Exceptions': {
        const extra = workbook.findingsExtra || {};
        const filled = extra.policyExceptions && extra.policyExceptions.trim() !== '' ? 100 : 0;
        return filled;
      }
      case 'Contracts & Data Sharing Agreements': {
        const res = workbook.additionalResources || [];
        if (res.length === 0) return 0;
        const filled = res.filter((r: any) => r.url && r.url.trim() !== '').length;
        return Math.round((filled / res.length) * 100);
      }
      case 'Review & Remediations': {
        const rev = workbook.revisionHistory || [];
        return rev.length > 0 ? 100 : 0;
      }
      default:
        return 0;
    }
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
                <TableCell width={150}><Typography variant="subtitle2" fontWeight={700}>Manual Status</Typography></TableCell>
                <TableCell width={180}><Typography variant="subtitle2" fontWeight={700}>System Progress</Typography></TableCell>
                <TableCell width={160}><Typography variant="subtitle2" fontWeight={700}>Primary Resource</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={700}>Status Notes & Evidence</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checklist.map((item: any, idx: number) => {
                const progPercent = getSectionProgress(item.task);
                return (
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
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" fontWeight={700} color={progPercent === 100 ? 'success.main' : 'text.primary'}>
                            {progPercent}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, fontWeight: 600 }}>
                            {progPercent === 100 ? 'Complete' : progPercent > 0 ? 'In Progress' : 'Not Started'}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={progPercent} 
                          sx={{ 
                            height: 6, 
                            borderRadius: 3, 
                            bgcolor: '#f1f5f9',
                            '& .MuiLinearProgress-bar': { bgcolor: progPercent === 100 ? '#10b981' : '#6366f1' }
                          }} 
                        />
                      </Box>
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
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
