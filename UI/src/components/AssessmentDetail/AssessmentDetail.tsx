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
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import LockIcon from '@mui/icons-material/Lock';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import type { Assessment, Framework, Question, AnswerSubmission, AssessmentSummary, StateHistoryEntry } from '../../services/api';
import QuestionCard from './QuestionCard';
import type { AnswerValue, YesNoJustification } from './QuestionCard';
import RiskScoreDashboard from '../RiskScore/RiskScoreDashboard';
import CsfProfile from '../CsfProfile/CsfProfile';

// Status helpers
const STATUS_META: Record<string, { label: string; next: string | null; nextLabel: string | null; chipColor: string; chipBg: string; locked?: boolean }> = {
  draft:       { label: 'Draft',       next: 'in_progress', nextLabel: 'Start Assessment',   chipColor: '#6b7280', chipBg: '#f3f4f6' },
  in_progress: { label: 'In Progress', next: 'submitted',   nextLabel: 'Submit for Review',  chipColor: '#2563eb', chipBg: '#eff6ff' },
  submitted:   { label: 'Submitted',   next: 'reviewed',      nextLabel: 'Mark Reviewed',       chipColor: '#d97706', chipBg: '#fffbeb', locked: true },
  reviewed:    { label: 'Reviewed',    next: 'completed',     nextLabel: 'Complete Assessment', chipColor: '#7c3aed', chipBg: '#f5f3ff', locked: true },
  remediation: { label: 'Remediation', next: 'submitted',     nextLabel: 'Re-Submit',           chipColor: '#b45309', chipBg: '#fef3c7' },
  completed:   { label: 'Completed',   next: 'archived',    nextLabel: 'Archive',             chipColor: '#059669', chipBg: '#ecfdf5', locked: true },
  archived:    { label: 'Archived',    next: null,          nextLabel: null,                  chipColor: '#374151', chipBg: '#f9fafb', locked: true },
};

const LOCKED_STATUSES = new Set(['submitted', 'reviewed', 'completed', 'archived']);

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
  if (typeof answer === 'string') return { questionId, value: answer.trim() || undefined };
  const a = answer as YesNoJustification;
  return {
    questionId,
    // Only send yesNo if it's a non-empty value — empty string fails backend pattern validation
    ...(a.yesNo ? { yesNo: a.yesNo } : {}),
    ...(a.justification ? { justification: a.justification } : {}),
  };
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
  const [transitioning, setTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [stateHistory, setStateHistory] = useState<StateHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [autoPoamLoading, setAutoPoamLoading] = useState(false);

  // Auto-save 60 s after last change
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!assessment || saving) return;
    autoSaveTimer.current && clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveAnswers(true), 60_000);
    return () => { autoSaveTimer.current && clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  // Load state history when history tab is opened
  useEffect(() => {
    if (activeTab === 3 && id) {
      setHistoryLoading(true);
      api.getStateHistory(id)
        .then(setStateHistory)
        .catch(() => {})
        .finally(() => setHistoryLoading(false));
    }
  }, [activeTab, id]);

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
        riskScore: (summary as AssessmentSummary).riskScore,
      }));
      if (!auto) setToast('Progress saved!');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Status transition ─────────────────────────────────────────────────────

  const advanceStatus = async () => {
    const current = latestAssessment ?? assessment;
    const meta = STATUS_META[current.status];
    if (!meta?.next) return;
    setTransitioning(true);
    try {
      await api.updateAssessmentStatus(current.id, meta.next);
      setLatestAssessment(prev => ({ ...(prev ?? assessment), status: meta.next as Assessment['status'] }));
      setToast(`Status updated to: ${STATUS_META[meta.next!]?.label}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setTransitioning(false);
    }
  };

  // ── Report downloads ──────────────────────────────────────────────────────

  const downloadReport = async (type: 'executive-summary' | 'technical' | 'gap-analysis') => {
    if (!id) return;
    setDownloadingReport(type);
    try {
      const { blob, mimeType } = await api.downloadReport(id, type);
      const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
      const a = document.createElement('a');
      a.href = url;
      const ext = type === 'gap-analysis' ? 'xlsx' : 'pdf';
      a.download = `${(latestAssessment ?? assessment)?.name ?? id}_${type}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : `Failed to download ${type} report`);
    } finally {
      setDownloadingReport(null);
    }
  };

  // ── Auto-generate POA&M ───────────────────────────────────────────────────

  const autoGeneratePoam = async () => {
    if (!id) return;
    setAutoPoamLoading(true);
    try {
      const res = await api.autoGeneratePoam(id);
      setToast(res.message);
    } catch {
      setSaveError('Failed to auto-generate POA&M');
    } finally {
      setAutoPoamLoading(false);
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
  const statusMeta = STATUS_META[shown.status] ?? STATUS_META['in_progress'];
  const isLocked = LOCKED_STATUSES.has(shown.status);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/assessments')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h4">{shown.name}</Typography>
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: 2, bgcolor: statusMeta.chipBg, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              {isLocked && <LockIcon sx={{ fontSize: 13, color: statusMeta.chipColor }} />}
              <Typography variant="caption" fontWeight={700} sx={{ color: statusMeta.chipColor }}>
                {statusMeta.label}
              </Typography>
            </Box>
            {shown.riskScore != null && (
              <Box sx={{ px: 1.5, py: 0.4, borderRadius: 2, bgcolor: shown.riskScore >= 75 ? '#ecfdf5' : shown.riskScore >= 50 ? '#fffbeb' : '#fef2f2' }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: shown.riskScore >= 75 ? '#059669' : shown.riskScore >= 50 ? '#d97706' : '#dc2626' }}>
                  Risk Score: {shown.riskScore}%
                </Typography>
              </Box>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {shown.frameworkIds.map(frameworkName).join(' · ')}
          </Typography>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {statusMeta.next && (
            <Button
              variant="outlined"
              onClick={advanceStatus}
              disabled={transitioning}
              sx={{ borderColor: statusMeta.chipColor, color: statusMeta.chipColor }}
            >
              {transitioning ? <CircularProgress size={16} color="inherit" /> : statusMeta.nextLabel}
            </Button>
          )}
          {!isLocked && (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={() => { autoSaveTimer.current && clearTimeout(autoSaveTimer.current); saveAnswers(false); }}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Progress'}
            </Button>
          )}
        </Box>
      </Box>

      {saveError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>{saveError}</Alert>}
      {isLocked && (
        <Alert severity="info" icon={<LockIcon />} sx={{ mb: 2 }}>
          This assessment is locked in <strong>{statusMeta.label}</strong> status. Answers cannot be modified.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Questions" />
        <Tab label="Risk Score" />
        <Tab label="CSF Profile" />
        <Tab label="History" />
        <Tab label="Reports" />
      </Tabs>

      {/* ── Tab 0: Questions ─────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Questions column */}
          <Box sx={{ flex: 1 }}>
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
                        <QuestionCard question={q} answer={answers[q.id] ?? ''} onChange={handleAnswerChange} readonly={isLocked} />
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

          {/* Summary sidebar */}
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
                <Tooltip title="Create POA&M items for all unanswered controls">
                  <Button
                    fullWidth variant="outlined" color="warning" size="small"
                    startIcon={autoPoamLoading ? <CircularProgress size={14} color="inherit" /> : <AutoFixHighIcon />}
                    onClick={autoGeneratePoam}
                    disabled={autoPoamLoading}
                    sx={{ mb: 1 }}
                  >
                    Auto-generate POA&M
                  </Button>
                </Tooltip>

                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {shown.id}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* ── Tab 1: Risk Score ─────────────────────────────────────────────── */}
      {activeTab === 1 && id && <RiskScoreDashboard assessmentId={id} />}

      {/* ── Tab 2: CSF Profile ───────────────────────────────────────────── */}
      {activeTab === 2 && id && <CsfProfile assessmentId={id} />}

      {/* ── Tab 3: History ──────────────────────────────────────────────── */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>State Transition History</Typography>
            {historyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : stateHistory.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>No transitions yet.</Typography>
            ) : (
              <List dense>
                {stateHistory.map((entry, i) => (
                  <ListItem key={entry.id ?? i} divider={i < stateHistory.length - 1}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Chip label={STATUS_META[entry.fromStatus]?.label ?? entry.fromStatus} size="small" />
                          <Typography variant="body2">→</Typography>
                          <Chip label={STATUS_META[entry.toStatus]?.label ?? entry.toStatus} size="small" color="primary" />
                          {entry.note && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{entry.note}</Typography>}
                        </Box>
                      }
                      secondary={`${new Date(entry.changedAt).toLocaleString()} · ${entry.changedByName ?? entry.changedByEmail ?? 'Unknown'}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 4: Reports ──────────────────────────────────────────────── */}
      {activeTab === 4 && (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {[
            { type: 'executive-summary' as const, title: 'Executive Summary', desc: 'High-level risk overview, gap summary, and key metrics for stakeholders.', ext: 'PDF' },
            { type: 'technical' as const, title: 'Technical Assessment Report', desc: 'Full control-by-control breakdown with answers and implementation status.', ext: 'PDF' },
            { type: 'gap-analysis' as const, title: 'Gap Analysis', desc: 'Spreadsheet of all not-implemented or partially-implemented controls.', ext: 'XLSX' },
          ].map(({ type, title, desc, ext }) => (
            <Card key={type} sx={{ flex: '1 1 280px', maxWidth: 360 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
                  <Chip label={ext} size="small" color={ext === 'PDF' ? 'error' : 'success'} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{desc}</Typography>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={downloadingReport === type ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                  onClick={() => downloadReport(type)}
                  disabled={!!downloadingReport}
                >
                  {downloadingReport === type ? 'Downloading…' : `Download ${ext}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Box>
  );
}
