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
import Chip from '@mui/material/Chip';

import { useWorkbook } from './WorkbookContext';
import { api } from '../../../services/api';
import type { SSPWorkbookRiskScore } from '../../../services/api';

const RISK_VARS = {
  impact: {
    "Number of Users Potentially Impacted": [
      "0 - 100",
      "101 - 1000",
      "1001 - 10,000",
      "10,001 - 1,000,000",
      "1,000,001+"
    ],
    "Type of Users": [
      "Internal (State Employees)",
      "Business Partner",
      "Internal and Business Partner",
      "Citizen/Public",
      "Internal and Citizen/Public",
      "Business Partner and Citizen/Public",
      "Internal and Business Partner and Citizen/Public"
    ],
    "Number of Records That Could be Impacted": [
      "1 - 1000",
      "1001 - 100,000",
      "100,001 - 1,000,000",
      "1,000,000+"
    ],
    "System's Data Protection Categorization": [
      "Low ",
      "Moderate",
      "High"
    ],
    "Business Impact Analysis Recovery Priority": [
      "Priority 1",
      "Priority 2",
      "Priority 3",
      "Priority 4"
    ]
  },
  likelihood: {
    "System Exposure": [
      "Isolated Zone",
      "Executive Branch Internet",
      "Internal Only",
      "MNET",
      "Internet"
    ],
    "Number of Application and System Administrators": [
      "1 - 10",
      "11 - 50",
      "51 - 100",
      "over 100"
    ],
    "System Support Group": [
      "MNIT Services",
      "Other Support"
    ],
    "Physical Access": [
      "MNIT Data Center",
      "Agency or Vendor Data Center",
      "General State Employee Access - Not public",
      "Public or Unsecured"
    ]
  }
};

const RESP_OPTS = ['Full', 'Partial', 'None', 'N/A'];

function getRiskColor(level: string) {
  if (level === 'Severe') return '#ef4444';
  if (level === 'High') return '#f97316';
  if (level === 'Medium') return '#fbbf24';
  if (level === 'Low') return '#10b981';
  return '#9ca3af';
}

export default function RiskAssessmentTab() {
  const { workbook, updateSection, loading } = useWorkbook();
  const [score, setScore] = useState<SSPWorkbookRiskScore | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  const ra = workbook?.riskAssessment || {
    impact: {},
    likelihood: {},
    questions: [],
    questionDefinitions: [],
    dateCompleted: ''
  };

  useEffect(() => {
    if (!workbook) return;
    setScoreLoading(true);
    api.getSSPWorkbookRiskScore(workbook.assessmentId)
      .then(res => setScore(res))
      .catch(err => console.error(err))
      .finally(() => setScoreLoading(false));
  }, [workbook?.riskAssessment]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const handleImpactChange = (field: string, value: string) => {
    updateSection('riskAssessment', {
      ...ra,
      impact: {
        ...(ra.impact || {}),
        [field]: value
      }
    });
  };

  const handleLikelihoodChange = (field: string, value: string) => {
    updateSection('riskAssessment', {
      ...ra,
      likelihood: {
        ...(ra.likelihood || {}),
        [field]: value
      }
    });
  };

  const handleQuestionResponseChange = (index: number, value: string) => {
    const nextQuestions = [...(ra.questions || [])];
    if (!nextQuestions[index]) {
      nextQuestions[index] = { response: '', notes: '' };
    }
    nextQuestions[index] = {
      ...nextQuestions[index],
      response: value
    };
    updateSection('riskAssessment', {
      ...ra,
      questions: nextQuestions
    });
  };

  const handleQuestionNotesChange = (index: number, value: string) => {
    const nextQuestions = [...(ra.questions || [])];
    if (!nextQuestions[index]) {
      nextQuestions[index] = { response: '', notes: '' };
    }
    nextQuestions[index] = {
      ...nextQuestions[index],
      notes: value
    };
    updateSection('riskAssessment', {
      ...ra,
      questions: nextQuestions
    });
  };

  const handleDateChange = (value: string) => {
    updateSection('riskAssessment', {
      ...ra,
      dateCompleted: value
    });
  };

  const qDefs = ra.questionDefinitions || [];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">Risk Assessment</Typography>
        <Typography variant="body2" color="text.secondary">
          Complete the Impact and Likelihood variables, then answer the 20 controls questions to assess inherent systems risks.
        </Typography>
      </Box>

      {/* Live Score Summary Card */}
      <Card sx={{ mb: 4, borderRadius: 3, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Live Score Summary</Typography>
            {scoreLoading && <CircularProgress size={16} />}
          </Box>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'grey.50', borderRadius: 2, minWidth: 120, border: '1px solid #f3f4f6' }}>
              <Typography variant="h5" fontWeight={800} color="primary.main">
                {score?.impactScore ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Impact Score</Typography>
            </Box>
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'grey.50', borderRadius: 2, minWidth: 120, border: '1px solid #f3f4f6' }}>
              <Typography variant="h5" fontWeight={800} color="primary.main">
                {score?.impactRating ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Impact Rating</Typography>
            </Box>
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'grey.50', borderRadius: 2, minWidth: 120, border: '1px solid #f3f4f6' }}>
              <Typography variant="h5" fontWeight={800} color="primary.main">
                {score?.likelihoodScore !== null ? score?.likelihoodScore?.toFixed(2) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Likelihood Score</Typography>
            </Box>
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'grey.50', borderRadius: 2, minWidth: 120, border: '1px solid #f3f4f6' }}>
              <Typography variant="h5" fontWeight={800} color="primary.main">
                {score?.likelihoodRating ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Likelihood Rating</Typography>
            </Box>
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'grey.50', borderRadius: 2, minWidth: 160, border: '1px solid #f3f4f6' }}>
              <Chip
                label={score?.overallRisk || 'Not Calculated'}
                sx={{
                  bgcolor: `${getRiskColor(score?.overallRisk || '')}20`,
                  color: getRiskColor(score?.overallRisk || ''),
                  fontWeight: 800,
                  fontSize: 14,
                  borderRadius: 1.5
                }}
              />
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mt: 0.5 }}>
                Overall Risk Rating
              </Typography>
            </Box>
          </Box>
          {score?.applicableCount !== undefined && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Overall Likelihood (from control questions): {score?.overallLikelihoodQ?.toFixed(2) ?? '—'} avg points missed across {score.applicableCount} applicable question(s).
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Impact Variables */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>Impact Risk Rating Factors</Typography>
          {Object.entries(RISK_VARS.impact).map(([field, options]) => (
            <FormControl key={field} fullWidth size="small">
              <InputLabel>{field}</InputLabel>
              <Select
                label={field}
                value={ra.impact?.[field] || ''}
                onChange={(e) => handleImpactChange(field, e.target.value)}
              >
                <MenuItem value=""><em>-- Select --</em></MenuItem>
                {options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </Select>
            </FormControl>
          ))}
        </CardContent>
      </Card>

      {/* Likelihood Variables */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>Likelihood Risk Rating Factors</Typography>
          {Object.entries(RISK_VARS.likelihood).map(([field, options]) => (
            <FormControl key={field} fullWidth size="small">
              <InputLabel>{field}</InputLabel>
              <Select
                label={field}
                value={ra.likelihood?.[field] || ''}
                onChange={(e) => handleLikelihoodChange(field, e.target.value)}
              >
                <MenuItem value=""><em>-- Select --</em></MenuItem>
                {options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </Select>
            </FormControl>
          ))}

          <TextField
            label="Date Completed"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={ra.dateCompleted || ''}
            onChange={(e) => handleDateChange(e.target.value)}
            size="small"
            sx={{ maxWidth: 220, mt: 1 }}
          />
        </CardContent>
      </Card>

      {/* Questions List */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, pl: 1 }}>Control Questions (1–20)</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {qDefs.map((q: any, idx: number) => {
          const ans = ra.questions?.[idx] || { response: '', notes: '' };
          return (
            <Card key={idx} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" fontWeight={700} color="grey.800" gutterBottom>
                  {q.text}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1.5 }}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select
                      value={ans.response || ''}
                      onChange={(e) => handleQuestionResponseChange(idx, e.target.value)}
                      displayEmpty
                      renderValue={(sel) => sel || <Typography variant="caption" color="text.disabled">Compliant?</Typography>}
                    >
                      <MenuItem value=""><em>Compliant?</em></MenuItem>
                      {RESP_OPTS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField
                    sx={{ flexGrow: 1 }}
                    placeholder="Notes / evidence / justification..."
                    value={ans.notes || ''}
                    onChange={(e) => handleQuestionNotesChange(idx, e.target.value)}
                    size="small"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                  Standard: <b>{q.standard}</b> &nbsp;•&nbsp; Related control: <b>{q.controlName}</b> &nbsp;•&nbsp; Max points: <b>{q.maxPoints}</b>
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
