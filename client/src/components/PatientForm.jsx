import { useEffect, useState } from 'react';
import { Box, Button, Card, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';

function calculateAgeFromBirthDate(value) {
  if (!value) {
    return '';
  }

  const birthDate = new Date(value);

  if (Number.isNaN(birthDate.getTime())) {
    return '';
  }

  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const birthOnlyDate = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const dayDifference = Math.floor((currentDate - birthOnlyDate) / (1000 * 60 * 60 * 24));

  if (dayDifference < 0) {
    return '';
  }

  if (dayDifference < 14) {
    return `${dayDifference} day${dayDifference === 1 ? '' : 's'}`;
  }

  if (dayDifference < 31) {
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

function formatAgeLabel(value) {
  const age = calculateAgeFromBirthDate(value);
  return age ? `${age} old` : 'Age pending';
}

function splitNameParts(value = '') {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: '', middleName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: '' };
  }

  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1]
  };
}

function composeFullName(form) {
  return [form.firstName, form.middleName, form.lastName]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' ');
}

function generatePatientId(form) {
  const prefix = (form.lastName || form.firstName || 'PATIENT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
  const dateToken = form.birthDate ? form.birthDate.replace(/-/g, '').slice(-6) : '000001';

  return `${prefix || 'PATIENT'}${dateToken}`;
}

const emptyForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  name: '',
  birthDate: '',
  age: '',
  sex: 'Female',
  patientId: '',
  weight: '',
  height: '',
  heightUnit: 'cm',
  occupation: '',
  referredBy: '',
  guardianName: '',
  guardianRelation: 'Mother',
  guardianContact: '',
  address: '',
  city: '',
  allergies: '',
  conditions: ''
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    bgcolor: '#fff'
  }
};

export default function PatientForm({ patient, onCancel, onSave, busy }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (patient) {
      const parts = splitNameParts(patient.name ?? '');

      setForm({
        ...emptyForm,
        ...parts,
        name: patient.name ?? '',
        birthDate: patient.birthDate ?? '',
        age: patient.birthDate ? calculateAgeFromBirthDate(patient.birthDate) : patient.age ?? '',
        sex: patient.sex ?? 'Female',
        patientId: patient.patientId ?? patient.id ?? '',
        weight: patient.weight ?? '',
        height: patient.height ?? '',
        heightUnit: patient.heightUnit ?? 'cm',
        occupation: patient.occupation ?? '',
        referredBy: patient.referredBy ?? '',
        guardianName: patient.guardianName ?? '',
        guardianContact: patient.guardianContact ?? '',
        address: patient.address ?? '',
        allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : '',
        conditions: Array.isArray(patient.conditions) ? patient.conditions.join(', ') : ''
      });
      return;
    }

    setForm(emptyForm);
  }, [patient]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      if (name === 'birthDate') {
        return {
          ...current,
          birthDate: value,
          age: calculateAgeFromBirthDate(value)
        };
      }

      return { ...current, [name]: value };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const fullName = composeFullName(form);
    const fullAddress = [form.address.trim(), form.city.trim()].filter(Boolean).join(', ');

    onSave({
      ...form,
      name: fullName,
      patientId: form.patientId.trim() || generatePatientId(form),
      weight: form.weight.trim(),
      height: form.height.trim(),
      heightUnit: form.heightUnit,
      address: fullAddress || form.address
    });
  };

  const previewName = composeFullName(form) || 'New patient';
  const computedPatientId = form.patientId || generatePatientId(form);
  const weightLabel = form.weight ? `${form.weight} kg` : 'Not set';
  const heightLabel = form.height ? `${form.height} ${form.heightUnit}` : 'Not set';
  const ageLabel = form.birthDate
    ? formatAgeLabel(form.birthDate)
    : form.age
      ? /[a-z]/i.test(String(form.age))
        ? String(form.age)
        : `${form.age} year${Number(form.age) === 1 ? '' : 's'} old`
      : 'Age pending';
  const title = patient ? 'Edit Patient' : 'New Patient';

  return (
    <Box sx={{ mx: 'auto', mb: 3, maxWidth: '980px', px: { xs: 1, sm: 0 } }}>
      <Card component="form" onSubmit={handleSubmit} sx={{ overflow: 'hidden', borderRadius: 4, bgcolor: '#f5f7fb' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', px: 2, py: 1.5, bgcolor: '#eef3fb' }}>
          <Button onClick={onCancel} color="inherit" sx={{ justifySelf: 'start', fontWeight: 600 }}>
            Cancel
          </Button>
          <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', color: '#1e293b' }}>
            {title}
          </Typography>
          <Button onClick={onCancel} color="inherit" sx={{ minWidth: 0, justifySelf: 'end', fontSize: 22, lineHeight: 1 }}>
            ×
          </Button>
        </Box>

        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ mb: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <Box sx={{ display: 'flex', height: 84, width: 84, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', bgcolor: '#e8eefb', fontSize: 34 }}>
                👶
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {previewName}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {ageLabel}
                </Typography>
                <Button variant="outlined" size="small" sx={{ mt: 1.5, borderRadius: 2, textTransform: 'none' }}>
                  Change Photo
                </Button>
              </Box>

              <Stack spacing={1} sx={{ alignSelf: { xs: 'stretch', sm: 'start' }, minWidth: { sm: 150 } }}>
                <Box sx={{ borderRadius: 2.5, bgcolor: '#f3f6fd', px: 1.5, py: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 700 }}>
                    Weight (kg)
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 700, color: '#334155' }}>
                    {weightLabel}
                  </Typography>
                </Box>
                <Box sx={{ borderRadius: 2.5, bgcolor: '#f3f6fd', px: 1.5, py: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 700 }}>
                    Height (cm/in)
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 700, color: '#334155' }}>
                    {heightLabel}
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 700, color: '#2b5aa6', display: 'inline-block', pb: 0.75, borderBottom: '3px solid #4f83cc' }}>
                Basic Info
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              <TextField label="First Name" name="firstName" value={form.firstName} onChange={handleChange} required fullWidth sx={inputSx} />
              <TextField label="Middle Name" name="middleName" value={form.middleName} onChange={handleChange} fullWidth sx={inputSx} />
              <TextField label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} required fullWidth sx={inputSx} />
            </Box>

            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' } }}>
              <TextField label="Date of Birth" name="birthDate" type="date" value={form.birthDate} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} sx={inputSx} />
              <TextField select label="Sex" name="sex" value={form.sex} onChange={handleChange} fullWidth sx={inputSx}>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              <TextField
                label="Patient ID"
                name="patientId"
                value={computedPatientId}
                fullWidth
                InputProps={{ readOnly: true }}
                sx={inputSx}
              />
              <TextField label="Weight (kg)" name="weight" value={form.weight} onChange={handleChange} fullWidth sx={inputSx} />
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1.4fr 0.8fr' }}>
                <TextField label="Height" name="height" value={form.height} onChange={handleChange} fullWidth sx={inputSx} />
                <TextField select label="Unit" name="heightUnit" value={form.heightUnit} onChange={handleChange} fullWidth sx={inputSx}>
                  <MenuItem value="cm">cm</MenuItem>
                  <MenuItem value="in">inches</MenuItem>
                </TextField>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' } }}>
              <TextField label="Referred By" name="referredBy" value={form.referredBy} onChange={handleChange} fullWidth sx={inputSx} />
              <TextField label="Age" name="age" value={form.age} onChange={handleChange} fullWidth InputProps={{ readOnly: !!form.birthDate }} sx={inputSx} />
            </Box>

            <Box sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography sx={{ fontWeight: 700, color: '#3b3b3b' }}>Parent / Guardian</Typography>
              </Box>
              <Divider />
              <Box sx={{ p: 2, display: 'grid', gap: 1.5 }}>
                <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' } }}>
                  <TextField label="Name" name="guardianName" value={form.guardianName} onChange={handleChange} fullWidth sx={inputSx} />
                  <TextField select label="Relation" name="guardianRelation" value={form.guardianRelation} onChange={handleChange} fullWidth sx={inputSx}>
                    <MenuItem value="Mother">Mother</MenuItem>
                    <MenuItem value="Father">Father</MenuItem>
                    <MenuItem value="Guardian">Guardian</MenuItem>
                    <MenuItem value="Grandparent">Grandparent</MenuItem>
                  </TextField>
                </Box>

                <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                  <TextField label="Phone Number" name="guardianContact" value={form.guardianContact} onChange={handleChange} required fullWidth sx={inputSx} />
                  <TextField label="Occupation" name="occupation" value={form.occupation} onChange={handleChange} fullWidth sx={inputSx} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2 }}>
              <Typography sx={{ mb: 1.5, fontWeight: 700, color: '#3b3b3b' }}>Allergies</Typography>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                <TextField label="Allergies" name="allergies" value={form.allergies} onChange={handleChange} fullWidth sx={inputSx} />
                <TextField label="Conditions" name="conditions" value={form.conditions} onChange={handleChange} fullWidth sx={inputSx} />
              </Box>
            </Box>

            <Box sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2 }}>
              <Typography sx={{ mb: 1.5, fontWeight: 700, color: '#3b3b3b' }}>Address</Typography>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                <TextField label="Street Address" name="address" value={form.address} onChange={handleChange} fullWidth sx={inputSx} />
                <TextField label="City / Location" name="city" value={form.city} onChange={handleChange} fullWidth sx={inputSx} />
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, px: 2, py: 2, bgcolor: '#f8fafc', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onCancel} color="inherit" variant="outlined" sx={{ minWidth: 110, borderRadius: 2.5 }}>
            Cancel
          </Button>
          <Button variant="contained" type="submit" disabled={busy} sx={{ minWidth: 120, borderRadius: 2.5 }}>
            {busy ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
