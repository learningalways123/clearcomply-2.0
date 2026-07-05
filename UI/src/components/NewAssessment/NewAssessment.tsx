import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';


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
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || undefined;

  // ── Framework list (loaded once) ──
  const { data: frameworks = [], loading: frameworksLoading, error: frameworksError } =
    useAsync(() => api.getFrameworks(), true);

  // ── Form state ──
  const [name, setName] = useState('');
  const [selectedFrameworks, setSelectedFrameworks] = useState<Framework[]>([]);
  const [selectedControlIds, setSelectedControlIds] = useState<Set<string>>(new Set());

  // Default to NIST 800-53 when frameworks load
  useEffect(() => {
    if (frameworks && frameworks.length > 0 && selectedFrameworks.length === 0) {
      const nist = frameworks.find(f => f.id === 'NIST-800-53');
      if (nist) {
        setSelectedFrameworks([nist]);
      }
    }
  }, [frameworks, selectedFrameworks]);

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
  const isSoc2 = selectedFrameworks.some(f => f.id === 'SOC2');

  // Scoping state
  const [soc2AssessmentType, setSoc2AssessmentType] = useState<'Type I' | 'Type II'>('Type I');
  const [soc2Categories, setSoc2Categories] = useState<string[]>(['Security']);
  const [nistConfidentiality, setNistConfidentiality] = useState<'Low' | 'Moderate' | 'High'>('Low');
  const [nistIntegrity, setNistIntegrity] = useState<'Low' | 'Moderate' | 'High'>('Low');
  const [nistAvailability, setNistAvailability] = useState<'Low' | 'Moderate' | 'High'>('Low');

  // Helpers
  const getOverallNistBaseline = (c: string, i: string, a: string) => {
    const levels = ['Low', 'Moderate', 'High'];
    const cIdx = levels.indexOf(c);
    const iIdx = levels.indexOf(i);
    const aIdx = levels.indexOf(a);
    const maxIdx = Math.max(cIdx, iIdx, aIdx);
    return levels[maxIdx] || 'Low';
  };

  const simpleHash = (s: string): number => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h) + s.charCodeAt(i);
    }
    return h >>> 0;
  };

  const isControlInScope = (c: Control) => {
    if (c.frameworkId === 'SOC2') {
      const cats = soc2Categories.map(cat => cat.toLowerCase());
      if (c.id.toLowerCase().includes('cc') && (cats.includes('security') || cats.includes('cc'))) return true;
      if (c.id.toLowerCase().includes('-a') && (cats.includes('availability') || cats.includes('a'))) return true;
      if (c.id.toLowerCase().includes('-c') && (cats.includes('confidentiality') || cats.includes('c'))) return true;
      if (c.id.toLowerCase().includes('-pi') && (cats.includes('processing integrity') || cats.includes('pi'))) return true;
      if (c.id.toLowerCase().includes('-p') && (cats.includes('privacy') || cats.includes('p'))) return true;
      return false;
    }
    if (c.frameworkId === 'NIST-800-53') {
      if (selectedFamilies.length > 0) {
        const parts = c.id.split('-');
        if (parts.length >= 2 && !selectedFamilies.some(f => f.familyId === parts[1])) {
          return false;
        }
      }
      const baseline = getOverallNistBaseline(nistConfidentiality, nistIntegrity, nistAvailability);
      const hVal = simpleHash(c.id);
      if (baseline === 'Low') {
        return hVal % 3 === 0;
      }
      if (baseline === 'Moderate') {
        return hVal % 3 === 0 || hVal % 3 === 1;
      }
      return true;
    }
    return true;
  };


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
  const isQuestionInNistBaseline = (qid: string, baselineStr: string) => {
    if (!baselineStr) return true;
    const hVal = simpleHash(qid);
    if (baselineStr === 'Low') {
      return hVal % 3 === 0;
    }
    if (baselineStr === 'Moderate') {
      return hVal % 3 === 0 || hVal % 3 === 1;
    }
    return true;
  };

  const scopedControlsByFw = Object.keys(controlsByFw).reduce<FrameworkControls>((acc, fwId) => {
    const { framework, domains } = controlsByFw[fwId];
    const filteredDomains: DomainMap = {};
    Object.keys(domains).forEach(domainName => {
      const filtered = domains[domainName].filter(isControlInScope);
      if (filtered.length > 0) {
        filteredDomains[domainName] = filtered;
      }
    });
    acc[fwId] = { framework, domains: filteredDomains };
    return acc;
  }, {});

  const totalControls = Object.values(scopedControlsByFw).reduce(
    (sum, { domains }) => sum + Object.values(domains).flat().length, 0,
  );

  const baseline = getOverallNistBaseline(nistConfidentiality, nistIntegrity, nistAvailability);
  const allQuestions: Question[] = [
    ...Object.values(questionsByFamily).flat(),
    ...Object.values(questionsByModule).flat(),
  ].filter((q, i, arr) => arr.findIndex(x => x.id === q.id) === i)
   .filter(q => !q.id.startsWith('NIST-') || isQuestionInNistBaseline(q.id, baseline));



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
        soc2AssessmentType: isSoc2 ? soc2AssessmentType : undefined,
        soc2Categories: isSoc2 ? soc2Categories : undefined,
        nistConfidentiality: isNist ? nistConfidentiality : undefined,
        nistIntegrity: isNist ? nistIntegrity : undefined,
        nistAvailability: isNist ? nistAvailability : undefined,
        projectId: projectId,
      });
      if (projectId) {
        navigate(`/projects/${projectId}`);
      } else {
        navigate(`/assessments/${assessment.id}`);
      }
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
                disabled
                options={(frameworks ?? []).filter(f => f.id === 'NIST-800-53')}
                getOptionLabel={o => o.name}
                value={selectedFrameworks}
                onChange={(_, v) => setSelectedFrameworks(v)}
                renderTags={(val, getTagProps) =>
                  val.map((o, i) => {
                    const { key, ...tagProps } = getTagProps({ index: i });
                    return <Chip key={key ?? o.id} label={o.name} {...tagProps} />;
                  })
                }
                renderInput={params => (
                  <TextField {...params} placeholder="Choose compliance frameworks…" />
                )}
              />
            </CardContent>
          </Card>

          {/* Scoping Options Card */}
          {(isSoc2 || isNist) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Scoping Configuration</Typography>
                
                {isSoc2 && (
                  <Box sx={{ mb: isNist ? 3 : 0 }}>
                    <Typography variant="subtitle2" color="primary.main" fontWeight={600} sx={{ mb: 1 }}>
                      SOC 2 Scoping Settings
                    </Typography>
                    
                    <FormControl component="fieldset" sx={{ mb: 2, display: 'block' }}>
                      <FormLabel component="legend" sx={{ fontSize: '0.85rem' }}>Assessment Type</FormLabel>
                      <RadioGroup
                        row
                        value={soc2AssessmentType}
                        onChange={e => setSoc2AssessmentType(e.target.value as 'Type I' | 'Type II')}
                      >
                        <FormControlLabel value="Type I" control={<Radio size="small" />} label="Type I (Design)" />
                        <FormControlLabel value="Type II" control={<Radio size="small" />} label="Type II (Operating)" />
                      </RadioGroup>
                    </FormControl>

                    <FormControl component="fieldset" sx={{ display: 'block' }}>
                      <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.85rem' }}>Trust Services Categories</FormLabel>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <FormControlLabel
                          control={<Checkbox checked disabled size="small" />}
                          label="Security (Common Criteria)"
                        />
                        {['Availability', 'Confidentiality', 'Processing Integrity', 'Privacy'].map(cat => {
                          const checked = soc2Categories.includes(cat);
                          return (
                            <FormControlLabel
                              key={cat}
                              control={
                                <Checkbox
                                  checked={checked}
                                  onChange={() => {
                                    setSoc2Categories(prev =>
                                      checked ? prev.filter(c => c !== cat) : [...prev, cat]
                                    );
                                  }}
                                  size="small"
                                />
                              }
                              label={cat}
                            />
                          );
                        })}
                      </Box>
                    </FormControl>
                  </Box>
                )}

                {isNist && (
                  <Box>
                    <Typography variant="subtitle2" color="primary.main" fontWeight={600} sx={{ mb: 2 }}>
                      NIST 800-53 FIPS 199 Categorization
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
                      <FormControl sx={{ minWidth: 150 }}>
                        <FormLabel sx={{ mb: 0.5, fontSize: '0.85rem' }}>Confidentiality</FormLabel>
                        <Select
                          size="small"
                          value={nistConfidentiality}
                          onChange={e => setNistConfidentiality(e.target.value as 'Low' | 'Moderate' | 'High')}
                        >
                          <MenuItem value="Low">Low</MenuItem>
                          <MenuItem value="Moderate">Moderate</MenuItem>
                          <MenuItem value="High">High</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl sx={{ minWidth: 150 }}>
                        <FormLabel sx={{ mb: 0.5, fontSize: '0.85rem' }}>Integrity</FormLabel>
                        <Select
                          size="small"
                          value={nistIntegrity}
                          onChange={e => setNistIntegrity(e.target.value as 'Low' | 'Moderate' | 'High')}
                        >
                          <MenuItem value="Low">Low</MenuItem>
                          <MenuItem value="Moderate">Moderate</MenuItem>
                          <MenuItem value="High">High</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl sx={{ minWidth: 150 }}>
                        <FormLabel sx={{ mb: 0.5, fontSize: '0.85rem' }}>Availability</FormLabel>
                        <Select
                          size="small"
                          value={nistAvailability}
                          onChange={e => setNistAvailability(e.target.value as 'Low' | 'Moderate' | 'High')}
                        >
                          <MenuItem value="Low">Low</MenuItem>
                          <MenuItem value="Moderate">Moderate</MenuItem>
                          <MenuItem value="High">High</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>Calculated Baseline:</Typography>
                      <Chip
                        label={getOverallNistBaseline(nistConfidentiality, nistIntegrity, nistAvailability)}
                        color="primary"
                        sx={{ fontWeight: 'bold' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        (Derived from the highest watermark impact level)
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Controls */}
          {selectedFrameworks.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Controls</Typography>
                {controlsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
                ) : (
                  Object.entries(scopedControlsByFw).map(([fwId, { framework, domains }]) => (
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
