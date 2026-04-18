import { useState } from 'react';
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';

const initialAppointment = {
  patientName: '',
  scheduledFor: '',
  notes: ''
};

function formatDateTime(value) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Date(value).toLocaleString();
}

export default function AppointmentPanel({ appointments, onAddAppointment, busy }) {
  const [form, setForm] = useState(initialAppointment);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onAddAppointment(form);
    setForm(initialAppointment);
  };

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Appointments
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          <TextField label="Patient name" name="patientName" value={form.patientName} onChange={handleChange} required fullWidth />
          <TextField label="Schedule" name="scheduledFor" type="datetime-local" value={form.scheduledFor} onChange={handleChange} required fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Reason or note" name="notes" value={form.notes} onChange={handleChange} fullWidth />
          <Button sx={{ gridColumn: { md: '1 / -1' } }} variant="contained" size="large" type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Schedule appointment'}
          </Button>
        </Box>

        <Stack spacing={1.5} sx={{ mt: 3 }}>
          {appointments.map((appointment) => (
            <Card key={appointment.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700 }}>{appointment.patientName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(appointment.scheduledFor)}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {appointment.notes || 'No notes'}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
