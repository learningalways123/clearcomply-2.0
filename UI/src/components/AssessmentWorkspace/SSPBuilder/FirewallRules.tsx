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

const DIRECTIONS = ['Inbound', 'Outbound'];
const PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'TCP/UDP', 'All'];

export default function FirewallRules() {
  const { workbook, updateSection, loading } = useWorkbook();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const firewall = workbook?.firewall || [];

  const handleRuleChange = (index: number, field: string, value: string) => {
    const nextRules = [...firewall];
    nextRules[index] = {
      ...nextRules[index],
      [field]: value
    };
    updateSection('firewall', nextRules);
  };

  const addRuleRow = () => {
    const nextRules = [...firewall, { port: '', protocol: '', source: '', destination: '', direction: '', purpose: '' }];
    updateSection('firewall', nextRules);
  };

  const removeRuleRow = (index: number) => {
    const nextRules = firewall.filter((_: any, i: number) => i !== index);
    updateSection('firewall', nextRules);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">Firewall Planning & Ports</Typography>
        <Typography variant="body2" color="text.secondary">
          Define the network ports, protocols, sources, and destinations required for system operations.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell width={130}>Direction</TableCell>
                  <TableCell width={150}>Source Subnet / Host</TableCell>
                  <TableCell width={150}>Destination Subnet</TableCell>
                  <TableCell width={130}>Port / Range</TableCell>
                  <TableCell width={120}>Protocol</TableCell>
                  <TableCell>Operational Purpose & Rationale</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {firewall.map((rule: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1 }}>
                      <Select
                        fullWidth
                        value={rule.direction || ''}
                        onChange={(e) => handleRuleChange(idx, 'direction', e.target.value)}
                        size="small"
                        variant="standard"
                      >
                        <MenuItem value=""><em>-- Select --</em></MenuItem>
                        {DIRECTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. 10.0.1.0/24, internet"
                        value={rule.source || ''}
                        onChange={(e) => handleRuleChange(idx, 'source', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. App Server Subnet"
                        value={rule.destination || ''}
                        onChange={(e) => handleRuleChange(idx, 'destination', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. 443, 8080-8085"
                        value={rule.port || ''}
                        onChange={(e) => handleRuleChange(idx, 'port', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Select
                        fullWidth
                        value={rule.protocol || ''}
                        onChange={(e) => handleRuleChange(idx, 'protocol', e.target.value)}
                        size="small"
                        variant="standard"
                      >
                        <MenuItem value=""><em>-- Select --</em></MenuItem>
                        {PROTOCOLS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Secure HTTPS traffic from user browser"
                        value={rule.purpose || ''}
                        onChange={(e) => handleRuleChange(idx, 'purpose', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>
                      <IconButton color="error" size="small" onClick={() => removeRuleRow(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddIcon />} onClick={addRuleRow} sx={{ mt: 2 }} size="small">
            Add Firewall Rule
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
