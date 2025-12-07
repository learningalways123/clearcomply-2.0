import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Autocomplete,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { apiService } from '../../services/api';
import type { Framework, Control, CreateAssessmentRequest, Family, Question } from '../../services/api';

interface ControlsByFrameworkDomain {
  [frameworkId: string]: {
    framework: Framework;
    domains: {
      [domain: string]: Control[];
    };
  };
}

const NewAssessment: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [assessmentName, setAssessmentName] = useState('');
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selectedFrameworks, setSelectedFrameworks] = useState<Framework[]>([]);
  const [controlsByFramework, setControlsByFramework] = useState<ControlsByFrameworkDomain>({});
  const [selectedControlIds, setSelectedControlIds] = useState<Set<string>>(new Set());
  
  // NIST question bank state
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<Family[]>([]);
  const [questionsByFamily, setQuestionsByFamily] = useState<{[familyId: string]: Question[]}>({});
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  
  // Loading and error states
  const [frameworksLoading, setFrameworksLoading] = useState(true);
  const [controlsLoading, setControlsLoading] = useState(false);
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load frameworks on component mount
  useEffect(() => {
    loadFrameworks();
  }, []);

  // Load controls when frameworks are selected
  useEffect(() => {
    if (selectedFrameworks.length > 0) {
      loadControls();
    } else {
      setControlsByFramework({});
      setSelectedControlIds(new Set());
    }
  }, [selectedFrameworks]);

  // Load families when NIST 800-53 is selected
  useEffect(() => {
    const nistFramework = selectedFrameworks.find(f => f.id === 'NIST-800-53');
    if (nistFramework) {
      loadFamilies();
    } else {
      setFamilies([]);
      setSelectedFamilies([]);
      setQuestionsByFamily({});
      setAllQuestions([]);
    }
  }, [selectedFrameworks]);

  // Load questions when families are selected
  useEffect(() => {
    if (selectedFamilies.length > 0) {
      loadQuestions();
    } else {
      setQuestionsByFamily({});
      setAllQuestions([]);
    }
  }, [selectedFamilies]);

  const loadFrameworks = async () => {
    try {
      setFrameworksLoading(true);
      const frameworks = await apiService.getFrameworks();
      setFrameworks(frameworks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load frameworks');
    } finally {
      setFrameworksLoading(false);
    }
  };

  const loadControls = async () => {
    try {
      setControlsLoading(true);
      const controlsByFramework: ControlsByFrameworkDomain = {};

      // Load controls for each selected framework
      for (const framework of selectedFrameworks) {
        const controls = await apiService.getControls(framework.id);
        
        // Group controls by domain
        const domains: { [domain: string]: Control[] } = {};
        controls.forEach(control => {
          if (!domains[control.domain]) {
            domains[control.domain] = [];
          }
          domains[control.domain].push(control);
        });

        controlsByFramework[framework.id] = {
          framework,
          domains,
        };
      }

      setControlsByFramework(controlsByFramework);
      // Clear previous selections when frameworks change
      setSelectedControlIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load controls');
    } finally {
      setControlsLoading(false);
    }
  };

  const loadFamilies = async () => {
    try {
      setFamiliesLoading(true);
      const families = await apiService.getFamilies('NIST-800-53');
      setFamilies(families);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load families');
    } finally {
      setFamiliesLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      setQuestionsLoading(true);
      const questionsByFamily: {[familyId: string]: Question[]} = {};
      const allQuestions: Question[] = [];

      // Load questions for each selected family
      for (const family of selectedFamilies) {
        const questions = await apiService.getQuestions('NIST-800-53', family.familyId);
        questionsByFamily[family.familyId] = questions;
        
        // Add to all questions list (avoid duplicates)
        questions.forEach(question => {
          if (!allQuestions.find(q => q.id === question.id)) {
            allQuestions.push(question);
          }
        });
      }

      setQuestionsByFamily(questionsByFamily);
      setAllQuestions(allQuestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleControlToggle = (controlId: string) => {
    const newSelected = new Set(selectedControlIds);
    if (newSelected.has(controlId)) {
      newSelected.delete(controlId);
    } else {
      newSelected.add(controlId);
    }
    setSelectedControlIds(newSelected);
  };

  const handleFamilyToggle = (family: Family) => {
    const isSelected = selectedFamilies.find(f => f.id === family.id);
    if (isSelected) {
      setSelectedFamilies(selectedFamilies.filter(f => f.id !== family.id));
    } else {
      setSelectedFamilies([...selectedFamilies, family]);
    }
  };

  const handleSelectAllFamilies = () => {
    if (selectedFamilies.length === families.length) {
      setSelectedFamilies([]);
    } else {
      setSelectedFamilies([...families]);
    }
  };

  const handleCreateAssessment = async () => {
    if (!assessmentName.trim()) {
      setError('Please enter an assessment name');
      return;
    }

    if (selectedFrameworks.length === 0) {
      setError('Please select at least one framework');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const request: CreateAssessmentRequest = {
        name: assessmentName.trim(),
        frameworkIds: selectedFrameworks.map(f => f.id),
        selectedControlIds: Array.from(selectedControlIds),
        selectedQuestionIds: allQuestions.map(q => q.id),
      };

      const assessment = await apiService.createAssessment(request);
      
      // Navigate to the created assessment detail page
      navigate(`/assessments/${assessment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment');
    } finally {
      setCreating(false);
    }
  };

  // Calculate statistics
  const totalControls = Object.values(controlsByFramework).reduce(
    (total, { domains }) => 
      total + Object.values(domains).reduce((domainTotal, controls) => domainTotal + controls.length, 0),
    0
  );
  const selectedControls = selectedControlIds.size;
  const coveragePercent = totalControls > 0 ? Math.round((selectedControls / totalControls) * 100 * 100) / 100 : 0;
  
  // Question statistics
  const totalQuestions = allQuestions.length;
  const selectedFamiliesCount = selectedFamilies.length;

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'success';
      default:
        return 'default';
    }
  };

  if (frameworksLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Create New Assessment
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select frameworks and controls to create a new compliance assessment.
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box display="flex" gap={3} flexDirection={{ xs: 'column', lg: 'row' }}>
        {/* Main Form */}
        <Box flex={1}>
          <Card>
            <CardContent>
              {/* Assessment Name */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  Assessment Details
                </Typography>
                <TextField
                  fullWidth
                  label="Assessment Name"
                  value={assessmentName}
                  onChange={(e) => setAssessmentName(e.target.value)}
                  placeholder="e.g., SOC 2 Security Review Q4 2025"
                  variant="outlined"
                />
              </Box>

              {/* Framework Selection */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  Select Frameworks
                </Typography>
                <Autocomplete
                  multiple
                  options={frameworks}
                  getOptionLabel={(option) => option.name}
                  value={selectedFrameworks}
                  onChange={(_, newValue) => setSelectedFrameworks(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select compliance frameworks..."
                      variant="outlined"
                    />
                  )}
                />
              </Box>

              {/* Controls Selection */}
              {selectedFrameworks.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Select Controls
                  </Typography>
                  
                  {controlsLoading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box>
                      {Object.entries(controlsByFramework).map(([frameworkId, { framework, domains }]) => (
                        <Box key={frameworkId} mb={2}>
                          <Typography variant="h6" color="primary" gutterBottom>
                            {framework.name}
                          </Typography>
                          
                          {Object.entries(domains).map(([domain, controls]) => (
                            <Accordion key={`${frameworkId}-${domain}`} sx={{ mb: 1 }}>
                              <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{ backgroundColor: 'grey.50' }}
                              >
                                <Typography variant="subtitle1" fontWeight={500}>
                                  {domain} ({controls.length} controls)
                                </Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                {controls.map((control) => (
                                  <FormControlLabel
                                    key={control.id}
                                    control={
                                      <Checkbox
                                        checked={selectedControlIds.has(control.id)}
                                        onChange={() => handleControlToggle(control.id)}
                                      />
                                    }
                                    label={
                                      <Box>
                                        <Box display="flex" alignItems="center" gap={1}>
                                          <Typography variant="subtitle2" fontWeight={500}>
                                            {control.title}
                                          </Typography>
                                          <Chip
                                            size="small"
                                            label={control.criticality}
                                            color={getCriticalityColor(control.criticality) as any}
                                            variant="outlined"
                                          />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                          {control.description}
                                        </Typography>
                                      </Box>
                                    }
                                    sx={{ 
                                      width: '100%', 
                                      alignItems: 'flex-start',
                                      mb: 1,
                                    }}
                                  />
                                ))}
                              </AccordionDetails>
                            </Accordion>
                          ))}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* NIST Families Selection */}
              {selectedFrameworks.some(f => f.id === 'NIST-800-53') && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Select NIST Families
                  </Typography>
                  
                  {familiesLoading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress />
                    </Box>
                  ) : families.length > 0 ? (
                    <Box>
                      <Box mb={2}>
                        <Button
                          variant="outlined"
                          onClick={handleSelectAllFamilies}
                          size="small"
                        >
                          {selectedFamilies.length === families.length ? 'Deselect All' : 'Select All'} Families
                        </Button>
                      </Box>
                      
                      <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                        {families.map((family) => (
                          <Chip
                            key={family.id}
                            label={`${family.familyId} - ${family.familyName}`}
                            onClick={() => handleFamilyToggle(family)}
                            color={selectedFamilies.find(f => f.id === family.id) ? 'primary' : 'default'}
                            variant={selectedFamilies.find(f => f.id === family.id) ? 'filled' : 'outlined'}
                            clickable
                          />
                        ))}
                      </Box>
                    </Box>
                  ) : null}
                </Box>
              )}

              {/* Question Preview */}
              {allQuestions.length > 0 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Question Preview ({allQuestions.length} questions)
                  </Typography>
                  
                  {questionsLoading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box maxHeight="400px" overflow="auto">
                      {selectedFamilies.map((family) => (
                        <Accordion key={family.id} sx={{ mb: 1 }}>
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ backgroundColor: 'grey.50' }}
                          >
                            <Typography variant="subtitle1" fontWeight={500}>
                              {family.familyId} - {family.familyName} 
                              ({questionsByFamily[family.familyId]?.length || 0} questions)
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            {questionsByFamily[family.familyId]?.map((question) => (
                              <Box key={question.id} mb={2} p={2} sx={{ backgroundColor: 'grey.25', borderRadius: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  {question.questionText}
                                </Typography>
                                <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                                  <Chip
                                    size="small"
                                    label={question.stakeholderRoleId}
                                    variant="outlined"
                                    color="info"
                                  />
                                  <Chip
                                    size="small"
                                    label={question.criticality}
                                    color={getCriticalityColor(question.criticality) as any}
                                    variant="outlined"
                                  />
                                  <Chip
                                    size="small"
                                    label={question.answerType}
                                    variant="outlined"
                                    color="default"
                                  />
                                </Box>
                              </Box>
                            )) || (
                              <Typography variant="body2" color="text.secondary">
                                No questions available for this family.
                              </Typography>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Summary Panel */}
        <Box sx={{ width: { xs: '100%', lg: '350px' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assessment Summary
              </Typography>
              
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Assessment Name
                </Typography>
                <Typography variant="body1">
                  {assessmentName || 'Not specified'}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Selected Frameworks
                </Typography>
                <Typography variant="body1">
                  {selectedFrameworks.length > 0 
                    ? selectedFrameworks.map(f => f.name).join(', ')
                    : 'None selected'
                  }
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Controls
                </Typography>
                <Typography variant="h4" color="primary">
                  {totalControls}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Selected Controls
                </Typography>
                <Typography variant="h4" color="success.main">
                  {selectedControls}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Coverage Percentage
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {coveragePercent}%
                </Typography>
              </Box>

              {/* NIST Questions Summary */}
              {selectedFrameworks.some(f => f.id === 'NIST-800-53') && (
                <>
                  <Divider sx={{ my: 2 }} />
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Selected Families
                    </Typography>
                    <Typography variant="h4" color="secondary">
                      {selectedFamiliesCount}
                    </Typography>
                  </Box>

                  <Box mb={3}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Questions
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      {totalQuestions}
                    </Typography>
                  </Box>
                </>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={creating ? <CircularProgress size={16} /> : <AssessmentIcon />}
                onClick={handleCreateAssessment}
                disabled={creating || !assessmentName.trim() || selectedFrameworks.length === 0}
              >
                {creating ? 'Creating...' : 'Create Assessment'}
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default NewAssessment;
