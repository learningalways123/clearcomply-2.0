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
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { useWorkbook } from './WorkbookContext';

const DROPDOWNS = {
  systemState: ["New development", "In Production", "Major Change", "New purchased software (COTS)", "New SaaS solution", "Other - Describe…"],
  assessmentTarget: ["Single Application", "System that depends on multiple applications", "Hardware solution dependent on technology", "Data Management & Permissions", "Other - Describe…"],
  technologyPlatform: ["Windows", "Linux", "Mainframe", "Cloud Hosting / API", "Hybrid of above choices", "Other - Describe…"],
  yesNoUnsure: ["Yes", "No", "Unsure"],
  downtimeTolerance: ["Hours", "Days", "Weeks", "Months"],
  vendorServices: ["Third Party Development", "Third Party Hosting", "Software Maintenance and Support", "Enterprise Hosted and Supported", "Not applicable ", "Other"],
};

export default function SystemContacts() {
  const { workbook, updateSection, loading } = useWorkbook();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const tc = workbook?.contactsInfo || {
    contacts: [],
    agency: '',
    projectName: '',
    systemName: '',
    appInventoryId: '',
    businessFunction: '',
    systemDependencies: '',
    billingCode: '',
    projectId: '',
    systemState: '',
    assessmentTarget: '',
    technologyPlatform: '',
    otherInfo: '',
    lifeCritical: '',
    downtimeTolerance: '',
    vendorServices: '',
    architecture: '',
    authentication: '',
    supportEntities: '',
    risksVulnerabilities: ''
  };

  const handleFieldChange = (field: string, value: string) => {
    updateSection('contactsInfo', {
      ...tc,
      [field]: value
    });
  };

  const handleContactChange = (index: number, field: string, value: string) => {
    const nextContacts = [...(tc.contacts || [])];
    nextContacts[index] = {
      ...nextContacts[index],
      [field]: value
    };
    updateSection('contactsInfo', {
      ...tc,
      contacts: nextContacts
    });
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">System Contacts & Details</Typography>
        <Typography variant="body2" color="text.secondary">
          Identify key technical leads, describe essential operational elements, and specify architecture.
        </Typography>
      </Box>

      {/* Contacts Table */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>System Contacts</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Role</TableCell>
                  <TableCell>Name (Agency)</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(tc.contacts || []).map((c: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1, fontWeight: 600 }}>{c.role}</TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="Lead Name"
                        value={c.name || ''}
                        onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder={c.emailLabel || 'Lead Email'}
                        value={c.email || ''}
                        onChange={(e) => handleContactChange(idx, 'email', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* System Description & Essential Elements */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="subtitle1" fontWeight={700}>System Description & Essential Elements</Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <TextField
              label="Agency"
              value={tc.agency || ''}
              onChange={(e) => handleFieldChange('agency', e.target.value)}
              size="small"
            />
            <TextField
              label="Project Name"
              value={tc.projectName || ''}
              onChange={(e) => handleFieldChange('projectName', e.target.value)}
              size="small"
            />
            <TextField
              label="System / Application Name"
              value={tc.systemName || ''}
              onChange={(e) => handleFieldChange('systemName', e.target.value)}
              size="small"
            />
            <TextField
              label="Application Inventory ID"
              value={tc.appInventoryId || ''}
              onChange={(e) => handleFieldChange('appInventoryId', e.target.value)}
              size="small"
            />
            <TextField
              label="Billing Code"
              value={tc.billingCode || ''}
              onChange={(e) => handleFieldChange('billingCode', e.target.value)}
              size="small"
            />
            <TextField
              label="Project ID"
              value={tc.projectId || ''}
              onChange={(e) => handleFieldChange('projectId', e.target.value)}
              size="small"
            />
          </Box>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Business Function of System"
            value={tc.businessFunction || ''}
            onChange={(e) => handleFieldChange('businessFunction', e.target.value)}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="System Dependencies"
            value={tc.systemDependencies || ''}
            onChange={(e) => handleFieldChange('systemDependencies', e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Maintenance & Operations Data */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="subtitle1" fontWeight={700}>Maintenance & Operations Data</Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>System State</InputLabel>
              <Select
                label="System State"
                value={tc.systemState || ''}
                onChange={(e) => handleFieldChange('systemState', e.target.value)}
              >
                {DROPDOWNS.systemState.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Assessment Target</InputLabel>
              <Select
                label="Assessment Target"
                value={tc.assessmentTarget || ''}
                onChange={(e) => handleFieldChange('assessmentTarget', e.target.value)}
              >
                {DROPDOWNS.assessmentTarget.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Technology Platform</InputLabel>
              <Select
                label="Technology Platform"
                value={tc.technologyPlatform || ''}
                onChange={(e) => handleFieldChange('technologyPlatform', e.target.value)}
              >
                {DROPDOWNS.technologyPlatform.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Life Critical Application?</InputLabel>
              <Select
                label="Life Critical Application?"
                value={tc.lifeCritical || ''}
                onChange={(e) => handleFieldChange('lifeCritical', e.target.value)}
              >
                {DROPDOWNS.yesNoUnsure.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Downtime Tolerance</InputLabel>
              <Select
                label="Downtime Tolerance"
                value={tc.downtimeTolerance || ''}
                onChange={(e) => handleFieldChange('downtimeTolerance', e.target.value)}
              >
                {DROPDOWNS.downtimeTolerance.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Vendor Services</InputLabel>
              <Select
                label="Vendor Services"
                value={tc.vendorServices || ''}
                onChange={(e) => handleFieldChange('vendorServices', e.target.value)}
              >
                {DROPDOWNS.vendorServices.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Additional Info"
            value={tc.otherInfo || ''}
            onChange={(e) => handleFieldChange('otherInfo', e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Narrative Fields */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="subtitle1" fontWeight={700}>Architecture, Authentication & Support Narratives</Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Architecture Description"
            helperText="Describe system servers, load balancers, DB instances, cluster failovers, and virtual/physical locations."
            value={tc.architecture || ''}
            onChange={(e) => handleFieldChange('architecture', e.target.value)}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Authentication Mechanisms"
            helperText="Detail Active Directory integration, native credentials, MFA support, or local DB credentials."
            value={tc.authentication || ''}
            onChange={(e) => handleFieldChange('authentication', e.target.value)}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Support and Updates notifications"
            helperText="Vendor patching plan, vulnerability alerts, updates notification protocols, and lead contact paths."
            value={tc.supportEntities || ''}
            onChange={(e) => handleFieldChange('supportEntities', e.target.value)}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Inherent Risks / Vulnerabilities"
            helperText="Threats or perceived vulnerabilities that might affect application operation."
            value={tc.risksVulnerabilities || ''}
            onChange={(e) => handleFieldChange('risksVulnerabilities', e.target.value)}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
