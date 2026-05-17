// A single question card with its answer input — extracted so AssessmentDetail stays manageable.

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import TextField from '@mui/material/TextField';
import Collapse from '@mui/material/Collapse';
import Link from '@mui/material/Link';

import type { Question } from '../../services/api';

export type YesNoJustification = { yesNo: string; justification: string };
export type AnswerValue = string | YesNoJustification;

interface QuestionCardProps {
  question: Question;
  answer: AnswerValue;
  onChange: (questionId: string, value: AnswerValue) => void;
}

const YES_NO_OPTIONS = [
  { label: 'Yes', value: 'Yes' },
  { label: 'No', value: 'No' },
  { label: 'N/A', value: 'Not applicable' },
];

function YesNoButtons({
  value,
  narrative,
  onSelect,
  onNarrativeChange,
}: {
  value: string;
  narrative: string;
  onSelect: (v: string) => void;
  onNarrativeChange: (v: string) => void;
}) {
  const [showNarrative, setShowNarrative] = useState(!!narrative);

  return (
    <Box sx={{ mt: 2 }}>
      <ButtonGroup size="small" variant="outlined" disableElevation>
        {YES_NO_OPTIONS.map(({ label, value: optVal }) => {
          const selected = value === optVal;
          const color =
            optVal === 'Yes' ? 'success' : optVal === 'No' ? 'error' : 'inherit';
          return (
            <Button
              key={optVal}
              onClick={() => onSelect(optVal)}
              variant={selected ? 'contained' : 'outlined'}
              color={selected ? (color as 'success' | 'error' | 'inherit') : 'inherit'}
              sx={{
                minWidth: 72,
                fontWeight: selected ? 700 : 400,
                borderColor: 'divider',
              }}
            >
              {label}
            </Button>
          );
        })}
      </ButtonGroup>

      <Box sx={{ mt: 1 }}>
        {!showNarrative ? (
          <Link
            component="button"
            variant="body2"
            underline="hover"
            color="text.secondary"
            onClick={() => setShowNarrative(true)}
            sx={{ fontSize: '0.8rem' }}
          >
            + Add narrative
          </Link>
        ) : (
          <Collapse in={showNarrative}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add a narrative or additional context…"
              value={narrative}
              onChange={(e) => onNarrativeChange(e.target.value)}
              size="small"
              sx={{ mt: 1 }}
              InputProps={{
                endAdornment: !narrative ? (
                  <Link
                    component="button"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                    onClick={() => setShowNarrative(false)}
                    sx={{ alignSelf: 'flex-start', pt: 0.5, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    Remove
                  </Link>
                ) : undefined,
              }}
            />
          </Collapse>
        )}
      </Box>
    </Box>
  );
}

export default function QuestionCard({ question, answer, onChange }: QuestionCardProps) {
  const { id, questionText } = question;

  // Always use object format — every question gets Yes/No buttons + optional narrative
  const yesNo = typeof answer === 'object' ? answer.yesNo : '';
  const narrative = typeof answer === 'object' ? answer.justification : '';

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Typography variant="body1" fontWeight={500} gutterBottom>
        {questionText}
      </Typography>
      <YesNoButtons
        value={yesNo}
        narrative={narrative}
        onSelect={(v) => onChange(id, { yesNo: v, justification: narrative })}
        onNarrativeChange={(v) => onChange(id, { yesNo, justification: v })}
      />
    </Paper>
  );
}
