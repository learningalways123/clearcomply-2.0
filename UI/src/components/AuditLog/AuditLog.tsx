import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  Alert, TablePagination, TextField, Stack, Tooltip, IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { api } from '../../services/api';
import type { AuditLogEntry } from '../../services/api';

const ACTION_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  CREATE_ASSESSMENT: 'success',
  SUBMIT_ANSWERS: 'info',
  UPDATE_ROLE: 'warning',
  LOGIN: 'default',
};

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(25);
  const [filterAction, setFilterAction] = useState('');
  const [filterEmail, setFilterEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getAuditLog({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        action: filterAction || undefined,
        user_email: filterEmail || undefined,
      });
      setEntries(result.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterAction, filterEmail]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const header = ['timestamp', 'action', 'userEmail', 'userName', 'entityType', 'entityId', 'detail'];
    const rows = entries.map(e => [
      e.timestamp,
      e.action,
      e.userEmail ?? '',
      e.userName ?? '',
      e.entityType ?? '',
      e.entityId ?? '',
      e.detail ? JSON.stringify(e.detail) : '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Typography variant="h5" fontWeight={700} flex={1}>Audit Log</Typography>
        <Tooltip title="Export CSV">
          <IconButton onClick={exportCsv}><DownloadIcon /></IconButton>
        </Tooltip>
        <Tooltip title="Refresh">
          <IconButton onClick={load}><RefreshIcon /></IconButton>
        </Tooltip>
      </Stack>

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          size="small"
          label="Filter by action"
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(0); }}
          sx={{ width: 220 }}
        />
        <TextField
          size="small"
          label="Filter by email"
          value={filterEmail}
          onChange={e => { setFilterEmail(e.target.value); setPage(0); }}
          sx={{ width: 280 }}
        />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'grey.50' } }}>
                <TableCell>Timestamp</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Detail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No audit log entries found
                  </TableCell>
                </TableRow>
              ) : (
                entries.map(entry => (
                  <TableRow key={entry.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'text.secondary' }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.action}
                        size="small"
                        color={ACTION_COLORS[entry.action] ?? 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>
                      {entry.userName || entry.userEmail || '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>
                      {entry.entityType ? `${entry.entityType}: ${entry.entityId ?? ''}` : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', maxWidth: 300 }}>
                      {entry.detail ? (
                        <Tooltip title={<pre style={{ margin: 0, fontSize: 11 }}>{JSON.stringify(entry.detail, null, 2)}</pre>} placement="left">
                          <span style={{ cursor: 'help' }}>
                            {Object.entries(entry.detail).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </span>
                        </Tooltip>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={-1}
          rowsPerPage={rowsPerPage}
          page={page}
          rowsPerPageOptions={[25]}
          onPageChange={(_, newPage) => setPage(newPage)}
          labelDisplayedRows={({ from, to }) => `${from}–${to}`}
        />
      </Paper>
    </Box>
  );
}
