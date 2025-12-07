import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  Paper,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

import { apiService } from '../../services/api';
import type { Assessment, Framework, Question, AnswerSubmission, SubmitAnswersRequest } from '../../services/api';

const AssessmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Answer state: Map of questionId -> answer value
  const [answers, setAnswers] = useState<{[questionId: string]: string}>({});
  
  // Auto-save ref for debouncing
  const autoSaveTimeoutRef = useRef<number | null>(null);

  // Load data on component mount
  useEffect(() => {
    if (id) {
      loadAssessmentData(id);
    }
  }, [id]);

  // Auto-save effect with debouncing (1 minute delay)
  useEffect(() => {
    if (!assessment || saving) return;

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1 minute after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveAnswers(true); // true indicates auto-save
    }, 60000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [answers, assessment, saving]);

  const loadAssessmentData = async (assessmentId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load assessment, frameworks, and questions in parallel
      const [assessmentData, frameworksData, questionsData] = await Promise.all([
        apiService.getAssessment(assessmentId),
        apiService.getFrameworks(),
        apiService.getAssessmentQuestions(assessmentId),
      ]);

      setAssessment(assessmentData);
      setFrameworks(frameworksData);
      setQuestions(questionsData);

      // Initialize answers state from existing question answers
      const initialAnswers: {[questionId: string]: string} = {};
      questionsData.forEach(question => {
        initialAnswers[question.id] = question.answerValue || '';
      });
      setAnswers(initialAnswers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/assessments');
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFrameworkName = (frameworkId: string): string => {
    return frameworks.find(f => f.id === frameworkId)?.name || frameworkId;
  };

  const getQuestionsByFamily = (): {[familyId: string]: Question[]} => {
    const grouped: {[familyId: string]: Question[]} = {};
    questions.forEach(question => {
      if (!grouped[question.familyId]) {
        grouped[question.familyId] = [];
      }
      grouped[question.familyId].push(question);
    });
    return grouped;
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const saveAnswers = async (isAutoSave = false) => {
    if (!assessment) return;

    try {
      setSaving(true);
      setError(null);

      // Build the answers payload - include all questions, even empty answers
      const answerSubmissions: AnswerSubmission[] = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value: value.trim()
      }));

      const request: SubmitAnswersRequest = {
        answers: answerSubmissions
      };

      // Submit answers and get updated assessment
      const updatedAssessment = await apiService.submitAssessmentAnswers(assessment.id, request);
      
      // Update the assessment state with new question stats
      setAssessment(updatedAssessment);
      
      // Show success message only for manual saves
      if (!isAutoSave) {
        setSuccessMessage('Progress saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProgress = () => {
    // Clear auto-save timeout since we're manually saving
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    saveAnswers(false); // false indicates manual save
  };

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

  const renderAnswerInput = (question: Question) => {
    const currentValue = answers[question.id] || '';

    if (question.answerType === 'yes_no') {
      return (
        <FormControl component="fieldset" sx={{ mt: 2 }}>
          <FormLabel component="legend">Answer</FormLabel>
          <RadioGroup
            value={currentValue}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            row
          >
            <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
            <FormControlLabel value="No" control={<Radio />} label="No" />
            <FormControlLabel value="Not applicable" control={<Radio />} label="Not applicable" />
          </RadioGroup>
        </FormControl>
      );
    }

    // Default: multiline text field
    return (
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Answer"
        value={currentValue}
        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
        sx={{ mt: 2 }}
        placeholder="Enter your answer here..."
      />
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={handleBack}>
          Back to Assessments
        </Button>
      </Box>
    );
  }

  if (!assessment) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Assessment not found
        </Alert>
        <Button variant="outlined" onClick={handleBack}>
          Back to Assessments
        </Button>
      </Box>
    );
  }

  const questionsByFamily = getQuestionsByFamily();
  const familyIds = Object.keys(questionsByFamily);

  return (
    <Box>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <IconButton onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {assessment.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Created: {formatDate(assessment.createdAt)} • Frameworks: {(assessment.frameworkIds || []).map(id => getFrameworkName(id)).join(', ')}
          </Typography>
        </Box>
      </Box>

      <Box display="flex" gap={3} flexDirection={{ xs: 'column', lg: 'row' }}>
        {/* Main Content */}
        <Box flex={1}>
          {/* Completion Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assessment Progress
              </Typography>
              
              {assessment.questionStats && (
                <Box>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <LinearProgress
                      variant="determinate"
                      value={assessment.questionStats.completionPercent}
                      color={assessment.questionStats.completionPercent >= 80 ? 'success' : assessment.questionStats.completionPercent >= 50 ? 'warning' : 'error'}
                      sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="h6" fontWeight={600}>
                      {assessment.questionStats.completionPercent.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Completed: {assessment.questionStats.answeredQuestions} / {assessment.questionStats.totalQuestions} questions
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Changes are auto-saved after 2 seconds
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Questions by Family */}
          {questions.length > 0 && (
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Questions ({questions.length})
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                    onClick={handleSaveProgress}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Progress'}
                  </Button>
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Answer questions organized by NIST 800-53 family
                </Typography>

                {familyIds.map((familyId) => {
                  const familyQuestions = questionsByFamily[familyId];
                  const familyName = familyQuestions[0]?.familyName || familyId;
                  
                  return (
                    <Accordion key={familyId} defaultExpanded sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Typography variant="h6">
                            {familyName} ({familyQuestions.length} questions)
                          </Typography>
                          <Chip 
                            label={`${familyQuestions.filter(q => answers[q.id]?.trim()).length} answered`}
                            color={familyQuestions.filter(q => answers[q.id]?.trim()).length === familyQuestions.length ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        {familyQuestions.map((question, index) => (
                          <Box key={question.id}>
                            <Paper sx={{ p: 3 }}>
                              <Typography variant="subtitle1" fontWeight={500} gutterBottom>
                                {question.questionText}
                              </Typography>
                              
                              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap" mb={2}>
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
                                {question.controlRefs.length > 0 && (
                                  <Chip
                                    size="small"
                                    label={`Controls: ${question.controlRefs.join(', ')}`}
                                    variant="outlined"
                                    color="primary"
                                  />
                                )}
                              </Box>

                              {renderAnswerInput(question)}
                            </Paper>
                            {index < familyQuestions.length - 1 && <Divider sx={{ my: 2 }} />}
                          </Box>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {questions.length === 0 && (
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                  No questions found for this assessment.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Summary Sidebar */}
        <Box sx={{ width: { xs: '100%', lg: '350px' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assessment Summary
              </Typography>

              <Box mb={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Frameworks
                </Typography>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {(assessment.frameworkIds || []).map((frameworkId) => (
                    <Chip
                      key={frameworkId}
                      label={getFrameworkName(frameworkId)}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>

              {assessment.questionStats && (
                <>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Questions
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      {assessment.questionStats.totalQuestions}
                    </Typography>
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Answered Questions
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {assessment.questionStats.answeredQuestions}
                    </Typography>
                  </Box>

                  <Box mb={3}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Completion Percentage
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {assessment.questionStats.completionPercent.toFixed(1)}%
                    </Typography>
                  </Box>
                </>
              )}

              <Box mb={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Assessment ID
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {assessment.id}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleBack}
              >
                Back to Assessments
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Box>
  );
};

export default AssessmentDetail;
