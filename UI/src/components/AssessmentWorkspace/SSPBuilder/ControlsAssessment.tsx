import { useEffect, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';

import { useWorkbook } from './WorkbookContext';

const COMPLIANT_OPTS = ['Full', 'Partial', 'None', 'N/A'];
const ATTESTATION_OPTS = [
  '*Attestation Required',
  'Verbal or written claim of compliance received',
  'Evidence/proof of compliance received'
];

function getStatusColor(status: string) {
  if (status === 'Full') return 'success';
  if (status === 'Partial') return 'warning';
  if (status === 'None') return 'error';
  if (status === 'N/A') return 'info';
  return 'default';
}

export default function ControlsAssessment() {
  const { workbook, updateSection, loading: wbLoading } = useWorkbook();
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [selectedControl, setSelectedControl] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Read controls from workbook definitions
  const controlsList = useMemo(() => {
    return workbook?.controlDefinitions || [];
  }, [workbook?.controlDefinitions]);

  // Compute unique families
  const familiesList = useMemo(() => {
    const fams = new Set<string>();
    controlsList.forEach((c: any) => {
      if (c.family) fams.add(c.family);
    });
    return Array.from(fams).sort();
  }, [controlsList]);

  // Filtered controls
  const filteredControls = useMemo(() => {
    if (!selectedFamily) return controlsList;
    return controlsList.filter((c: any) => c.family === selectedFamily);
  }, [controlsList, selectedFamily]);

  // Set default selected control
  useEffect(() => {
    if (filteredControls.length > 0) {
      // Keep current if it is in the filtered list, otherwise take the first
      const exists = filteredControls.some((c: any) => c.id === selectedControl?.id);
      if (!exists) {
        setSelectedControl(filteredControls[0]);
      }
    } else {
      setSelectedControl(null);
    }
  }, [filteredControls]);

  useEffect(() => {
    if (workbook?.controlDefinitions) {
      setLoading(false);
    }
  }, [workbook]);

  if (wbLoading || loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const wbControls = workbook?.controls || [];

  const getControlWbData = (ctrlId: string) => {
    return wbControls.find((c: any) => c.id === ctrlId) || {
      id: ctrlId,
      response: '',
      compliant: '',
      attestation: '',
      attestationDesc: '',
      reviewDate: '',
      remediationPlan: '',
      contact: ''
    };
  };

  const handleWbDataChange = (ctrlId: string, field: string, value: string) => {
    const nextControls = [...wbControls];
    const idx = nextControls.findIndex((c: any) => c.id === ctrlId);
    const updatedObj = getControlWbData(ctrlId);
    
    const newObj = {
      ...updatedObj,
      [field]: value
    };

    if (idx >= 0) {
      nextControls[idx] = newObj;
    } else {
      nextControls.push(newObj);
    }

    updateSection('controls', nextControls);
  };

  const currentWb = selectedControl ? getControlWbData(selectedControl.id) : null;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">Controls Assessment</Typography>
        <Typography variant="body2" color="text.secondary">
          Describe the implementation details, parameters, and control narratives for each security control.
        </Typography>
      </Box>

      {/* Filter by Family */}
      <Box sx={{ mb: 3, maxWidth: 400 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Filter by Control Family</InputLabel>
          <Select
            label="Filter by Control Family"
            value={selectedFamily}
            onChange={(e) => setSelectedFamily(e.target.value)}
          >
            <MenuItem value="">All Families</MenuItem>
            {familiesList.map(fam => (
              <MenuItem key={fam} value={fam}>{fam}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Sidebar Controls List */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 2, maxHeight: 650, overflow: 'auto', border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <List disablePadding>
              {filteredControls.map((ctrl) => {
                const data = getControlWbData(ctrl.id);
                return (
                  <ListItemButton
                    key={ctrl.id}
                    selected={selectedControl?.id === ctrl.id}
                    onClick={() => setSelectedControl(ctrl)}
                    divider
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '& .MuiListItemText-secondary': { color: 'primary.contrastText' }
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight={700}>
                            {ctrl.id}
                          </Typography>
                          <Chip 
                            label={data.compliant || 'None'} 
                            color={getStatusColor(data.compliant)} 
                            size="small" 
                            sx={{ fontSize: 9, height: 16, fontWeight: 700 }} 
                          />
                        </Box>
                      }
                      secondary={
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {ctrl.name}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Card>
        </Grid>

        {/* Selected Control Detail / Editor */}
        <Grid size={{ xs: 12, md: 8 }}>
          {selectedControl && currentWb ? (
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ display: 'block', mb: 0.5 }}>
                    {selectedControl.family} &bull; {selectedControl.id}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedControl.name}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                    {selectedControl.detail}
                  </Typography>
                </Box>

                {selectedControl.responseGuidance && (
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    <strong>Response Guidance:</strong> {selectedControl.responseGuidance}
                  </Alert>
                )}

                <Divider />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Compliance Status</InputLabel>
                      <Select
                        label="Compliance Status"
                        value={currentWb.compliant || ''}
                        onChange={(e) => handleWbDataChange(selectedControl.id, 'compliant', e.target.value)}
                      >
                        {COMPLIANT_OPTS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Attestation Method</InputLabel>
                      <Select
                        label="Attestation Method"
                        value={currentWb.attestation || ''}
                        onChange={(e) => handleWbDataChange(selectedControl.id, 'attestation', e.target.value)}
                      >
                        {ATTESTATION_OPTS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Attestation Details / Evidence Reference"
                      value={currentWb.attestationDesc || ''}
                      onChange={(e) => handleWbDataChange(selectedControl.id, 'attestationDesc', e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Review Date"
                      placeholder="e.g. 2026-07-01"
                      value={currentWb.reviewDate || ''}
                      onChange={(e) => handleWbDataChange(selectedControl.id, 'reviewDate', e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Responsible Contact"
                      placeholder="e.g. Dianne Ross"
                      value={currentWb.contact || ''}
                      onChange={(e) => handleWbDataChange(selectedControl.id, 'contact', e.target.value)}
                    />
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Implementation Narrative / Response"
                  placeholder="Explain how the system meets the control requirement..."
                  value={currentWb.response || ''}
                  onChange={(e) => handleWbDataChange(selectedControl.id, 'response', e.target.value)}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Remediation Plan / Discovered Gaps"
                  placeholder="Describe active plans to remediate compliance gaps if not fully implemented..."
                  value={currentWb.remediationPlan || ''}
                  onChange={(e) => handleWbDataChange(selectedControl.id, 'remediationPlan', e.target.value)}
                />
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Select a control from the list to assess.</Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
