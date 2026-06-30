import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Chip from '@mui/material/Chip';

import { useWorkspace } from './AssessmentWorkspace';

export default function AssessmentDataCategorization() {
  const { assessment } = useWorkspace();

  if (!assessment) return null;

  const isNist = assessment.frameworkIds.some(f => f.startsWith('NIST-800-53'));

  if (!isNist) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          <AlertTitle sx={{ fontWeight: 750 }}>Not Applicable</AlertTitle>
          FIPS 199 Data Categorization is only applicable to NIST SP 800-53 assessments. 
          This assessment is scoped for <strong>{assessment.frameworkIds.join(', ')}</strong>.
        </Alert>
      </Box>
    );
  }

  const conf = assessment.nistConfidentiality || 'Low';
  const int = assessment.nistIntegrity || 'Low';
  const avail = assessment.nistAvailability || 'Low';
  const baseline = assessment.nistBaseline || 'Low';

  const getImpactColor = (val: string) => {
    if (val === 'High') return '#ef4444';
    if (val === 'Moderate') return '#f59e0b';
    return '#10b981';
  };

  const parameters = [
    { 
      label: 'Confidentiality', 
      value: conf, 
      desc: 'Preserving authorized restrictions on information access and disclosure, including means for protecting personal privacy and proprietary information.' 
    },
    { 
      label: 'Integrity', 
      value: int, 
      desc: 'Guarding against improper information modification or destruction, and includes ensuring information non-repudiation and authenticity.' 
    },
    { 
      label: 'Availability', 
      value: avail, 
      desc: 'Ensuring timely and reliable access to and use of information.' 
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      
      {/* Overview Card */}
      <Grid container spacing={3.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ mb: 1 }}>
                FIPS 199 Security Categorization
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Security categorization standards for information and information systems are based on the potential impact on organizations should certain events occur.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {parameters.map((p) => (
                  <Box key={p.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight={750} color="#1e293b" sx={{ mb: 0.5 }}>
                        {p.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                        {p.desc}
                      </Typography>
                    </Box>
                    <Chip 
                      label={p.value.toUpperCase()} 
                      sx={{ 
                        fontWeight: 800, 
                        color: '#fff', 
                        bgcolor: getImpactColor(p.value),
                        px: 1.5,
                        py: 0.5
                      }} 
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Calculated Baseline Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#1e1b4b', color: '#fff', minHeight: '100%', display: 'flex', alignItems: 'center' }}>
            <CardContent sx={{ p: 4, width: '100%', textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Overall System Baseline
              </Typography>
              <Typography variant="h2" fontWeight={900} sx={{ mt: 2, mb: 1, color: '#fff', letterSpacing: -1 }}>
                {baseline.toUpperCase()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                Determined by the highest watermark impact level across Confidentiality, Integrity, and Availability.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

    </Box>
  );
}
