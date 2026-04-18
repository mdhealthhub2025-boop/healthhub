import { useEffect, useMemo, useState } from 'react';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const PAGE_SIZE = 20;

function renderList(values) {
  return values?.length ? values.join(', ') : 'None';
}

function formatAgeDisplay(patient) {
  if (patient?.birthDate) {
    const birthDate = new Date(patient.birthDate);

    if (!Number.isNaN(birthDate.getTime())) {
      const today = new Date();
      const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const birthOnlyDate = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      const dayDifference = Math.floor((currentDate - birthOnlyDate) / (1000 * 60 * 60 * 24));

      if (dayDifference >= 0 && dayDifference < 14) {
        return `${dayDifference} day${dayDifference === 1 ? '' : 's'}`;
      }

      if (dayDifference >= 14 && dayDifference < 31) {
        const weeks = Math.floor(dayDifference / 7);
        const days = dayDifference % 7;
        return days > 0
          ? `${weeks} week${weeks === 1 ? '' : 's'} ${days} day${days === 1 ? '' : 's'}`
          : `${weeks} week${weeks === 1 ? '' : 's'}`;
      }

      let totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());

      if (today.getDate() < birthDate.getDate()) {
        totalMonths -= 1;
      }

      if (totalMonths < 24) {
        const safeMonths = Math.max(totalMonths, 1);
        return `${safeMonths} month${safeMonths === 1 ? '' : 's'}`;
      }

      const years = Math.floor(totalMonths / 12);
      const remainingMonths = totalMonths % 12;

      return remainingMonths > 0
        ? `${years} year${years === 1 ? '' : 's'} ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`
        : `${years} year${years === 1 ? '' : 's'}`;
    }
  }

  const rawAge = String(patient?.age ?? '').trim();

  if (!rawAge) {
    return '—';
  }

  return /[a-z]/i.test(rawAge) ? rawAge : `${rawAge} year${rawAge === '1' ? '' : 's'}`;
}

export default function PatientList({ patients, searchTerm, onSearchChange, selectedPatientId, onSelect, onEdit, onDelete }) {
  const [page, setPage] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('lg'));
  const useCardLayout = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(patients.length / PAGE_SIZE) - 1);
    setPage((current) => Math.min(current, maxPage));
  }, [patients.length]);

  useEffect(() => {
    if (!isCompact) {
      setSearchOpen(true);
      return;
    }

    setSearchOpen(Boolean(searchTerm));
  }, [isCompact, searchTerm]);

  const paginatedPatients = useMemo(() => {
    const startIndex = page * PAGE_SIZE;
    return patients.slice(startIndex, startIndex + PAGE_SIZE);
  }, [patients, page]);

  return (
    <Card sx={{ borderRadius: 2 }}>
      <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5} mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Patients</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {isCompact ? (
              <Button
                type="button"
                variant={searchOpen ? 'contained' : 'outlined'}
                startIcon={<SearchRoundedIcon />}
                onClick={() => setSearchOpen((current) => !current)}
                sx={{ borderRadius: 999 }}
              >
                Search
              </Button>
            ) : null}
            <Chip label={`${patients.length} total`} color="primary" variant="filled" sx={{ fontWeight: 700 }} />
          </Stack>
        </Stack>

        <Collapse in={searchOpen}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search patients"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            sx={{ mb: 2 }}
          />
        </Collapse>

        {patients.length === 0 ? (
          <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography color="text.secondary">No patients found. Add your first record to begin.</Typography>
          </Card>
        ) : useCardLayout ? (
          <>
            <Grid container spacing={2}>
              {paginatedPatients.map((patient) => {
                const active = patient.id === selectedPatientId;

                return (
                  <Grid item xs={12} sm={6} key={patient.id}>
                    <Card
                      variant="outlined"
                      onClick={() => onSelect(patient.id)}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        cursor: 'pointer',
                        borderColor: active ? 'primary.main' : 'divider',
                        bgcolor: active ? 'rgba(15,118,110,0.06)' : 'background.paper'
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography sx={{ fontWeight: 800 }}>{patient.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatAgeDisplay(patient)} • {patient.sex}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Guardian: {patient.guardianContact || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Allergies: {renderList(patient.allergies)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Conditions: {renderList(patient.conditions)}
                        </Typography>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEdit(patient);
                            }}
                            sx={{ minHeight: 40, borderRadius: 999 }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDelete(patient);
                            }}
                            sx={{ minHeight: 40, borderRadius: 999 }}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Stack>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <TablePagination
              component="div"
              count={patients.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
            />
          </>
        ) : (
          <>
            <TableContainer sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(15,118,110,0.06)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Age & Gender</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Guardian Contact</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Allergies</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Conditions</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedPatients.map((patient) => {
                    const active = patient.id === selectedPatientId;

                    return (
                      <TableRow
                        hover
                        key={patient.id}
                        onClick={() => onSelect(patient.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: active ? 'rgba(15,118,110,0.08)' : 'transparent'
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>{patient.name}</TableCell>
                        <TableCell>{formatAgeDisplay(patient)} • {patient.sex}</TableCell>
                        <TableCell>{patient.guardianContact || 'N/A'}</TableCell>
                        <TableCell>{renderList(patient.allergies)}</TableCell>
                        <TableCell>{renderList(patient.conditions)}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Edit patient">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEdit(patient);
                                }}
                                sx={{
                                  bgcolor: 'rgba(15,118,110,0.12)',
                                  '&:hover': {
                                    bgcolor: 'rgba(15,118,110,0.18)'
                                  }
                                }}
                              >
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete patient">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDelete(patient);
                                }}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'rgba(239,68,68,0.35)',
                                  '&:hover': {
                                    bgcolor: 'rgba(239,68,68,0.08)'
                                  }
                                }}
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={patients.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
            />
          </>
        )}
      </Box>
    </Card>
  );
}
