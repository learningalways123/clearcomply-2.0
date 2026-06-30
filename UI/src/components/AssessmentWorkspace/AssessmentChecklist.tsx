import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PendingIcon from '@mui/icons-material/Pending';
import Button from '@mui/material/Button';

import { api } from '../../services/api';
import type { ChecklistItem } from '../../services/api';
import { useWorkspace } from './AssessmentWorkspace';

export default function AssessmentChecklist() {
  const { assessment } = useWorkspace();
  const navigate = useNavigate();
  
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChecklist = async () => {
      if (!assessment) return;
      try {
        const data = await api.getChecklist(assessment.id);
        setItems(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchChecklist();
  }, [assessment]);

  if (loading || !assessment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleNavigate = (link?: string) => {
    if (!link) return;
    navigate(`/assessments/${assessment.id}/${link}`);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ mb: 1 }}>
            SSP Completion Checklist
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Follow these step-by-step requirements to fully assemble and validate your System Security Plan (SSP) for final submission.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map((item, index) => {
              const complete = item.status === 'complete';
              const inProgress = item.status === 'in_progress';
              
              return (
                <Box 
                  key={item.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: complete ? 'rgba(16, 185, 129, 0.15)' : inProgress ? 'rgba(99, 102, 241, 0.15)' : '#f1f5f9',
                    bgcolor: complete ? 'rgba(16, 185, 129, 0.02)' : inProgress ? 'rgba(99, 102, 241, 0.02)' : '#fff',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {complete ? (
                      <CheckCircleIcon sx={{ color: '#10b981' }} />
                    ) : inProgress ? (
                      <PendingIcon sx={{ color: '#6366f1' }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ color: '#cbd5e1' }} />
                    )}
                    
                    <Typography 
                      variant="body2" 
                      fontWeight={complete ? 500 : 600} 
                      color={complete ? 'text.secondary' : '#1e293b'}
                      sx={{ 
                        textDecoration: complete ? 'line-through' : 'none',
                      }}
                    >
                      Step #{index + 1} — {item.title}
                    </Typography>
                  </Box>

                  {item.targetLink && (
                    <Button 
                      size="small" 
                      variant="text" 
                      onClick={() => handleNavigate(item.targetLink)}
                      sx={{ 
                        fontWeight: 700, 
                        color: complete ? '#10b981' : '#6366f1',
                        fontSize: 12.5 
                      }}
                    >
                      {complete ? 'Review' : inProgress ? 'Continue' : 'Start'}
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
