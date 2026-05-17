import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import type { Framework, Control, Family, Module, Question } from '../../services/api';
import SummaryPanel from './SummaryPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DomainMap = Record<string, Control[]>;
type FrameworkControls = Record<string, { framework: Framework; domains: DomainMap }>;

function groupByDomain(controls: Control[]): DomainMap {
  return controls.reduce<DomainMap>((acc, c) => {
    (acc[c.domain] = acc[c.domain] ?? []).push(c);
    return acc;
  }, {});
}

const CRIT_COLOR = { High: 'error' as const, Medium: 'warning' as const, Low: 'success' as const };

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewAssessment() {
  const navigate = useNavigate();

  // ── Framework list (loaded once) ──
  const { data: frameworks = [], loading: frameworksLoading, error: frameworksError } =
    useAsync(() => api.getFrameworks(), true);

  // ── Form state ──
  const [name, setName] = useState('');
  const [selectedFrameworks, setSelectedFrameworks] = useState<Framework[]>([]);
  const [selectedControlIds, setSelectedControlIds] = useState<Set<string>>(new Set());

  // ── Controls ──
  const [controlsByFw, setControlsByFw] = useState<FrameworkControls>({});
  const [controlsLoading, setControlsLoading] = useState(false);

  // ── NIST families + questions ──
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<Family[]>([]);
  const [questionsByFamily, setQuestionsByFamily] = useState<Record<string, Question[]>>({});
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // ── CSF modules + questions ──
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<Module[]>([]);
  const [questionsByModule, setQuestionsByModule] = useState<Record<string, Question[]>>({});
  const [modulesLoading, setModulesLoading] = useState(false);

  // ── Create ──
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isNist = selectedFrameworks.some(f => f.id === 'NIST-800-53');
  const isCsf  = selectedFrameworks.some(f => f.id === 'NIST-CSF-2.0');

  // Load controls when frameworks change
  useEffect(() => {
    if (!selectedFrameworks.length) { setControlsByFw({}); setSelectedControlIds(new Set()); return; }
    let cancelled = false;
    setControlsLoading(true);
    Promise.all(selectedFrameworks.map(f => api.getControls(f.id).then(c => ({ f, c }))))
      .then(results => {
        if (cancelled) return;
        const map: FrameworkControls = {};
        results.forEach(({ f, c }) => { map[f.id] = { framework: f, domains: groupByDomain(c) }; });
        setControlsByFw(map);
        setSelectedControlIds(new Set());
      })
      .catch(() => {/* handled by alert */})
      .finally(() => { if (!cancelled) setControlsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedFrameworks]);

  // Load NIST families
  useEffect(() => {
    if (!isNist) { setFamilies([]); setSelectedFamilies([]); setQuestionsByFamily({}); return; }
    let cancelled = false;
    setFamiliesLoading(true);
    api.getFamilies('NIST-800-53')
      .then(f => { if (!cancelled) setFamilies(f); })
      .finally(() => { if (!cancelled) setFamiliesLoading(false); });
    return () => { cancelled = true; };
  }, [isNist]);

  // Load CSF modules
  useEffect(() => {
    if (!isCsf) { setModules([]); setSelectedModules([]); setQuestionsByModule({}); return; }
    let cancelled = false;
    setModulesLoading(true);
    api.getFrameworkModules('NIST-CSF-2.0')
      .then(m => { if (!cancelled) setModules(m); })
      .finally(() => { if (!cancelled) setModulesLoading(false); });
    return () => { cancelled = true; };
  }, [isCsf]);

  // Load NIST questions when families selected
  useEffect(() => {
    if (!selectedFamilies.length) { setQuestionsByFamily({}); return; }
    let cancelled = false;
    setQuestionsLoading(true);
    Promise.all(selectedFamilies.map(f =>
      api.getQuestions('NIST-800-53', f.familyId).then(qs => ({ id: f.familyId, qs })),
    )).then(results => {
      if (cancelled) return;
      const map: Record<string, Question[]> = {};
      results.forEach(({ id, qs }) => { map[id] = qs; });
      setQuestionsByFamily(map);
    }).finally(() => { if (!cancelled) setQuestionsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedFamilies]);

  // Load CSF questions when modules selected
  useEffect(() => {
    if (!selectedModules.length) { setQuestionsByModule({}); return; }
    let cancelled = false;
    setQuestionsLoading(true);
    const ids = selectedModules.map(m => m.moduleId);
    api.getQuestionsByModules('NIST-CSF-2.0', ids)
      .then(qs => {
        if (cancelled) return;
        const map: Record<string, Question[]> = {};
        qs.forEach(q => {
          const key = q.functionId ?? 'other';
          (map[key] = map[key] ?? []).push(q);
        });
        setQuestionsByModule(map);
      })
      .finally(() => { if (!cancelled) setQuestionsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedModules]);

  // ── Derived totals ──
  const totalControls = Object.values(controlsByFw).reduce(
    (sum, { domains }) => sum + Object.values(domains).flat().length, 0,
  );
  const allQuestions: Question[] = [
    ...Object.values(questionsByFamily).flat(),
    ...Object.values(questionsByModule).flat(),
  ].filter((q, i, arr) => arr.findIndex(x => x.id === q.id) === i);

  // ── Control toggle helpers ──
  const toggleControl = useCallback((id: string) => {
    setSelectedControlIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAllDomain = (controls: Control[]) => {
    const ids = controls.map(c => c.id);
    const allSelected = ids.every(id => selectedControlIds.has(id));
    setSelectedControlIds(prev => {
      const next = new Set(prev);
      allSelected ? ids.forEach(id => next.delete(id)) : ids.forEach(id => next.add(id));
      return next;
    });
  };

  // ── Submit ──
  const handleCreate = async () => {
    if (!name.trim()) { setCreateError('Please enter an assessment name.'); return; }
    if (!selectedFrameworks.length) { setCreateError('Please select at least one framework.'); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const assessment = await api.createAssessment({
        name: name.trim(),
        frameworkIds: selectedFrameworks.map(f => f.id),
        selectedControlIds: Array.from(selectedControlIds),
        selectedQuestionIds: allQuestions.map(q => q.id),
        familyIds: selectedFamilies.map(f => f.familyId),
        moduleIds: selectedModules.map(m => m.moduleId),
      });
      navigate(`/assessments/${assessment.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create assessment');
      setCreating(false);
    }
  };

  // ── Render ──
  if (frameworksLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
  }

  if (frameworksError) {
    return <Alert severity="error">{frameworksError}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>Create New Assessment</Typography>
        <Typography variant="body2" color="text.secondary">
          Select frameworks, controls, and question banks to build your compliance assessment.
        </Typography>
      </Box>

      {createError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCreateError(null)}>{createError}</Alert>}

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'flex-start' }}>
        {/* ── Main form ── */}
        <Box sx={{ flex: 1 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Assessment Details</Typography>
              <TextField
                fullWidth
                label="Assessment Name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., SOC 2 Security Review Q4 2025"
              />
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Frameworks</Typography>
              <Autocomplete
                multiple
                options={frameworks}
                getOptionLabel={o => o.name}
                value={selectedFrameworks}
                onChange={(_, v) => setSelectedFrameworks(v)}
                renderTags={(val, props) =>
                  val.map((o, i) => <Chip key={o.id} label={o.name} {...props({ index: i })} />)
                }
                renderInput={params => (
                  <TextField {...params} placeholder="Choose compliance frameworks…" />
                )}
              />
            </CardContent>
          </Card>

          {/* Controls */}
          {selectedFrameworks.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Controls</Typography>
                {controlsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
                ) : (
                  Object.entries(controlsByFw).map(([fwId, { framework, domains }]) => (
                    <Box key={fwId} sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" color="primary.main" fontWeight={600} gutterBottom>
                        {framework.name}
                      </Typography>
                      {Object.entries(domains).map(([domain, controls]) => {
                        const domainSelected = controls.every(c => selectedControlIds.has(c.id));
                        return (
                          <Accordion key={`${fwId}-${domain}`} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'grey.50' }}>
                              <FormControlLabel
                                onClick={e => e.stopPropagation()}
                                control={
                                  <Checkbox
                                    checked={domainSelected}
                                    indeterminate={controls.some(c => selectedControlIds.has(c.id)) && !domainSelected}
                                    onChange={() => toggleAllDomain(controls)}
                                    size="small"
                                  />
                                }
                                label={
                                  <Typography variant="subtitle2" fontWeight={500}>
                                    {domain} ({controls.length})
                                  </Typography>
                                }
                              />
                            </AccordionSummary>
                            <AccordionDetails>
                              {controls.map(c => (
                                <FormControlLabel
                                  key={c.id}
                                  control={
                                    <Checkbox
                                      checked={selectedControlIds.has(c.id)}
                                      onChange={() => toggleControl(c.id)}
                                      size="small"
                                    />
                                  }
                                  label={
                                    <Box>
                                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Typography variant="body2" fontWeight={500}>{c.title}</Typography>
                                        <Chip
                                          size="small"
                                          label={c.criticality}
                                          color={CRIT_COLOR[c.criticality] ?? 'default'}
                                          variant="outlined"
                                        />
                                      </Box>
                                      <Typography variant="caption" color="text.secondary">{c.description}</Typography>
                                    </Box>
                                  }
                                  sx={{ width: '100%', alignItems: 'flex-start', mb: 0.5 }}
                                />
                              ))}
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* NIST Families */}
          {isNist && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>NIST 800-53 Families</Typography>
                {familiesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
                ) : (
                  <Box>
                    <Button
                      size="small" variant="outlined" sx={{ mb: 2 }}
                      onClick={() =>
                        setSelectedFamilies(selectedFamilies.length === families.length ? [] : [...families])
                      }
                    >
                      {selectedFamilies.length === families.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {families.map(f => {
                        const active = selectedFamilies.some(sf => sf.id === f.id);
                        return (
                          <Chip
                            key={f.id}
                            label={`${f.familyId} — ${f.familyName}`}
                            onClick={() =>
                              setSelectedFamilies(
                                active ? selectedFamilies.filter(sf => sf.id !== f.id)
                                       : [...selectedFamilies, f],
                              )
                            }
                            color={active ? 'primary' : 'default'}
                            variant={active ? 'filled' : 'outlined'}
                            clickable
                          />
                        );
                      })}
                    </Box>
                    {questionsLoading && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2" color="text.secondary">Loading questions…</Typography>
                      </Box>
                    )}
                    {selectedFamilies.length > 0 && !questionsLoading && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {Object.values(questionsByFamily).flat().length} questions loaded
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* CSF Modules */}
          {isCsf && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>CSF 2.0 Modules</Typography>
                {modulesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
                ) : (
                  <Box>
                    <Button
                      size="small" variant="outlined" sx={{ mb: 2 }}
                      onClick={() =>
                        setSelectedModules(selectedModules.length === modules.length ? [] : [...modules])
                      }
                    >
                      {selectedModules.length === modules.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {modules.map(m => {
                        const active = selectedModules.some(sm => sm.moduleId === m.moduleId);
                        return (
                          <Chip
                            key={m.moduleId}
                            label={`${m.moduleName} (${m.questionCount})`}
                            onClick={() =>
                              setSelectedModules(
                                active ? selectedModules.filter(sm => sm.moduleId !== m.moduleId)
                                       : [...selectedModules, m],
                              )
                            }
                            color={active ? 'primary' : 'default'}
                            variant={active ? 'filled' : 'outlined'}
                            clickable
                          />
                        );
                      })}
                    </Box>
                    {questionsLoading && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2" color="text.secondary">Loading questions…</Typography>
                      </Box>
                    )}
                    {selectedModules.length > 0 && !questionsLoading && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {Object.values(questionsByModule).flat().length} questions loaded
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>

        {/* ── Summary sidebar ── */}
        <Box sx={{ width: { xs: '100%', lg: 320 } }}>
          <SummaryPanel
            name={name}
            selectedFrameworks={selectedFrameworks}
            totalControls={totalControls}
            selectedControls={selectedControlIds.size}
            selectedFamilies={selectedFamilies}
            selectedModules={selectedModules}
            totalQuestions={allQuestions.length}
            creating={creating}
            onSubmit={handleCreate}
          />
        </Box>
      </Box>
    </Box>
  );
}
