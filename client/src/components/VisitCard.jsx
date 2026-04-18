import { Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';

function formatVisitDate(value) {
  if (!value) {
    return '—';
  }

  const parsedDate =
    typeof value === 'string'
      ? new Date(value)
      : value?.seconds
        ? new Date(value.seconds * 1000)
        : new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? String(value) : parsedDate.toLocaleDateString();
}

function formatHeightValue(height, unit = 'cm') {
  return height ? `${height} ${unit}` : null;
}

function truncateText(value = '', maxLength = 32) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function getMedicationItems(visit) {
  if (visit.medications?.length) {
    return visit.medications;
  }

  if (visit.medicationName) {
    return [{
      name: visit.medicationName,
      dose: visit.medicationDose,
      frequency: visit.medicationFrequency,
      duration: visit.medicationDuration
    }];
  }

  return [];
}

function VitalsChip({ icon, label }) {
  return (
    <Chip
      label={
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box component="span" sx={{ fontSize: '0.95rem', lineHeight: 1 }}>
            {icon}
          </Box>
          <Box component="span">{label}</Box>
        </Stack>
      }
      size="medium"
      sx={(theme) => ({
        borderRadius: 999,
        height: 34,
        px: 0.75,
        bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.06),
        color: 'text.primary',
        '& .MuiChip-label': {
          px: 1.25,
          py: 0,
          fontSize: '0.85rem',
          fontWeight: 500
        }
      })}
    />
  );
}

export default function VisitCard({ visit, heightUnit, onView, onEdit }) {
  const medicationItems = getMedicationItems(visit);
  const diagnosisShort = String(visit.diagnosisShort || '').trim();
  const diagnosisFull = String(visit.diagnosis || '').trim();
  const diagnosisChipLabel = diagnosisShort && diagnosisShort.toLowerCase() !== diagnosisFull.toLowerCase()
    ? diagnosisShort
    : '';
  const notesText = visit.notes || visit.historyExam || visit.exam || 'No notes recorded.';
  const vitals = [
    visit.weight ? { key: 'weight', icon: '⚖', label: `${visit.weight} kg` } : null,
    visit.height ? { key: 'height', icon: '📏', label: formatHeightValue(visit.height, heightUnit) } : null,
    visit.temperature ? { key: 'temp', icon: '🌡', label: visit.temperature } : null,
    visit.heartRate ? { key: 'hr', icon: '❤️', label: visit.heartRate } : null
  ].filter(Boolean);

  return (
    <Card
      sx={(theme) => ({
        borderRadius: 4,
        border: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.9),
        boxShadow: '0px 2px 8px rgba(15, 23, 42, 0.05)',
        transition: 'box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease',
        '&:hover': {
          boxShadow: '0px 10px 24px rgba(15, 23, 42, 0.10)',
          transform: 'translateY(-1px)',
          borderColor: alpha(theme.palette.primary.main, 0.28)
        }
      })}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
              {formatVisitDate(visit.dateOfVisit)}
            </Typography>

            <Stack direction="row" spacing={1} mt={0.75} useFlexGap flexWrap="wrap">
              {visit.type ? (
                <Chip
                  label={visit.type}
                  size="small"
                  sx={{ borderRadius: 2.5, fontWeight: 500, bgcolor: 'action.hover' }}
                />
              ) : null}
              {visit.addToProblemList ? (
                <Chip
                  label="Problem List"
                  size="small"
                  sx={{ borderRadius: 2.5, fontWeight: 500, bgcolor: 'warning.50', color: 'warning.dark' }}
                />
              ) : null}
            </Stack>
          </Box>

          {diagnosisChipLabel ? (
            <Chip
              label={truncateText(diagnosisChipLabel)}
              size="medium"
              sx={(theme) => ({
                maxWidth: '100%',
                borderRadius: 2.5,
                px: 0.75,
                py: 0.25,
                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.26 : 0.12),
                color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark,
                '& .MuiChip-label': {
                  px: 1.25,
                  py: 0.25,
                  fontSize: '0.92rem',
                  fontWeight: 700
                }
              })}
            />
          ) : null}
        </Box>

        {diagnosisFull ? (
          <Typography variant="body2" sx={{ mt: 1.1, color: 'text.secondary', lineHeight: 1.6 }}>
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Diagnosis:
            </Box>{' '}
            {diagnosisFull}
          </Typography>
        ) : null}

        {visit.chiefComplaint ? (
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', lineHeight: 1.6 }}>
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Chief Complaint:
            </Box>{' '}
            {visit.chiefComplaint}
          </Typography>
        ) : null}

        <Divider sx={{ my: 2.25, borderColor: (theme) => alpha(theme.palette.divider, 0.5) }} />

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'minmax(0, 2fr) minmax(220px, 1fr)' }} gap={{ xs: 2, md: 2.5 }} alignItems="start">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.14em', fontWeight: 700 }}>
              NOTES
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.9,
                lineHeight: 1.7,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {notesText}
            </Typography>

            <Button size="small" variant="text" sx={{ mt: 1.25, px: 0, minWidth: 0, borderRadius: 2 }} onClick={onView}>
              View Details
            </Button>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.14em', fontWeight: 700 }}>
              MEDICATION
            </Typography>

            {medicationItems.length > 0 ? (
              <Stack spacing={1.4} sx={{ mt: 0.9 }}>
                {medicationItems.map((medication, index) => (
                  <Box key={`${medication.name || 'medication'}-${index}`}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {medication.name}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.35, color: 'text.secondary', lineHeight: 1.6 }}>
                      {[medication.dose, medication.frequency, medication.duration].filter(Boolean).join(' • ') || 'Details not recorded'}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : visit.prescriptions ? (
              <Typography variant="body2" sx={{ mt: 0.9, color: 'text.primary', lineHeight: 1.7 }}>
                {visit.prescriptions}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ mt: 0.9, color: 'text.secondary' }}>
                None
              </Typography>
            )}
          </Box>
        </Box>

        {vitals.length ? (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2.25 }}>
            {vitals.map((item) => (
              <VitalsChip key={item.key} icon={item.icon} label={item.label} />
            ))}
          </Stack>
        ) : null}

        <Stack direction="row" spacing={1.25} justifyContent="flex-end" sx={{ mt: 2.4 }}>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            sx={{ borderRadius: 6, px: 2.1, py: 0.85, textTransform: 'none', fontWeight: 600 }}
            onClick={onView}
          >
            View
          </Button>

          <Button
            variant="contained"
            startIcon={<EditIcon />}
            sx={{ borderRadius: 6, px: 2.2, py: 0.85, textTransform: 'none', fontWeight: 600 }}
            onClick={onEdit}
          >
            Edit
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}