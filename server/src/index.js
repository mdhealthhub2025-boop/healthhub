import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectDB } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

await connectDB();

app.use(cors());
app.use(express.json());

const patients = [
  { id: 'P-1001', name: 'John Carter', dob: '1985-06-14', status: 'Active' },
  { id: 'P-1002', name: 'Maria Gomez', dob: '1991-09-03', status: 'Follow-up' },
  { id: 'P-1003', name: 'Aisha Rahman', dob: '1978-12-22', status: 'Discharged' }
];

const appointments = [
  { id: 'A-2001', patient: 'John Carter', time: '09:00 AM', provider: 'Dr. Lee' },
  { id: 'A-2002', patient: 'Maria Gomez', time: '11:30 AM', provider: 'Dr. Patel' },
  { id: 'A-2003', patient: 'Aisha Rahman', time: '02:15 PM', provider: 'Dr. Chen' }
];

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EMR API',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/patients', (req, res) => {
  res.json(patients);
});

app.get('/api/appointments', (req, res) => {
  res.json(appointments);
});

app.listen(PORT, () => {
  console.log(`EMR server listening on http://localhost:${PORT}`);
});
