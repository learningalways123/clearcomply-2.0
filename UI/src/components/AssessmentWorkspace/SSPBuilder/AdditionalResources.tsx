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

const TYPE_OPTS = ['Web Link / URL', 'Corporate File Share', 'Attached Document', 'Policy Reference', 'Other Resource'];

export default function AdditionalResources() {
  const { workbook, updateSection, loading } = useWorkbook();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const resources = workbook?.additionalResources || [];

  const handleResourceChange = (index: number, field: string, value: string) => {
    const nextRes = [...resources];
    nextRes[index] = {
      ...nextRes[index],
      [field]: value
    };
    updateSection('additionalResources', nextRes);
  };

  const addResourceRow = () => {
    const nextRes = [...resources, { title: '', type: '', link: '', description: '' }];
    updateSection('additionalResources', nextRes);
  };

  const removeResourceRow = (index: number) => {
    const nextRes = resources.filter((_: any, i: number) => i !== index);
    updateSection('additionalResources', nextRes);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">Additional Resources</Typography>
        <Typography variant="body2" color="text.secondary">
          Track links to security policies, configurations runbooks, service level agreements, or external vendor documentation.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell width={220}>Document / Resource Title</TableCell>
                  <TableCell width={180}>Resource Type</TableCell>
                  <TableCell width={300}>URL / File Path</TableCell>
                  <TableCell>Detailed Description</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resources.map((res: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Incident Response Procedure"
                        value={res.title || ''}
                        onChange={(e) => handleResourceChange(idx, 'title', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Select
                        fullWidth
                        value={res.type || ''}
                        onChange={(e) => handleResourceChange(idx, 'type', e.target.value)}
                        size="small"
                        variant="standard"
                      >
                        <MenuItem value=""><em>-- Select --</em></MenuItem>
                        {TYPE_OPTS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="https://collab.sharepoint.com/files/ir-plan.pdf"
                        value={res.link || ''}
                        onChange={(e) => handleResourceChange(idx, 'link', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="Explain resource content and relevance to this SSP."
                        value={res.description || ''}
                        onChange={(e) => handleResourceChange(idx, 'description', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>
                      <IconButton color="error" size="small" onClick={() => removeResourceRow(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddIcon />} onClick={addResourceRow} sx={{ mt: 2 }} size="small">
            Add Resource Link
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
