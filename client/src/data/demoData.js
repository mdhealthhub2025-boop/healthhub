export const demoPatients = [
  {
    id: 'demo-1',
    name: 'Leah Johnson',
    age: 2,
    birthDate: '2024-05-11',
    sex: 'Female',
    contact: '+1 555-1200',
    occupation: 'N/A',
    referredBy: 'Community health center',
    guardianName: 'Mark Johnson',
    guardianContact: '+1 555-1201',
    address: '221 Maple Street, Springfield',
    allergies: ['None'],
    conditions: ['None']
  },
  {
    id: 'demo-2',
    name: 'Michael Rivera',
    age: 52,
    birthDate: '1974-01-08',
    sex: 'Male',
    contact: '+1 555-3300',
    occupation: 'Engineer',
    referredBy: 'Walk-in',
    guardianName: 'Ana Rivera',
    guardianContact: '+1 555-3301',
    address: '54 Pine Avenue, Brookside',
    allergies: ['None'],
    conditions: ['Type 2 Diabetes']
  },
  {
    id: 'demo-3',
    name: 'Emily Brown',
    age: 27,
    birthDate: '1998-09-14',
    sex: 'Female',
    contact: '+1 555-8901',
    occupation: 'Teacher',
    referredBy: 'Clinic referral',
    guardianName: 'Laura Brown',
    guardianContact: '+1 555-8902',
    address: '908 Cedar Lane, Fairview',
    allergies: ['Latex'],
    conditions: ['Asthma']
  }
];

export const demoVisitsByPatient = {
  'demo-1': [
    {
      id: 'visit-1',
      dateOfVisit: '2026-04-10',
      diagnosis: 'Seasonal migraine',
      prescriptions: 'Ibuprofen 400mg',
      notes: 'Hydration and sleep advice given.',
      attachmentName: '',
      attachmentUrl: ''
    },
    {
      id: 'visit-1b',
      dateOfVisit: '2026-03-10',
      diagnosis: 'Routine follow-up',
      prescriptions: 'Paracetamol as needed',
      notes: 'Patient stable and advised to monitor symptoms.',
      attachmentName: '',
      attachmentUrl: ''
    }
  ],
  'demo-2': [
    {
      id: 'visit-2',
      dateOfVisit: '2026-04-14',
      diagnosis: 'Routine diabetes review',
      prescriptions: 'Continue metformin',
      notes: 'Fasting glucose improving.',
      attachmentName: '',
      attachmentUrl: ''
    }
  ],
  'demo-3': [
    {
      id: 'visit-3',
      dateOfVisit: '2026-04-15',
      diagnosis: 'Mild asthma flare',
      prescriptions: 'Rescue inhaler refill',
      notes: 'Reviewed inhaler technique.',
      attachmentName: '',
      attachmentUrl: ''
    }
  ]
};

export const demoVaccinesByPatient = {
  'demo-1': [
    {
      id: 'vax-1',
      dateAdministered: '2024-05-13',
      vaccine: 'BCG',
      dose: '',
      site: 'Left arm',
      signedBy: 'RN Cruz',
      remarks: 'At birth'
    },
    {
      id: 'vax-1b',
      dateAdministered: '2024-05-13',
      vaccine: 'Hepatitis B',
      dose: '1',
      site: 'Right thigh',
      signedBy: 'RN Cruz',
      remarks: 'At birth'
    },
    {
      id: 'vax-1c',
      dateAdministered: '2024-06-15',
      vaccine: 'PCV',
      dose: '1',
      site: 'Left thigh',
      signedBy: 'RN Cruz',
      remarks: 'No reaction'
    },
    {
      id: 'vax-1d',
      dateAdministered: '2026-02-20',
      vaccine: 'Influenza',
      dose: '1',
      site: 'Left arm',
      signedBy: 'RN Cruz',
      remarks: 'No adverse reaction'
    }
  ],
  'demo-2': [
    {
      id: 'vax-2',
      dateAdministered: '2026-01-16',
      vaccine: 'PCV',
      dose: '1',
      site: 'Right arm',
      signedBy: 'RN Diaz',
      remarks: 'Observed for 15 minutes'
    }
  ],
  'demo-3': [
    {
      id: 'vax-3',
      dateAdministered: '2026-03-01',
      vaccine: 'DTwP / DTaP',
      dose: 'Booster 1',
      site: 'Left arm',
      signedBy: 'RN Santos',
      remarks: 'Routine immunization'
    }
  ]
};

export const demoAppointments = [
  {
    id: 'appt-1',
    patientName: 'Sarah Johnson',
    scheduledFor: '2026-04-18T09:30',
    notes: 'Blood pressure follow-up'
  },
  {
    id: 'appt-2',
    patientName: 'Michael Rivera',
    scheduledFor: '2026-04-18T11:00',
    notes: 'Lab review'
  }
];
