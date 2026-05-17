import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import type { Assessment, Framework, Question, AnswerSubmission } from '../../services/api';
import QuestionCard from './QuestionCard';
import type { AnswerValue, YesNoJustification } from './QuestionCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByFamily(questions: Question[]): Record<string, Question[]> {
  return questions.reduce<Record<string, Question[]>>((acc, q) => {
    (acc[q.familyId] = acc[q.familyId] ?? []).push(q);
    return acc;
  }, {});
}

function isAnswered(answer: AnswerValue): boolean {
  if (!answer) return false;
  if (typeof answer === 'string') return answer.trim().length > 0;
  return answer.yesNo.length > 0;
}

function toSubmission(questionId: string, answer: AnswerValue): AnswerSubmission {
  if (typeof answer === 'string') return { questionId, value: answer.trim() };
  const a = answer as YesNoJustification;
  return { questionId, yesNo: a.yesNo, justification: a.justification };
}

function initAnswers(questions: Question[]): Record<string, AnswerValue> {
  const map: Record<string, AnswerValue> = {};
  questions.forEach(q => {
    // Always use object format — every question gets Yes/No + narrative
    map[q.id] = { yesNo: q.answerYesNo ?? '', justification: q.answerJustification ?? (q.answerValue ?? '') };
  });
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Load assessment + frameworks + questions in one shot
  const fetchAll = useCallback(
    () => Promise.all([
      api.getAssessment(id!),
      api.getFrameworks(),
      api.getAssessmentQuestions(id!),
    ]),
    [id],
  );
  const { data, loading, error, execute } = useAsync(fetchAll, true);

  const [assessment, frameworks, questions]: [Assessment, Framework[], Question[]] =
    (data as [Assessment, Framework[], Question[]]) ?? [null, [], []];

  // Answer state — initialised once questions arrive
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  useEffect(() => {
    if (questions?.length) setAnswers(initAnswers(questions));
  }, [questions]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [latestAssessment, setLatestAssessment] = useState<Assessment | null>(null);

  // Auto-save 60 s after last change
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!assessment || saving) return;
    autoSaveTimer.current && clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveAnswers(true), 60_000);
    return () => { autoSaveTimer.current && clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  const handleAnswerChange = useCallback((questionId: string, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const saveAnswers = async (auto = false) => {
    if (!assessment) return;
    setSaving(true);
    setSaveError(null);
    try {
      const submissions = Object.entries(answers).map(([qId, val]) => toSubmission(qId, val));
      const summary = await api.submitAnswers(assessment.id, submissions);
      // Merge the updated stats into the full assessment object so frameworkIds etc. are preserved
      setLatestAssessment(prev => ({
        ...(prev ?? assessment),
        questionStats: {
          totalQuestions: summary.totalQuestions,
          answeredQuestions: summary.answeredQuestions,
          completionPercent: summary.completionPercent,
        },
      }));
      if (!auto) setToast('Progress saved!');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
  }

  if (error || !assessment) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }} action={<Button size="small" onClick={execute}>Retry</Button>}>
          {error ?? 'Assessment not found'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/assessments')}>
          Back
        </Button>
      </Box>
    );
  }

  const shown = latestAssessment ?? assessment;
  const byFamily = groupByFamily(questions ?? []);
  const familyIds = Object.keys(byFamily);
  const frameworkName = (fid: string) => frameworks.find(f => f.id === fid)?.name ?? fid;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={() => navigate('/assessments')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">{shown.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {shown.frameworkIds.map(frameworkName).join(' · ')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={() => { autoSaveTimer.current && clearTimeout(autoSaveTimer.current); saveAnswers(false); }}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Progress'}
        </Button>
      </Box>

      {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
        {/* ── Questions column ── */}
        <Box sx={{ flex: 1 }}>
          {/* Progress card */}
          {shown.questionStats && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Progress</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={shown.questionStats.completionPercent}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    color={
                      shown.questionStats.completionPercent >= 80 ? 'success'
                      : shown.questionStats.completionPercent >= 50 ? 'warning' : 'error'
                    }
                  />
                  <Typography variant="h6" fontWeight={700}>
                    {shown.questionStats.completionPercent.toFixed(1)}%
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {shown.questionStats.answeredQuestions} / {shown.questionStats.totalQuestions} questions answered
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Questions grouped by family */}
          {familyIds.length > 0 ? familyIds.map(fid => {
            const qs = byFamily[fid];
            const answered = qs.filter(q => isAnswered(answers[q.id])).length;
            return (
              <Accordion key={fid} defaultExpanded sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography fontWeight={600}>{qs[0]?.familyName ?? fid}</Typography>
                    <Chip
                      label={`${answered} / ${qs.length} answered`}
                      size="small"
                      color={answered === qs.length ? 'success' : 'default'}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {qs.map((q, i) => (
                    <Box key={q.id}>
                      <QuestionCard question={q} answer={answers[q.id] ?? ''} onChange={handleAnswerChange} />
                      {i < qs.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            );
          }) : (
            <Card>
              <CardContent>
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No questions found for this assessment.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* ── Summary sidebar ── */}
        <Box sx={{ width: { xs: '100%', lg: 320 } }}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Summary</Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>Frameworks</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                {shown.frameworkIds.map(fid => (
                  <Chip key={fid} label={frameworkName(fid)} size="small" color="primary" variant="outlined" />
                ))}
              </Box>

              {shown.questionStats && (
                <>
                  <Divider sx={{ my: 2 }} />
                  {[
                    { label: 'Total Questions', value: shown.questionStats.totalQuestions, color: 'info.main' },
                    { label: 'Answered', value: shown.questionStats.answeredQuestions, color: 'success.main' },
                    { label: 'Completion', value: `${shown.questionStats.completionPercent.toFixed(1)}%`, color: 'warning.main' },
                  ].map(({ label, value, color }) => (
                    <Box key={label} sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">{label}</Typography>
                      <Typography variant="h5" fontWeight={700} color={color}>{value}</Typography>
                    </Box>
                  ))}
                </>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {shown.id}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Box>
  );
}
