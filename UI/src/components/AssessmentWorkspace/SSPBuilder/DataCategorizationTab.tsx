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

const LEVELS = ['Low', 'Moderate', 'High'];
const YES_NO = ['Yes', 'No'];

export default function DataCategorizationTab() {
  const { workbook, updateSection, loading } = useWorkbook();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const dc = workbook?.dataCategorization || {
    dataTypes: [],
    impacts: []
  };

  const handleDataTypeChange = (index: number, field: string, value: string) => {
    const nextTypes = [...(dc.dataTypes || [])];
    nextTypes[index] = {
      ...nextTypes[index],
      [field]: value
    };
    updateSection('dataCategorization', {
      ...dc,
      dataTypes: nextTypes
    });
  };

  const addDataTypeRow = () => {
    const nextTypes = [...(dc.dataTypes || []), { description: '', categorization: '' }];
    updateSection('dataCategorization', {
      ...dc,
      dataTypes: nextTypes
    });
  };

  const removeDataTypeRow = (index: number) => {
    const nextTypes = (dc.dataTypes || []).filter((_: any, i: number) => i !== index);
    updateSection('dataCategorization', {
      ...dc,
      dataTypes: nextTypes
    });
  };

  const handleImpactChange = (index: number, field: string, value: string) => {
    const nextImpacts = [...(dc.impacts || [])];
    nextImpacts[index] = {
      ...nextImpacts[index],
      [field]: value
    };
    updateSection('dataCategorization', {
      ...dc,
      impacts: nextImpacts
    });
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">Data Categorization</Typography>
        <Typography variant="body2" color="text.secondary">
          Identify all sensitive data elements hosted in the system and define their FIPS-199 impact profiles.
        </Typography>
      </Box>

      {/* Part 1: Sensitive Data Elements */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Sensitive Data Elements</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Declare the classes of information processed by the system (e.g. Social Security Numbers, Medical Records, CJIS, FERPA).
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Sensitive Data / Record Element Description</TableCell>
                  <TableCell width={200}>Security Categorization</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(dc.dataTypes || []).map((dt: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Tax return data, home address list"
                        value={dt.description || ''}
                        onChange={(e) => handleDataTypeChange(idx, 'description', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Select
                        fullWidth
                        value={dt.categorization || ''}
                        onChange={(e) => handleDataTypeChange(idx, 'categorization', e.target.value)}
                        size="small"
                        variant="standard"
                      >
                        <MenuItem value=""><em>-- Select --</em></MenuItem>
                        {LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>
                      <IconButton color="error" size="small" onClick={() => removeDataTypeRow(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddIcon />} onClick={addDataTypeRow} sx={{ mt: 2 }} size="small">
            Add Sensitive Data Element
          </Button>
        </CardContent>
      </Card>

      {/* Part 2: Security Impact Profiles */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Security Impact Categorization Questions</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Complete the questions below to justify the confidentiality, integrity, and availability categorizations.
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Impact Variable / Question</TableCell>
                  <TableCell width={150}>Yes / No</TableCell>
                  <TableCell>Categorization Justification / Narrative</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(dc.impacts || []).map((imp: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1.5, verticalAlign: 'top', fontWeight: 600 }}>
                      {imp.name}
                    </TableCell>
                    <TableCell sx={{ py: 1, verticalAlign: 'top' }}>
                      <Select
                        fullWidth
                        value={imp.yesNo || ''}
                        onChange={(e) => handleImpactChange(idx, 'yesNo', e.target.value)}
                        size="small"
                      >
                        <MenuItem value=""><em>-- Select --</em></MenuItem>
                        {YES_NO.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ py: 1, verticalAlign: 'top' }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Provide details/rationale..."
                        value={imp.description || ''}
                        onChange={(e) => handleImpactChange(idx, 'description', e.target.value)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
