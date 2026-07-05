import { useEffect, useState } from 'react';
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

import { useWorkbook } from './WorkbookContext';
import { api } from '../../../services/api';

const STATUS_OPTS = ['Implemented', 'Partially Implemented', 'Planned / POAM', 'Inherited', 'Not Applicable'];

function getStatusColor(status: string) {
  if (status === 'Implemented') return 'success';
  if (status === 'Partially Implemented') return 'warning';
  if (status === 'Planned / POAM') return 'error';
  if (status === 'Inherited') return 'info';
  return 'default';
}

export default function ControlsAssessment() {
  const { workbook, updateSection, loading: wbLoading } = useWorkbook();
  const [controlsList, setControlsList] = useState<any[]>([]);
  const [selectedControl, setSelectedControl] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workbook) return;
    setLoading(true);
    api.getAssessment(workbook.assessmentId)
      .then(ass => {
        const fw = ass.frameworkIds[0] || 'NIST-800-53';
        return api.getControls(fw);
      })
      .then(list => {
        setControlsList(list);
        if (list.length > 0) {
          setSelectedControl(list[0]);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [workbook?.assessmentId]);

  if (wbLoading || loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const wbControls = workbook?.controls || [];

  const getControlWbData = (ctrlId: string) => {
    return wbControls.find((c: any) => c.id === ctrlId) || {
      id: ctrlId,
      status: 'Planned / POAM',
      narrative: '',
      gaps: ''
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

      <Grid container spacing={3}>
        {/* Sidebar Controls List */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 2, maxHeight: 600, overflow: 'auto', border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <List disablePadding>
              {controlsList.map((ctrl) => {
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
                            label={data.status} 
                            color={getStatusColor(data.status)} 
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
                          {ctrl.title}
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
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ display: 'block', mb: 0.5 }}>
                    {selectedControl.id}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedControl.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {selectedControl.description}
                  </Typography>
                </Box>

                <Divider />

                <FormControl fullWidth size="small">
                  <InputLabel>Implementation Status</InputLabel>
                  <Select
                    label="Implementation Status"
                    value={currentWb.status || ''}
                    onChange={(e) => handleWbDataChange(selectedControl.id, 'status', e.target.value)}
                  >
                    {STATUS_OPTS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Implementation Narrative"
                  helperText="Explain how this system meets the requirements. Identify specific technologies, configurations, or operational policies."
                  value={currentWb.narrative || ''}
                  onChange={(e) => handleWbDataChange(selectedControl.id, 'narrative', e.target.value)}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Remediation Plan / Discovered Gaps"
                  helperText="If not fully implemented, describe what gaps exist and the active roadmap to reach full compliance."
                  value={currentWb.gaps || ''}
                  onChange={(e) => handleWbDataChange(selectedControl.id, 'gaps', e.target.value)}
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
