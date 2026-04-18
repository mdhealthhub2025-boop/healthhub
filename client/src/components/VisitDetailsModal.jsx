import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

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

function getDiagnosisItems(visit) {
  if (visit.diagnoses?.length) {
    return visit.diagnoses.map((item) => String(item || '').trim()).filter(Boolean);
  }

  const diagnosis = String(visit.diagnosis || '').trim();
  return diagnosis ? [diagnosis] : [];
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

function SectionBlock({ label, children }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: 'text.secondary', letterSpacing: '0.04em', mb: 0.75 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

export default function VisitDetailsModal({ open, onClose, visit, heightUnit }) {
  if (!visit) {
    return null;
  }

  const medicationItems = getMedicationItems(visit);
  const diagnosisItems = getDiagnosisItems(visit);
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
    visit.heartRate ? { key: 'hr', icon: '❤️', label: visit.heartRate } : null,
    visit.respiratoryRate ? { key: 'rr', icon: '🫁', label: `RR ${visit.respiratoryRate}` } : null,
    visit.oxygenSaturation ? { key: 'spo2', icon: '🩸', label: `SpO2 ${visit.oxygenSaturation}` } : null,
    visit.bloodPressure ? { key: 'bp', icon: '🩺', label: `BP ${visit.bloodPressure}` } : null
  ].filter(Boolean);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 4,
          p: 1
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          pb: 1
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700}>
            {formatVisitDate(visit.dateOfVisit)}
          </Typography>

          <Stack direction="row" spacing={1} mt={0.75} useFlexGap flexWrap="wrap">
            {visit.type ? <Chip label={visit.type} size="small" /> : null}
            {diagnosisChipLabel ? <Chip label={diagnosisChipLabel} color="primary" size="small" /> : null}
          </Stack>
        </Box>

        <Button onClick={onClose} startIcon={<CloseIcon />} sx={{ borderRadius: 6, whiteSpace: 'nowrap' }}>
          Close
        </Button>
      </DialogTitle>

      <Divider sx={{ borderColor: (theme) => alpha(theme.palette.divider, 0.6) }} />

      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2.5}>
          {diagnosisItems.length ? (
            <SectionBlock label="Diagnosis">
              <Stack spacing={1}>
                {diagnosisItems.map((diagnosis, index) => (
                  <Typography key={`${diagnosis}-${index}`} fontWeight={600}>{diagnosis}</Typography>
                ))}
              </Stack>
            </SectionBlock>
          ) : null}

          {visit.chiefComplaint ? (
            <SectionBlock label="Chief Complaint">
              <Typography>{visit.chiefComplaint}</Typography>
            </SectionBlock>
          ) : null}

          <SectionBlock label="Notes">
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{notesText}</Typography>
          </SectionBlock>

          <SectionBlock label="Medications">
            {medicationItems.length > 0 ? (
              <Stack spacing={1.25}>
                {medicationItems.map((medication, index) => (
                  <Box key={`${medication.name || 'medication'}-${index}`}>
                    <Typography fontWeight={600}>{medication.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {[medication.dose, medication.frequency, medication.duration].filter(Boolean).join(' • ') || 'Details not recorded'}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : visit.prescriptions ? (
              <Typography>{visit.prescriptions}</Typography>
            ) : (
              <Typography>No medications</Typography>
            )}
          </SectionBlock>

          <SectionBlock label="Vitals">
            {vitals.length ? (
              <Stack direction="row" spacing={1} mt={1} useFlexGap flexWrap="wrap">
                {vitals.map((item) => (
                  <VitalsChip key={item.key} icon={item.icon} label={item.label} />
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No vitals recorded.</Typography>
            )}
          </SectionBlock>
        </Stack>
      </DialogContent>

      <Divider sx={{ borderColor: (theme) => alpha(theme.palette.divider, 0.6) }} />

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 6 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}