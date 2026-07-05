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
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CircularProgress from '@mui/material/CircularProgress';

import { useWorkbook } from './WorkbookContext';

export default function RevisionHistory() {
  const { workbook, updateSection, loading } = useWorkbook();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const history = workbook?.revisionHistory || [];

  const handleRevisionChange = (index: number, field: string, value: string) => {
    const nextHistory = [...history];
    nextHistory[index] = {
      ...nextHistory[index],
      [field]: value
    };
    updateSection('revisionHistory', nextHistory);
  };

  const addRevisionRow = () => {
    const nextHistory = [...history, { version: '', date: '', author: '', description: '' }];
    updateSection('revisionHistory', nextHistory);
  };

  const removeRevisionRow = (index: number) => {
    const nextHistory = history.filter((_: any, i: number) => i !== index);
    updateSection('revisionHistory', nextHistory);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">Revision History</Typography>
        <Typography variant="body2" color="text.secondary">
          Track major version increments, updates, security reviews, and re-accreditation dates.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell width={120}>Version</TableCell>
                  <TableCell width={150}>Revision Date</TableCell>
                  <TableCell width={200}>Author / Reviewer</TableCell>
                  <TableCell>Summary of Changes</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((rev: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. 1.0, 1.1"
                        value={rev.version || ''}
                        onChange={(e) => handleRevisionChange(idx, 'version', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="YYYY-MM-DD"
                        value={rev.date || ''}
                        onChange={(e) => handleRevisionChange(idx, 'date', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Security Architect"
                        value={rev.author || ''}
                        onChange={(e) => handleRevisionChange(idx, 'author', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Initial draft, updated Firewall ports list"
                        value={rev.description || ''}
                        onChange={(e) => handleRevisionChange(idx, 'description', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>
                      <IconButton color="error" size="small" onClick={() => removeRevisionRow(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddIcon />} onClick={addRevisionRow} sx={{ mt: 2 }} size="small">
            Add Revision Entry
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
