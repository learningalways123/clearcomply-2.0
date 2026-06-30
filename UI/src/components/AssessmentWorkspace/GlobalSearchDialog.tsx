import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import SearchIcon from '@mui/icons-material/Search';

import { api } from '../../services/api';
import type { Question, PoamItem, InventoryItem } from '../../services/api';

interface SearchResult {
  id: string;
  type: 'Control' | 'Finding' | 'Inventory';
  title: string;
  subtitle?: string;
  path: string;
}

interface GlobalSearchDialogProps {
  open: boolean;
  onClose: () => void;
  assessmentId: string;
}

export default function GlobalSearchDialog({ open, onClose, assessmentId }: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  
  // Cache to store loaded datasets
  const [data, setData] = useState<{
    questions: Question[];
    findings: PoamItem[];
    inventory: InventoryItem[];
  } | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      // Pre-load all scoped search items
      const loadAllSearchData = async () => {
        setLoading(true);
        try {
          const [qs, fs, inv] = await Promise.all([
            api.getAssessmentQuestions(assessmentId),
            api.getPoamItems({ assessment_id: assessmentId }),
            api.getInventory(assessmentId)
          ]);
          setData({ questions: qs, findings: fs, inventory: inv });
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      loadAllSearchData();
    }
  }, [open, assessmentId]);

  useEffect(() => {
    if (!data) {
      setResults([]);
      return;
    }

    const q = query.trim().toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }

    const filtered: SearchResult[] = [];

    // 1. Filter Questions (Controls)
    data.questions.forEach(item => {
      const matchText = (item.questionText || '').toLowerCase();
      const matchFamily = (item.familyName || '').toLowerCase();
      const matchRefs = (item.controlRefs || []).join(' ').toLowerCase();

      if (matchText.includes(q) || matchFamily.includes(q) || matchRefs.includes(q)) {
        filtered.push({
          id: item.id,
          type: 'Control',
          title: item.controlRefs.join(', ') || 'Control',
          subtitle: item.questionText,
          path: `/assessments/${assessmentId}/controls?family=${item.familyId}`
        });
      }
    });

    // 2. Filter Findings
    data.findings.forEach(item => {
      const matchTitle = (item.title || '').toLowerCase();
      const matchDesc = (item.description || '').toLowerCase();
      const matchOwner = (item.owner || '').toLowerCase();

      if (matchTitle.includes(q) || matchDesc.includes(q) || matchOwner.includes(q)) {
        filtered.push({
          id: item.id,
          type: 'Finding',
          title: item.title,
          subtitle: `Status: ${item.status} · Priority: ${item.priority} · Owner: ${item.owner || 'Unassigned'}`,
          path: `/assessments/${assessmentId}/findings`
        });
      }
    });

    // 3. Filter Inventory
    data.inventory.forEach(item => {
      const matchName = (item.name || '').toLowerCase();
      const matchType = (item.type || '').toLowerCase();
      const matchOwner = (item.owner || '').toLowerCase();

      if (matchName.includes(q) || matchType.includes(q) || matchOwner.includes(q)) {
        filtered.push({
          id: item.id,
          type: 'Inventory',
          title: item.name,
          subtitle: `Type: ${item.type} · Status: ${item.status} · Owner: ${item.owner}`,
          path: `/assessments/${assessmentId}/inventory`
        });
      }
    });

    setResults(filtered.slice(0, 8)); // Limit to top 8 matches
    setSelectedIndex(0);
  }, [query, data]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (item: SearchResult) => {
    navigate(item.path);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          bgcolor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.18)',
          border: '1px solid rgba(226, 232, 240, 0.8)'
        }
      }}
    >
      <DialogContent sx={{ p: 2 }}>
        <TextField
          fullWidth
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          placeholder="Search controls, findings, or inventory (Cmd+K)..."
          variant="standard"
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start" sx={{ mr: 1.5, color: '#64748b' }}>
                {loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              </InputAdornment>
            ),
            sx: {
              fontSize: '1rem',
              py: 1,
              px: 1,
              color: '#0f172a',
              '& input::placeholder': { color: '#94a3b8', opacity: 1 }
            }
          }}
        />

        {results.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mx: -2, mb: 1, borderColor: '#e2e8f0' }} />
            <List disablePadding>
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const typeColor = 
                  item.type === 'Control' ? 'primary' : 
                  item.type === 'Finding' ? 'error' : 
                  'secondary';

                return (
                  <ListItemButton
                    key={`${item.type}-${item.id}`}
                    selected={isSelected}
                    onClick={() => handleSelect(item)}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      py: 1.25,
                      px: 2,
                      bgcolor: isSelected ? 'rgba(79, 70, 229, 0.08) !important' : 'transparent',
                      '&:hover': { bgcolor: 'rgba(241, 245, 249, 0.6)' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Chip 
                            label={item.type} 
                            size="small" 
                            color={typeColor}
                            sx={{ fontWeight: 800, fontSize: 10, height: 18 }} 
                          />
                          <Typography variant="body2" fontWeight={700} color="#1e293b">
                            {item.title}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        item.subtitle && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ 
                              display: '-webkit-box', 
                              WebkitLineClamp: 1, 
                              WebkitBoxOrient: 'vertical', 
                              overflow: 'hidden', 
                              mt: 0.5,
                              lineHeight: 1.4
                            }}
                          >
                            {item.subtitle}
                          </Typography>
                        )
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        )}

        {query.trim() && results.length === 0 && !loading && (
          <Box sx={{ mt: 2, py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No results found for "{query}"
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Use <kbd style={{ padding: '2px 4px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4 }}>↑↓</kbd> to navigate, <kbd style={{ padding: '2px 4px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4 }}>Enter</kbd> to select
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Press <kbd style={{ padding: '2px 4px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4 }}>Esc</kbd> to close
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
