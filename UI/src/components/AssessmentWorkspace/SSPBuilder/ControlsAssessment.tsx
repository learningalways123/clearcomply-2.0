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
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import FilterListIcon from '@mui/icons-material/FilterList';

import { useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const familyParam = searchParams.get('family');
  const { workbook, updateSection, loading: wbLoading } = useWorkbook();
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [selectedControl, setSelectedControl] = useState<any>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'selected'>('all');
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

  // Default to URL param or first family if none selected
  useEffect(() => {
    if (familyParam && familiesList.includes(familyParam)) {
      setSelectedFamily(familyParam);
    } else if (!selectedFamily && familiesList.length > 0) {
      setSelectedFamily(familiesList[0]);
    }
  }, [familiesList, familyParam]);

  // Filtered controls by selected family
  const familyControls = useMemo(() => {
    if (!selectedFamily) return controlsList;
    return controlsList.filter((c: any) => c.family === selectedFamily);
  }, [controlsList, selectedFamily]);

  const wbControls = workbook?.controls || [];

  const getControlWbData = (ctrlId: string) => {
    const existing = wbControls.find((c: any) => c.id === ctrlId);
    if (existing) {
      return {
        id: ctrlId,
        selected: existing.selected !== undefined ? Boolean(existing.selected) : false,
        response: existing.response || '',
        compliant: existing.compliant || '',
        attestation: existing.attestation || '',
        attestationDesc: existing.attestationDesc || '',
        reviewDate: existing.reviewDate || '',
        remediationPlan: existing.remediationPlan || '',
        contact: existing.contact || ''
      };
    }
    return {
      id: ctrlId,
      selected: false,
      response: '',
      compliant: '',
      attestation: '',
      attestationDesc: '',
      reviewDate: '',
      remediationPlan: '',
      contact: ''
    };
  };

  // Displayed controls based on filter mode ('all' vs 'selected')
  const displayedControls = useMemo(() => {
    if (filterMode === 'selected') {
      return familyControls.filter((ctrl: any) => {
        const data = getControlWbData(ctrl.id);
        return data.selected;
      });
    }
    return familyControls;
  }, [familyControls, filterMode, wbControls]);

  // Set default selected control detail view
  useEffect(() => {
    if (displayedControls.length > 0) {
      const exists = displayedControls.some((c: any) => c.id === selectedControl?.id);
      if (!exists) {
        setSelectedControl(displayedControls[0]);
      }
    } else if (familyControls.length > 0) {
      // Fallback to first in family if filter is set to selected but none selected
      setSelectedControl(familyControls[0]);
    } else {
      setSelectedControl(null);
    }
  }, [displayedControls, familyControls]);

  useEffect(() => {
    if (workbook?.controlDefinitions) {
      setLoading(false);
    }
  }, [workbook]);

  if (wbLoading || loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const handleWbDataChange = (ctrlId: string, field: string, value: any) => {
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

  const handleToggleSelect = (ctrlId: string, isSelected: boolean) => {
    handleWbDataChange(ctrlId, 'selected', isSelected);
  };

  const handleBatchSelectFamily = (isSelectAll: boolean) => {
    const nextControls = [...wbControls];
    familyControls.forEach((ctrl: any) => {
      const idx = nextControls.findIndex((c: any) => c.id === ctrl.id);
      const current = getControlWbData(ctrl.id);
      const updatedObj = { ...current, selected: isSelectAll };
      if (idx >= 0) {
        nextControls[idx] = updatedObj;
      } else {
        nextControls.push(updatedObj);
      }
    });
    updateSection('controls', nextControls);
  };

  // Overall Stats
  const totalSelectedGlobal = wbControls.filter((c: any) => c.selected).length;
  const familySelectedCount = familyControls.filter((ctrl: any) => getControlWbData(ctrl.id).selected).length;
  const completedGlobalCount = wbControls.filter((c: any) => c.selected && ((c.response && c.response.trim()) || c.compliant)).length;

  const currentWb = selectedControl ? getControlWbData(selectedControl.id) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header & Overall Metrics */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">Controls Assessment</Typography>
          <Typography variant="body2" color="text.secondary">
            Select a control family, pick specific control members using the checkboxes, and specify compliance narratives.
          </Typography>
        </Box>

        {/* Global Summary Chips */}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Paper variant="outlined" sx={{ px: 2, py: 0.75, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f8fafc' }}>
            <PlaylistAddCheckIcon color="primary" fontSize="small" />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1 }}>Selected Controls</Typography>
              <Typography variant="subtitle2" fontWeight={700}>{totalSelectedGlobal} of {controlsList.length}</Typography>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ px: 2, py: 0.75, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f8fafc' }}>
            <CheckCircleOutlineIcon color="success" fontSize="small" />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1 }}>Completed</Typography>
              <Typography variant="subtitle2" fontWeight={700}>{completedGlobalCount}</Typography>
            </Box>
          </Paper>
        </Stack>
      </Box>

      {/* Control Family Selector & Action Bar */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="family-select-label">Select Control Family</InputLabel>
              <Select
                labelId="family-select-label"
                label="Select Control Family"
                value={selectedFamily}
                onChange={(e) => setSelectedFamily(e.target.value)}
              >
                <MenuItem value="">All Families</MenuItem>
                {familiesList.map(fam => (
                  <MenuItem key={fam} value={fam}>{fam}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={<PlaylistAddCheckIcon fontSize="small" />}
                  label={`${familySelectedCount} of ${familyControls.length} Selected in ${selectedFamily || 'All Families'}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <Stack direction="row" spacing={1} alignItems="center">
                <ButtonGroup size="small" variant="outlined">
                  <Button 
                    onClick={() => handleBatchSelectFamily(true)}
                    disabled={familyControls.length === 0}
                    sx={{ textTransform: 'none', fontSize: 12 }}
                  >
                    Select All
                  </Button>
                  <Button 
                    onClick={() => handleBatchSelectFamily(false)}
                    disabled={familyControls.length === 0}
                    sx={{ textTransform: 'none', fontSize: 12 }}
                  >
                    Deselect All
                  </Button>
                </ButtonGroup>

                <ButtonGroup size="small" variant="outlined">
                  <Button 
                    variant={filterMode === 'all' ? 'contained' : 'outlined'}
                    onClick={() => setFilterMode('all')}
                    startIcon={<FilterListIcon />}
                    sx={{ textTransform: 'none', fontSize: 12 }}
                  >
                    All ({familyControls.length})
                  </Button>
                  <Button 
                    variant={filterMode === 'selected' ? 'contained' : 'outlined'}
                    onClick={() => setFilterMode('selected')}
                    sx={{ textTransform: 'none', fontSize: 12 }}
                  >
                    Selected ({familySelectedCount})
                  </Button>
                </ButtonGroup>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content: Sidebar + Detail Editor */}
      <Grid container spacing={3}>
        {/* Sidebar Controls List */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 2, maxHeight: 680, overflow: 'auto', border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                CONTROL FAMILY MEMBERS
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {displayedControls.length} controls
              </Typography>
            </Box>
            <List disablePadding>
              {displayedControls.map((ctrl) => {
                const data = getControlWbData(ctrl.id);
                const isCurrentSelected = selectedControl?.id === ctrl.id;
                return (
                  <ListItemButton
                    key={ctrl.id}
                    selected={isCurrentSelected}
                    onClick={() => setSelectedControl(ctrl)}
                    divider
                    sx={{
                      py: 1.25,
                      px: 1.5,
                      bgcolor: data.selected ? 'inherit' : 'action.hover',
                      opacity: data.selected ? 1 : 0.8,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '& .MuiListItemText-secondary': { color: 'primary.contrastText' },
                        '& .MuiCheckbox-root': { color: 'primary.contrastText' }
                      }
                    }}
                  >
                    {/* Sticky Checkbox for Family Member Selection */}
                    <Checkbox
                      checked={data.selected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(ctrl.id, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      size="small"
                      sx={{ p: 0.5, mr: 1 }}
                    />

                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight={700}>
                            {ctrl.id}
                          </Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {data.compliant && (
                              <Chip 
                                label={data.compliant} 
                                color={getStatusColor(data.compliant)} 
                                size="small" 
                                sx={{ fontSize: 9, height: 16, fontWeight: 700 }} 
                              />
                            )}
                            {!data.selected && (
                              <Chip 
                                label="Not Selected" 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: 8, height: 16, color: 'text.disabled', borderColor: 'divider' }} 
                              />
                            )}
                          </Stack>
                        </Box>
                      }
                      secondary={
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mt: 0.25
                          }}
                        >
                          {ctrl.name}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                );
              })}

              {displayedControls.length === 0 && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {filterMode === 'selected' 
                      ? 'No controls selected in this family yet. Switch to "All" to select controls.' 
                      : 'No control family members found.'}
                  </Typography>
                </Box>
              )}
            </List>
          </Card>
        </Grid>

        {/* Selected Control Detail / Editor */}
        <Grid size={{ xs: 12, md: 8 }}>
          {selectedControl && currentWb ? (
            <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Control Header & Selection Toggle */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ display: 'block', mb: 0.5 }}>
                      {selectedControl.family} &bull; {selectedControl.id}
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedControl.name}
                    </Typography>
                  </Box>

                  {/* Switch to toggle control selection */}
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      px: 2, 
                      py: 0.5, 
                      borderRadius: 2, 
                      bgcolor: currentWb.selected ? '#f0fdf4' : '#fef2f2',
                      borderColor: currentWb.selected ? '#bbf7d0' : '#fecaca',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} color={currentWb.selected ? 'success.main' : 'error.main'}>
                      {currentWb.selected ? 'Included in Assessment' : 'Not Included'}
                    </Typography>
                    <Switch
                      size="small"
                      color="success"
                      checked={currentWb.selected}
                      onChange={(e) => handleToggleSelect(selectedControl.id, e.target.checked)}
                    />
                  </Paper>
                </Box>

                <Typography variant="body2" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                  {selectedControl.detail}
                </Typography>

                {selectedControl.responseGuidance && (
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    <strong>Response Guidance:</strong> {selectedControl.responseGuidance}
                  </Alert>
                )}

                {!currentWb.selected && (
                  <Alert 
                    severity="warning" 
                    action={
                      <Button color="inherit" size="small" onClick={() => handleToggleSelect(selectedControl.id, true)}>
                        Include Control
                      </Button>
                    }
                  >
                    This control is currently not selected for your SSP assessment. Toggle the switch above to include it.
                  </Alert>
                )}

                <Divider />

                {/* Form Fields (Enabled whether selected or not, but clearly marked) */}
                <Box sx={{ opacity: currentWb.selected ? 1 : 0.65, pointerEvents: currentWb.selected ? 'auto' : 'none' }}>
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
                    sx={{ mt: 2 }}
                  />

                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Remediation Plan / Discovered Gaps"
                    placeholder="Describe active plans to remediate compliance gaps if not fully implemented..."
                    value={currentWb.remediationPlan || ''}
                    onChange={(e) => handleWbDataChange(selectedControl.id, 'remediationPlan', e.target.value)}
                    sx={{ mt: 2 }}
                  />
                </Box>
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

