import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { apiService } from '../../services/api';
import type { Assessment, Framework } from '../../services/api';

const AssessmentsOverview: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load assessments and frameworks in parallel
      const [assessmentsData, frameworksData] = await Promise.all([
        apiService.getAssessments(),
        apiService.getFrameworks(),
      ]);

      setAssessments(assessmentsData);
      setFrameworks(frameworksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const getFrameworkNames = (frameworkIds: string[]): string => {
    const frameworkMap = frameworks.reduce((acc, framework) => {
      acc[framework.id] = framework.name;
      return acc;
    }, {} as Record<string, string>);

    return frameworkIds
      .map(id => frameworkMap[id] || id)
      .join(', ');
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCoverageColor = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage >= 80) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const handleViewAssessment = (assessmentId: string) => {
    navigate(`/assessments/${assessmentId}`);
  };

  const handleCreateNew = () => {
    navigate('/new-assessment');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Assessments Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and review your compliance assessments.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          size="large"
        >
          New Assessment
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Assessments Table */}
      <Card>
        <CardContent>
          {assessments.length === 0 ? (
            <Box textAlign="center" py={6}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No assessments found
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Create your first assessment to get started with compliance tracking.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateNew}
              >
                Create First Assessment
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Assessment Name
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Frameworks
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight={600}>
                        Coverage
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight={600}>
                        Controls
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Created
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight={600}>
                        Actions
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assessments.map((assessment) => (
                    <TableRow 
                      key={assessment.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleViewAssessment(assessment.id)}
                    >
                      <TableCell>
                        <Typography variant="subtitle1" fontWeight={500}>
                          {assessment.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {assessment.id.substring(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {assessment.frameworkIds.map((frameworkId) => (
                            <Chip
                              key={frameworkId}
                              label={frameworks.find(f => f.id === frameworkId)?.name || frameworkId}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={assessment.stats.coveragePercent}
                            color={getCoverageColor(assessment.stats.coveragePercent)}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="body2" fontWeight={500}>
                            {assessment.stats.coveragePercent.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {assessment.stats.selectedControls} / {assessment.stats.totalControls}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(assessment.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAssessment(assessment.id);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AssessmentsOverview;
