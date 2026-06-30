import { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';

import { api } from '../../services/api';
import type { Question } from '../../services/api';
import QuestionCard from '../AssessmentDetail/QuestionCard';
import type { AnswerValue, YesNoJustification } from '../AssessmentDetail/QuestionCard';
import { useWorkspace } from './AssessmentWorkspace';

export default function AssessmentControls() {
  const { assessment, refreshAssessment } = useWorkspace();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initAnswers = (qs: Question[]): Record<string, AnswerValue> => {
    const acc: Record<string, AnswerValue> = {};
    for (const q of qs) {
      acc[q.id] = {
        yesNo: q.answerYesNo ?? '',
        justification: q.answerJustification ?? '',
      };
    }
    return acc;
  };

  const isAnswered = (val?: AnswerValue): boolean => {
    if (!val) return false;
    if (typeof val === 'string') return !!val;
    return !!val.yesNo;
  };

  const toSubmission = (qId: string, val: AnswerValue) => {
    const defaultObj: YesNoJustification = { yesNo: '', justification: '' };
    const obj = typeof val === 'object' ? val : defaultObj;
    return {
      questionId: qId,
      yesNo: obj.yesNo,
      justification: obj.justification,
      value: obj.yesNo,
    };
  };

  useEffect(() => {
    const loadQuestions = async () => {
      if (!assessment) return;
      try {
        const data = await api.getAssessmentQuestions(assessment.id);
        setQuestions(data);
        setAnswers(initAnswers(data));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [assessment]);

  // Auto-save 60 s after last change
  useEffect(() => {
    if (!assessment || saving || loading) return;
    autoSaveTimer.current && clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveAnswers(true), 60_000);
    return () => { autoSaveTimer.current && clearTimeout(autoSaveTimer.current); };
  }, [answers]);

  const handleAnswerChange = useCallback((questionId: string, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const saveAnswers = async (auto = false) => {
    if (!assessment) return;
    setSaving(true);
    setSaveError(null);
    setSuccessMsg(null);
    try {
      const submissions = Object.entries(answers).map(([qId, val]) => toSubmission(qId, val));
      await api.submitAnswers(assessment.id, submissions);
      refreshAssessment(); // Update overall completion ring
      if (!auto) {
        setSuccessMsg('Progress saved successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !assessment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Group questions by family
  const byFamily: Record<string, Question[]> = {};
  for (const q of questions) {
    const fid = q.familyId || 'General';
    if (!byFamily[fid]) byFamily[fid] = [];
    byFamily[fid].push(q);
  }
  const familyIds = Object.keys(byFamily);

  const isLocked = assessment.status === 'submitted' || assessment.status === 'reviewed';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      {/* Top Header bar with save button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Configure responses for scoped controls. Changes are automatically saved every 60 seconds.
        </Typography>
        {!isLocked && (
          <Button
            variant="contained"
            color="primary"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={() => { autoSaveTimer.current && clearTimeout(autoSaveTimer.current); saveAnswers(false); }}
            disabled={saving}
            sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
          >
            {saving ? 'Saving…' : 'Save Progress'}
          </Button>
        )}
      </Box>

      {saveError && <Alert severity="error" sx={{ borderRadius: 2 }}>{saveError}</Alert>}
      {successMsg && <Alert severity="success" sx={{ borderRadius: 2 }}>{successMsg}</Alert>}
      {isLocked && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          This assessment is locked. Answers cannot be modified.
        </Alert>
      )}

      {/* Accordions grouped by Family */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {familyIds.length > 0 ? familyIds.map(fid => {
          const qs = byFamily[fid];
          const answered = qs.filter(q => isAnswered(answers[q.id])).length;
          return (
            <Accordion key={fid} defaultExpanded sx={{ border: '1px solid #e2e8f0', borderRadius: '12px !important', boxShadow: 'none', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography fontWeight={750} color="#0f172a">
                    {qs[0]?.familyName ?? fid}
                  </Typography>
                  <Chip
                    label={`${answered} / ${qs.length} answered`}
                    size="small"
                    color={answered === qs.length ? 'success' : 'default'}
                    sx={{ fontWeight: 650, fontSize: 11 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0, px: 3, pb: 3 }}>
                {qs.map((q, i) => (
                  <Box key={q.id}>
                    <QuestionCard question={q} answer={answers[q.id] ?? ''} onChange={handleAnswerChange} readonly={isLocked} />
                    {i < qs.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          );
        }) : (
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No questions found in scope for this assessment.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

    </Box>
  );
}
