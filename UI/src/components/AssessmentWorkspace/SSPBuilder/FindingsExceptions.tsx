import { useState, useMemo } from 'react';
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
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Autocomplete from '@mui/material/Autocomplete';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';

import EditIcon from '@mui/icons-material/Edit';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import { useWorkbook } from './WorkbookContext';

function getStatusColor(status: string) {
  if (status === 'Full') return 'success';
  if (status === 'Partial') return 'warning';
  if (status === 'None') return 'error';
  return 'default';
}

export default function FindingsExceptions() {
  const { workbook, updateSection, loading: wbLoading } = useWorkbook();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('edit');
  const [selectedControlDef, setSelectedControlDef] = useState<any>(null);
  
  // Dialog fields state
  const [compliantStatus, setCompliantStatus] = useState('None');
  const [remediationPlan, setRemediationPlan] = useState('');
  const [compensatingControls, setCompensatingControls] = useState('');
  const [businessJustification, setBusinessJustification] = useState('');
  const [hostsIpAddresses, setHostsIpAddresses] = useState('');
  const [technicalContact, setTechnicalContact] = useState('');
  const [businessOwner, setBusinessOwner] = useState('');
  const [findingNumber, setFindingNumber] = useState('');
  const [remediationPlanNumber, setRemediationPlanNumber] = useState('');
  const [policyExceptionNumber, setPolicyExceptionNumber] = useState('');

  // Row expansion state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Extract controls and build findings list
  const controlsList = workbook?.controlDefinitions || [];
  const wbControls = workbook?.controls || [];

  const findings = useMemo(() => {
    return controlsList.map((def: any) => {
      const data = wbControls.find((c: any) => c.id === def.id) || {};
      return {
        definition: def,
        data: {
          id: def.id,
          compliant: data.compliant || '',
          response: data.response || '',
          remediationPlan: data.remediationPlan || '',
          compensatingControls: data.compensatingControls || '',
          businessJustification: data.businessJustification || '',
          hostsIpAddresses: data.hostsIpAddresses || '',
          technicalContact: data.technicalContact || '',
          businessOwner: data.businessOwner || '',
          findingNumber: data.findingNumber || '',
          remediationPlanNumber: data.remediationPlanNumber || '',
          policyExceptionNumber: data.policyExceptionNumber || '',
          ...data
        }
      };
    }).filter((item: any) => {
      const status = item.data.compliant;
      const hasStatusGap = status === 'Partial' || status === 'None';
      const hasDataGap = 
        item.data.remediationPlan || 
        item.data.compensatingControls || 
        item.data.businessJustification || 
        item.data.hostsIpAddresses || 
        item.data.technicalContact || 
        item.data.businessOwner || 
        item.data.findingNumber || 
        item.data.remediationPlanNumber || 
        item.data.policyExceptionNumber;
      return hasStatusGap || hasDataGap;
    });
  }, [controlsList, wbControls]);

  // Un-assessed controls list for creating new findings
  const availableControlDefs = useMemo(() => {
    const existingIds = new Set(findings.map(f => f.definition.id));
    return controlsList.filter((c: any) => !existingIds.has(c.id));
  }, [controlsList, findings]);

  // Statistics
  const stats = useMemo(() => {
    let gaps = 0;
    let exceptions = 0;
    let remediations = 0;
    findings.forEach(f => {
      if (f.data.compliant === 'Partial' || f.data.compliant === 'None') gaps++;
      if (f.data.policyExceptionNumber) exceptions++;
      if (f.data.remediationPlan || f.data.remediationPlanNumber) remediations++;
    });
    return { gaps, exceptions, remediations };
  }, [findings]);

  if (wbLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const handleOpenCreate = () => {
    setDialogMode('create');
    setSelectedControlDef(null);
    setCompliantStatus('None');
    setRemediationPlan('');
    setCompensatingControls('');
    setBusinessJustification('');
    setHostsIpAddresses('');
    setTechnicalContact('');
    setBusinessOwner('');
    setFindingNumber('');
    setRemediationPlanNumber('');
    setPolicyExceptionNumber('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setDialogMode('edit');
    setSelectedControlDef(item.definition);
    
    // Set fields
    setCompliantStatus(item.data.compliant || 'None');
    setRemediationPlan(item.data.remediationPlan || '');
    setCompensatingControls(item.data.compensatingControls || '');
    setBusinessJustification(item.data.businessJustification || '');
    setHostsIpAddresses(item.data.hostsIpAddresses || '');
    
    // Default contact / business owner if empty
    const contacts = workbook?.contactsInfo?.contacts || [];
    const defaultTechContact = contacts.find((c: any) => c.role === 'Technical Contact')?.name || '';
    const defaultBizOwner = contacts.find((c: any) => c.role === 'Business Manager' || c.role === 'Business Division Director')?.name || '';
    
    setTechnicalContact(item.data.technicalContact || defaultTechContact);
    setBusinessOwner(item.data.businessOwner || defaultBizOwner);
    
    setFindingNumber(item.data.findingNumber || '');
    setRemediationPlanNumber(item.data.remediationPlanNumber || '');
    setPolicyExceptionNumber(item.data.policyExceptionNumber || '');
    
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedControlDef) return;
    const nextControls = [...wbControls];
    const idx = nextControls.findIndex((c: any) => c.id === selectedControlDef.id);
    const existing = nextControls[idx] || { id: selectedControlDef.id };
    
    const updated = {
      ...existing,
      compliant: compliantStatus,
      remediationPlan,
      compensatingControls,
      businessJustification,
      hostsIpAddresses,
      technicalContact,
      businessOwner,
      findingNumber,
      remediationPlanNumber,
      policyExceptionNumber,
    };
    
    if (idx >= 0) {
      nextControls[idx] = updated;
    } else {
      nextControls.push(updated);
    }
    
    updateSection('controls', nextControls);
    setDialogOpen(false);
  };

  return (
    <Box>
      {/* Summary Header & Stats */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ mb: 0.5 }}>
            Findings & Exceptions
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            Track discovered gaps, policy deviations, compensating controls, and Archer ticket numbers.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          Add Finding / Exception
        </Button>
      </Box>

      {/* Summary Cards */}
      <Stack direction="row" spacing={3} sx={{ mb: 4 }} flexWrap="wrap">
        <Card sx={{ flex: 1, minWidth: 200, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: 44, height: 44 }}>
              <ReportProblemIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={850} color="#ef4444">{stats.gaps}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Gaps / Findings</Typography>
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ flex: 1, minWidth: 200, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', width: 44, height: 44 }}>
              <LockOpenIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={850} color="#4f46e5">{stats.exceptions}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Active Exceptions</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: 44, height: 44 }}>
              <AssignmentIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={850} color="#f59e0b">{stats.remediations}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Remediation Plans</Typography>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      {/* Main Table */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ width: 40 }} />
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Control Family</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', width: '30%' }}>Control Details</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Compliance</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Tracking numbers</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Ownership</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {findings.length > 0 ? (
                findings.map((item) => {
                  const isExpanded = expandedId === item.definition.id;
                  return (
                    <>
                      <TableRow key={item.definition.id} hover sx={{ cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : item.definition.id)}>
                        <TableCell>
                          <IconButton aria-label="expand row" size="small">
                            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" fontWeight={600} color="#475569">
                            {item.definition.family}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={750} color="#1e293b">
                            {item.definition.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.3
                            }}
                          >
                            {item.definition.detail}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.data.compliant || 'Gap'} 
                            color={getStatusColor(item.data.compliant)} 
                            size="small" 
                            sx={{ fontWeight: 700, fontSize: 10, height: 20 }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            {item.data.findingNumber && (
                              <Typography variant="caption" sx={{ display: 'block', color: '#dc2626', fontWeight: 650 }}>
                                Finding: #{item.data.findingNumber}
                              </Typography>
                            )}
                            {item.data.policyExceptionNumber && (
                              <Typography variant="caption" sx={{ display: 'block', color: '#4f46e5', fontWeight: 650 }}>
                                Exception: #{item.data.policyExceptionNumber}
                              </Typography>
                            )}
                            {item.data.remediationPlanNumber && (
                              <Typography variant="caption" sx={{ display: 'block', color: '#d97706', fontWeight: 650 }}>
                                Rem. Plan: #{item.data.remediationPlanNumber}
                              </Typography>
                            )}
                            {!item.data.findingNumber && !item.data.policyExceptionNumber && !item.data.remediationPlanNumber && (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.25}>
                            {item.data.businessOwner && (
                              <Typography variant="caption" display="block">
                                <strong>Owner:</strong> {item.data.businessOwner}
                              </Typography>
                            )}
                            {item.data.technicalContact && (
                              <Typography variant="caption" display="block">
                                <strong>Contact:</strong> {item.data.technicalContact}
                              </Typography>
                            )}
                            {!item.data.businessOwner && !item.data.technicalContact && (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <Tooltip title="Edit Findings & Exceptions">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Details Row */}
                      <TableRow key={`${item.definition.id}-expanded`}>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2, p: 2.5, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                              <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Typography variant="subtitle2" fontWeight={750} color="primary.main" gutterBottom>
                                    Remediation Plan
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                                    {item.data.remediationPlan || 'No remediation plan provided.'}
                                  </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Typography variant="subtitle2" fontWeight={750} color="primary.main" gutterBottom>
                                    Compensating Controls
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                                    {item.data.compensatingControls || 'No compensating controls defined.'}
                                  </Typography>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                  <Typography variant="subtitle2" fontWeight={750} color="primary.main" gutterBottom>
                                    Business Justification (Required for Exceptions)
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                                    {item.data.businessJustification || 'No business justification provided.'}
                                  </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                  <Typography variant="caption" fontWeight={750} color="text.secondary" display="block">
                                    Impacted Hosts & IPs
                                  </Typography>
                                  <Typography variant="body2" fontWeight={650} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {item.data.hostsIpAddresses || '—'}
                                  </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                  <Typography variant="caption" fontWeight={750} color="text.secondary" display="block">
                                    Technical Contact
                                  </Typography>
                                  <Typography variant="body2" fontWeight={650} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {item.data.technicalContact || '—'}
                                  </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                  <Typography variant="caption" fontWeight={750} color="text.secondary" display="block">
                                    Business Owner
                                  </Typography>
                                  <Typography variant="body2" fontWeight={650} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {item.data.businessOwner || '—'}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary" variant="body2" fontWeight={500}>
                      No active findings or compliance gaps recorded. Click "Add Finding / Exception" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create / Edit Findings Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {dialogMode === 'create' ? 'Add Finding & Exception' : `Edit Findings & Exceptions Details: ${selectedControlDef?.id}`}
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          <Stack spacing={3.5}>
            
            {/* Control Selection (Create Mode) */}
            {dialogMode === 'create' && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#1e1b4b' }}>
                  Select Control *
                </Typography>
                <Autocomplete
                  options={availableControlDefs}
                  getOptionLabel={o => `${o.id} — ${o.name}`}
                  value={selectedControlDef}
                  onChange={(_, newValue) => {
                    setSelectedControlDef(newValue);
                    
                    // Default contact / business owner if empty
                    const contacts = workbook?.contactsInfo?.contacts || [];
                    const defaultTechContact = contacts.find((c: any) => c.role === 'Technical Contact')?.name || '';
                    const defaultBizOwner = contacts.find((c: any) => c.role === 'Business Manager' || c.role === 'Business Division Director')?.name || '';
                    
                    setTechnicalContact(defaultTechContact);
                    setBusinessOwner(defaultBizOwner);
                  }}
                  renderInput={params => <TextField {...params} placeholder="Choose a control to associate the finding with..." size="small" />}
                />
              </Box>
            )}

            {/* Control Details Reference (Edit Mode or Selected in Create Mode) */}
            {selectedControlDef && (
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" fontWeight={750} color="primary.main" display="block" sx={{ mb: 0.5 }}>
                  {selectedControlDef.family} &bull; {selectedControlDef.id} &bull; {selectedControlDef.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontStyle: 'italic', fontSize: '0.825rem' }}>
                  {selectedControlDef.detail}
                </Typography>
                
                <Divider sx={{ my: 1.5 }} />
                
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, color: '#1e293b' }}>
                  Implementation Response:
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {wbControls.find((c: any) => c.id === selectedControlDef.id)?.response || 'No response entered in Controls tab.'}
                </Typography>
              </Box>
            )}

            {/* Compliance Status Dropdown */}
            {selectedControlDef && (
              <Box sx={{ maxWidth: 300 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#1e1b4b' }}>
                  Compliance Status *
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={compliantStatus}
                  onChange={e => setCompliantStatus(e.target.value)}
                >
                  <MenuItem value="None">None (Non-Compliant)</MenuItem>
                  <MenuItem value="Partial">Partial</MenuItem>
                  <MenuItem value="Full">Full (Compliant - removes from gaps list)</MenuItem>
                </TextField>
              </Box>
            )}

            {/* Tracking Numbers Grid */}
            {selectedControlDef && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1e1b4b' }}>
                  Tracking Identifiers
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Finding # (Archer FND#)"
                      placeholder="e.g. FND-001092"
                      value={findingNumber}
                      onChange={e => setFindingNumber(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Remediation Plan #"
                      placeholder="e.g. REM-9821"
                      value={remediationPlanNumber}
                      onChange={e => setRemediationPlanNumber(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Policy Exception #"
                      placeholder="e.g. EXC-1002"
                      value={policyExceptionNumber}
                      onChange={e => setPolicyExceptionNumber(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Core Details (Remediation, Compensating, Justification) */}
            {selectedControlDef && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1e1b4b' }}>
                  Remediation & Justification Details
                </Typography>
                <Stack spacing={2.5}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Remediation Plan"
                    placeholder="Describe details, steps, milestones, and target timelines to fix this gap..."
                    value={remediationPlan}
                    onChange={e => setRemediationPlan(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={2.5}
                    label="Compensating Controls"
                    placeholder="Describe alternate technical or procedural controls in place to reduce risk..."
                    value={compensatingControls}
                    onChange={e => setCompensatingControls(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={2.5}
                    label="Business Justification (Required for Exceptions)"
                    placeholder="Why is it technically infeasible or cost-prohibitive to implement the default control?"
                    value={businessJustification}
                    onChange={e => setBusinessJustification(e.target.value)}
                  />
                </Stack>
              </Box>
            )}

            {/* Scope & Contacts */}
            {selectedControlDef && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1e1b4b' }}>
                  Scope & Ownership
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Technical Contact"
                      placeholder="e.g. John Doe"
                      value={technicalContact}
                      onChange={e => setTechnicalContact(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Business Owner"
                      placeholder="e.g. Jane Smith"
                      value={businessOwner}
                      onChange={e => setBusinessOwner(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Impacted Hosts & IP Addresses"
                      placeholder="e.g. 10.0.1.5, 10.0.1.10"
                      value={hostsIpAddresses}
                      onChange={e => setHostsIpAddresses(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} color="primary" disabled={!selectedControlDef} sx={{ px: 3 }}>
            Save Findings Details
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
