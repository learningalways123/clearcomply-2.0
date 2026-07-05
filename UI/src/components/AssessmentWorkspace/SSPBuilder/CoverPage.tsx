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
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { useWorkbook } from './WorkbookContext';

export default function CoverPage() {
  const { workbook, updateSection, loading } = useWorkbook();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const cp = workbook?.coverPage || {
    systemName: '',
    systemSummary: '',
    assessmentSummary: '',
    risksSummary: '',
    closingStatement: '',
    supportingDocs: ['', '', '', ''],
    opsDocsRepo: '',
    approvals: []
  };

  const handleFieldChange = (field: string, value: any) => {
    updateSection('coverPage', {
      ...cp,
      [field]: value
    });
  };

  const handleApprovalChange = (index: number, field: string, value: string) => {
    const nextApprovals = [...(cp.approvals || [])];
    nextApprovals[index] = {
      ...nextApprovals[index],
      [field]: value
    };
    handleFieldChange('approvals', nextApprovals);
  };

  const addApprovalRow = () => {
    const nextApprovals = [...(cp.approvals || []), { date: '', approvedBy: '', analyst: '', comments: '' }];
    handleFieldChange('approvals', nextApprovals);
  };

  const removeApprovalRow = (index: number) => {
    const nextApprovals = (cp.approvals || []).filter((_: any, i: number) => i !== index);
    handleFieldChange('approvals', nextApprovals);
  };

  const handleSupportingDocChange = (index: number, value: string) => {
    const nextDocs = [...(cp.supportingDocs || ['', '', '', ''])];
    nextDocs[index] = value;
    handleFieldChange('supportingDocs', nextDocs);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">Cover Page</Typography>
        <Typography variant="body2" color="text.secondary">
          Build the high-level System Security Plan summary and track CISO approval states.
        </Typography>
      </Box>

      {/* System Name */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>System Name</Typography>
          <TextField
            fullWidth
            label="Authoritative System Name"
            value={cp.systemName || ''}
            onChange={(e) => handleFieldChange('systemName', e.target.value)}
            placeholder="e.g. Integrated Licensing System (ILS)"
            size="small"
          />
        </CardContent>
      </Card>

      {/* Approvals Table */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Sign-offs & Approvals</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Record accreditation reviews and formal CISO approval sign-offs.
          </Typography>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Date Approved</TableCell>
                  <TableCell>Approved By (CISO/Authority)</TableCell>
                  <TableCell>Security Analyst</TableCell>
                  <TableCell>Comments</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(cp.approvals || []).map((app: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="YYYY-MM-DD"
                        value={app.date || ''}
                        onChange={(e) => handleApprovalChange(idx, 'date', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="Name & Title"
                        value={app.approvedBy || ''}
                        onChange={(e) => handleApprovalChange(idx, 'approvedBy', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="Name"
                        value={app.analyst || ''}
                        onChange={(e) => handleApprovalChange(idx, 'analyst', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Accredited for production"
                        value={app.comments || ''}
                        onChange={(e) => handleApprovalChange(idx, 'comments', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>
                      <IconButton 
                        color="error" 
                        size="small" 
                        onClick={() => removeApprovalRow(idx)}
                        disabled={(cp.approvals || []).length <= 1}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button 
            startIcon={<AddIcon />} 
            onClick={addApprovalRow} 
            sx={{ mt: 2 }} 
            size="small"
          >
            Add Approval
          </Button>
        </CardContent>
      </Card>

      {/* Executive Summaries */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="subtitle1" fontWeight={700}>Executive Summary Narratives</Typography>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="System Summary"
            helperText="Include high-level business function, system boundaries (hosting platform, IAM integration, databases), and sensitive data elements."
            value={cp.systemSummary || ''}
            onChange={(e) => handleFieldChange('systemSummary', e.target.value)}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Security Assessment Summary"
            helperText="Summarize audit actions completed: third-party reviews, scanning, penetration tests, and vendor security assessments."
            value={cp.assessmentSummary || ''}
            onChange={(e) => handleFieldChange('assessmentSummary', e.target.value)}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Inherent Risks"
            helperText="Discovered gaps, active POA&M findings, policy exceptions, or other persistent system risks."
            value={cp.risksSummary || ''}
            onChange={(e) => handleFieldChange('risksSummary', e.target.value)}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Closing Statement"
            helperText="Final notes, recommended timeline for next review cycle, or accreditation status arguments."
            value={cp.closingStatement || ''}
            onChange={(e) => handleFieldChange('closingStatement', e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Key Supporting Documents */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Key Supporting Documents</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="System Diagram File Name"
              value={(cp.supportingDocs || [])[0] || ''}
              onChange={(e) => handleSupportingDocChange(0, e.target.value)}
              placeholder="e.g. ILS-Network-v2.pdf"
              size="small"
            />
            <TextField
              fullWidth
              label="Operational Documentation File Name(s)"
              value={(cp.supportingDocs || [])[1] || ''}
              onChange={(e) => handleSupportingDocChange(1, e.target.value)}
              placeholder="e.g. ILS-Runbook-2026.docx"
              size="small"
            />
            <TextField
              fullWidth
              label="Supporting Process Documentation File Name(s)"
              value={(cp.supportingDocs || [])[2] || ''}
              onChange={(e) => handleSupportingDocChange(2, e.target.value)}
              placeholder="e.g. ILS-Backup-Procedure.pdf"
              size="small"
            />
            <TextField
              fullWidth
              label="Additional Supporting Documents"
              value={(cp.supportingDocs || [])[3] || ''}
              onChange={(e) => handleSupportingDocChange(3, e.target.value)}
              placeholder="e.g. SOC 3 Report"
              size="small"
            />
            <TextField
              fullWidth
              label="Operational Documentation Repository URL"
              helperText="SharePoint, Teams, or corporate file share location"
              value={cp.opsDocsRepo || ''}
              onChange={(e) => handleFieldChange('opsDocsRepo', e.target.value)}
              placeholder="https://collab.mn.gov/teams/ils-sec..."
              size="small"
            />
          </Box>
        </CardContent>
      </Card>
      
      <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
        CONFIDENTIAL — This page contains sensitive information about information systems and security. Exemption from public access provisions may apply.
      </Alert>
    </Box>
  );
}
