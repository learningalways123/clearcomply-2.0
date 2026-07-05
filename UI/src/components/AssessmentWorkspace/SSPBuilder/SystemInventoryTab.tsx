import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CircularProgress from '@mui/material/CircularProgress';

import { useWorkbook } from './WorkbookContext';

export default function SystemInventoryTab() {
  const { workbook, updateSection, loading } = useWorkbook();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  }

  const inv = workbook?.inventory || {
    servers: [],
    workstations: [],
    software: [],
    services: []
  };

  const handleListChange = (listName: 'servers' | 'workstations' | 'software' | 'services', index: number, field: string, value: string) => {
    const nextList = [...(inv[listName] || [])];
    nextList[index] = {
      ...nextList[index],
      [field]: value
    };
    updateSection('inventory', {
      ...inv,
      [listName]: nextList
    });
  };

  const addRow = (listName: 'servers' | 'workstations' | 'software' | 'services', defaultObj: any) => {
    const nextList = [...(inv[listName] || []), defaultObj];
    updateSection('inventory', {
      ...inv,
      [listName]: nextList
    });
  };

  const removeRow = (listName: 'servers' | 'workstations' | 'software' | 'services', index: number) => {
    const nextList = (inv[listName] || []).filter((_: any, i: number) => i !== index);
    updateSection('inventory', {
      ...inv,
      [listName]: nextList
    });
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">System Inventory</Typography>
        <Typography variant="body2" color="text.secondary">
          Track all host servers, workstation types, application software packages, and service dependencies.
        </Typography>
      </Box>

      {/* Part 1: Server Hardware & VMs */}
      <Card sx={{ mb: 4, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Server Hardware & Virtual Machines</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Identify physical and virtual host servers associated with the system boundary.
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Hostname / VM Name</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Operating System & Version</TableCell>
                  <TableCell>Physical / Cloud Location</TableCell>
                  <TableCell>Purpose / Description</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(inv.servers || []).map((srv: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. ils-prod-web-01"
                        value={srv.hostname || ''}
                        onChange={(e) => handleListChange('servers', idx, 'hostname', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. 10.12.34.56"
                        value={srv.ip || ''}
                        onChange={(e) => handleListChange('servers', idx, 'ip', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. RHEL 8.6, Windows Server 2022"
                        value={srv.os || ''}
                        onChange={(e) => handleListChange('servers', idx, 'os', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. AWS us-east-2, OET Data Center"
                        value={srv.location || ''}
                        onChange={(e) => handleListChange('servers', idx, 'location', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Web server, database instance"
                        value={srv.purpose || ''}
                        onChange={(e) => handleListChange('servers', idx, 'purpose', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>
                      <IconButton color="error" size="small" onClick={() => removeRow('servers', idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddIcon />} onClick={() => addRow('servers', { hostname: '', ip: '', os: '', location: '', purpose: '' })} sx={{ mt: 2 }} size="small">
            Add Host Server
          </Button>
        </CardContent>
      </Card>

      {/* Part 2: Workstation Clients */}
      <Card sx={{ mb: 4, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Workstation Clients</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Identify classes of endpoint devices used by administrators or users to access the system.
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Workstation / Client Type</TableCell>
                  <TableCell>Operating System</TableCell>
                  <TableCell>Est. Quantity</TableCell>
                  <TableCell>Owner / Responsible Unit</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(inv.workstations || []).map((wks: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Staff Laptops, Admin Desktops"
                        value={wks.type || ''}
                        onChange={(e) => handleListChange('workstations', idx, 'type', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Windows 11 Enterprise, macOS Sonoma"
                        value={wks.os || ''}
                        onChange={(e) => handleListChange('workstations', idx, 'os', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. 150"
                        value={wks.quantity || ''}
                        onChange={(e) => handleListChange('workstations', idx, 'quantity', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. MNIT Agency Support"
                        value={wks.owner || ''}
                        onChange={(e) => handleListChange('workstations', idx, 'owner', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>
                      <IconButton color="error" size="small" onClick={() => removeRow('workstations', idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddIcon />} onClick={() => addRow('workstations', { type: '', os: '', quantity: '', owner: '' })} sx={{ mt: 2 }} size="small">
            Add Client Type
          </Button>
        </CardContent>
      </Card>

      {/* Part 3: Application Software Packages */}
      <Card sx={{ mb: 4, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Application Software & Middleware</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Declare databases, libraries, web frameworks, web servers, or custom programs installed on host systems.
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Software / Tool Name</TableCell>
                  <TableCell>Version Number</TableCell>
                  <TableCell>Vendor / Developer</TableCell>
                  <TableCell>Operational Purpose</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(inv.software || []).map((sw: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Apache Tomcat, PostgreSQL, React Native"
                        value={sw.name || ''}
                        onChange={(e) => handleListChange('software', idx, 'name', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. 9.0.58, 15.2"
                        value={sw.version || ''}
                        onChange={(e) => handleListChange('software', idx, 'version', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Apache Software Foundation, Oracle"
                        value={sw.vendor || ''}
                        onChange={(e) => handleListChange('software', idx, 'vendor', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Web server runtime, relational database store"
                        value={sw.purpose || ''}
                        onChange={(e) => handleListChange('software', idx, 'purpose', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>
                      <IconButton color="error" size="small" onClick={() => removeRow('software', idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddIcon />} onClick={() => addRow('software', { name: '', version: '', vendor: '', purpose: '' })} sx={{ mt: 2 }} size="small">
            Add Software Item
          </Button>
        </CardContent>
      </Card>

      {/* Part 4: Service Dependencies */}
      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Service & System Dependencies</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Declare external microservices, identity providers, billing gateways, or hosting platforms.
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Service / Dependent System Name</TableCell>
                  <TableCell>Purpose / Integration Description</TableCell>
                  <TableCell>Vendor / Operating Team</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(inv.services || []).map((sv: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Google Cloud Identity IAM, Mn.IT Active Directory"
                        value={sv.name || ''}
                        onChange={(e) => handleListChange('services', idx, 'name', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Authentication & Single Sign-On integration"
                        value={sv.purpose || ''}
                        onChange={(e) => handleListChange('services', idx, 'purpose', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="e.g. Mn.IT IAM Enterprise Team, Google"
                        value={sv.vendor || ''}
                        onChange={(e) => handleListChange('services', idx, 'vendor', e.target.value)}
                        size="small"
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>
                      <IconButton color="error" size="small" onClick={() => removeRow('services', idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddIcon />} onClick={() => addRow('services', { name: '', purpose: '', vendor: '' })} sx={{ mt: 2 }} size="small">
            Add Service Dependency
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
