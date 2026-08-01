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
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CircularProgress from '@mui/material/CircularProgress';

import { useWorkbook } from './WorkbookContext';

const SCAN_TYPES = [
  'Operating System Vulnerability Scan',
  'Web Application Security Scan (DAST)',
  'Static Application Security Testing (SAST)',
  'Database Vulnerability Scan',
  'Penetration Testing (Internal)',
  'Penetration Testing (External)',
  'Container Image Scan',
  'Other scanning activity'
];

const FREQUENCIES = ['Weekly', 'Monthly', 'Quarterly', 'Semi-Annually', 'Annually', 'Continuous / Triggered', 'One-time'];

export default function ScanningTesting() {
  const { workbook, updateSection, loading } = useWorkbook();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const scans = workbook?.scanning || [];

  const handleScanChange = (index: number, field: string, value: string) => {
    const nextScans = [...scans];
    nextScans[index] = {
      ...nextScans[index],
      [field]: value
    };
    updateSection('scanning', nextScans);
  };

  const addScanRow = () => {
    const nextScans = [...scans, { type: '', tool: '', frequency: '', lastRun: '', scope: '', details: '' }];
    updateSection('scanning', nextScans);
  };

  const removeScanRow = (index: number) => {
    const nextScans = scans.filter((_: any, i: number) => i !== index);
    updateSection('scanning', nextScans);
  };

  const sanitizeTool = (tool: string) => {
    if (!tool) return '';
    let t = tool;
    if (t.toLowerCase().includes('mnit enterprise tenable')) return 'Example: Burp Suite';
    if (t.toLowerCase().includes('mnit enterprise radware')) return 'Example: Burp Suite';
    if (t.toLowerCase().includes('mnit enterprise veracode')) return 'Example: Veracode';
    return t.replace(/MNIT Enterprise\s*/gi, 'Example: ').replace(/MNIT\s*/gi, 'Enterprise ');
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">Scanning & Penetration Testing</Typography>
        <Typography variant="body2" color="text.secondary">
          Document the frequency, tooling, and boundaries of vulnerability scanners, pen tests, and code reviews.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell width={250}>Scan / Review Type</TableCell>
                  <TableCell width={180}>Scanner Tool Used</TableCell>
                  <TableCell width={160}>Frequency</TableCell>
                  <TableCell width={140}>Last Run Date</TableCell>
                  <TableCell width={180}>Scope / Target hosts</TableCell>
                  <TableCell>Results Summary & Mitigation Notes</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scans.map((scan: any, idx: number) => {
                  const displayTool = sanitizeTool(scan.tool || '');
                  return (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1 }}>
                      <Select
                        fullWidth
                        value={scan.type || ''}
                        onChange={(e) => handleScanChange(idx, 'type', e.target.value)}
                        size="small"
                        variant="standard"
                      >
                        <MenuItem value=""><em>-- Select --</em></MenuItem>
                        {SCAN_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Burp Suite, Veracode"
                        value={displayTool}
                        onChange={(e) => handleScanChange(idx, 'tool', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Select
                        fullWidth
                        value={scan.frequency || ''}
                        onChange={(e) => handleScanChange(idx, 'frequency', e.target.value)}
                        size="small"
                        variant="standard"
                      >
                        <MenuItem value=""><em>-- Select --</em></MenuItem>
                        {FREQUENCIES.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="YYYY-MM-DD"
                        value={scan.lastRun || ''}
                        onChange={(e) => handleScanChange(idx, 'lastRun', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Production subnets"
                        value={scan.scope || ''}
                        onChange={(e) => handleScanChange(idx, 'scope', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Clean report; 3 medium findings in backlog"
                        value={scan.details || ''}
                        onChange={(e) => handleScanChange(idx, 'details', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>
                      <IconButton color="error" size="small" onClick={() => removeScanRow(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddIcon />} onClick={addScanRow} sx={{ mt: 2 }} size="small">
            Add Scanning Entry
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
