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

const ENV_TYPES = ['Production', 'Staging', 'Test', 'Development', 'Backup / DR', 'Sandbox'];
const YES_NO = ['Yes', 'No'];
const CATEGORIZATIONS = ['Low', 'Moderate', 'High'];

export default function EnvironmentsTab() {
  const { workbook, updateSection, loading } = useWorkbook();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const envs = workbook?.environments || [];

  const handleEnvChange = (index: number, field: string, value: string) => {
    const nextEnvs = [...envs];
    nextEnvs[index] = {
      ...nextEnvs[index],
      [field]: value
    };
    updateSection('environments', nextEnvs);
  };

  const addEnvRow = () => {
    const nextEnvs = [...envs, { type: '', prodData: '', categorization: '', commonName: '', users: '', description: '' }];
    updateSection('environments', nextEnvs);
  };

  const removeEnvRow = (index: number) => {
    const nextEnvs = envs.filter((_: any, i: number) => i !== index);
    updateSection('environments', nextEnvs);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">System Environments</Typography>
        <Typography variant="body2" color="text.secondary">
          Document each environment that supports this system and identify whether production data is present.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell width={160}>Environment Type</TableCell>
                  <TableCell width={120}>Contains Prod Data?</TableCell>
                  <TableCell width={140}>Categorization</TableCell>
                  <TableCell width={160}>Common / DNS Name</TableCell>
                  <TableCell width={140}>Number of Users</TableCell>
                  <TableCell>Detailed Description</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {envs.map((env: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1 }}>
                      <Select
                        fullWidth
                        value={env.type || ''}
                        onChange={(e) => handleEnvChange(idx, 'type', e.target.value)}
                        size="small"
                        variant="standard"
                      >
                        <MenuItem value=""><em>-- Select --</em></MenuItem>
                        {ENV_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Select
                        fullWidth
                        value={env.prodData || ''}
                        onChange={(e) => handleEnvChange(idx, 'prodData', e.target.value)}
                        size="small"
                        variant="standard"
                      >
                        <MenuItem value=""><em>-- Select --</em></MenuItem>
                        {YES_NO.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Select
                        fullWidth
                        value={env.categorization || ''}
                        onChange={(e) => handleEnvChange(idx, 'categorization', e.target.value)}
                        size="small"
                        variant="standard"
                      >
                        <MenuItem value=""><em>-- Select --</em></MenuItem>
                        {CATEGORIZATIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. app-prod.state.mn.us"
                        value={env.commonName || ''}
                        onChange={(e) => handleEnvChange(idx, 'commonName', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. 50 staff"
                        value={env.users || ''}
                        onChange={(e) => handleEnvChange(idx, 'users', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="Hosting details, Azure / AWS zone, DB type, etc."
                        value={env.description || ''}
                        onChange={(e) => handleEnvChange(idx, 'description', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>
                      <IconButton color="error" size="small" onClick={() => removeEnvRow(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddIcon />} onClick={addEnvRow} sx={{ mt: 2 }} size="small">
            Add Environment
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
