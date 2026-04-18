import { useEffect, useMemo, useState } from 'react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { Alert, Box, Container, CssBaseline, Fab, Grid, Snackbar, useMediaQuery } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import AppointmentPanel from './components/AppointmentPanel';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import PatientForm from './components/PatientForm';
import PatientList from './components/PatientList';
import PatientProfile from './components/PatientProfile';
import {
  demoAppointments,
  demoPatients,
  demoVaccinesByPatient,
  demoVisitsByPatient
} from './data/demoData';
import { auth, db, firebaseReady, storage } from './firebase';
import { createAppTheme } from './theme';

const emptyLoginForm = {
  email: '',
  password: ''
};

function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

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

function makeVaccineRecordId(vaccine, dose = '') {
  const value = `${vaccine}-${dose || 'single'}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return value || `vax-${Date.now()}`;
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('emr-theme') || 'light');
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [loading, setLoading] = useState(firebaseReady);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [user, setUser] = useState(null);
  const [demoSession, setDemoSession] = useState(false);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [demoVisits, setDemoVisits] = useState(demoVisitsByPatient);
  const [demoVaccines, setDemoVaccines] = useState(demoVaccinesByPatient);
  const [demoLabDocuments, setDemoLabDocuments] = useState({});
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openVisitFormSignal, setOpenVisitFormSignal] = useState(0);

  const isAuthenticated = !!user || demoSession;
  const isDemoMode = demoSession || !firebaseReady;
  const doctorId = user?.uid || 'demo-doctor';
  const doctorEmail = user?.email || 'demo@clinic.local';

  const muiTheme = useMemo(
    () => createAppTheme(theme),
    [theme]
  );
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isTabletPortrait = useMediaQuery(muiTheme.breakpoints.between('sm', 'md'));
  const isTabletLandscape = useMediaQuery(muiTheme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('lg'));
  const contentOffset = isMobile ? 0 : sidebarOpen ? (isDesktop ? 188 : 152) : 64;

  useEffect(() => {
    localStorage.setItem('emr-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setPatients([]);
      setAppointments([]);
      setSelectedPatientId(null);
      return undefined;
    }

    if (isDemoMode) {
      setPatients(demoPatients);
      setAppointments(demoAppointments);
      setSelectedPatientId((current) => current || demoPatients[0]?.id || null);
      return undefined;
    }

    const patientQuery = query(collection(db, 'doctors', user.uid, 'patients'), orderBy('name'));
    const appointmentQuery = query(
      collection(db, 'doctors', user.uid, 'appointments'),
      orderBy('scheduledFor')
    );

    const unsubscribePatients = onSnapshot(patientQuery, (snapshot) => {
      const nextPatients = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setPatients(nextPatients);
      setSelectedPatientId((current) => {
        if (current && nextPatients.some((patient) => patient.id === current)) {
          return current;
        }

        return nextPatients[0]?.id || null;
      });
    });

    const unsubscribeAppointments = onSnapshot(appointmentQuery, (snapshot) => {
      setAppointments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return () => {
      unsubscribePatients();
      unsubscribeAppointments();
    };
  }, [isAuthenticated, isDemoMode, user]);

  const filteredPatients = useMemo(() => {
    const value = searchTerm.toLowerCase().trim();

    return patients.filter((patient) => patient.name.toLowerCase().includes(value));
  }, [patients, searchTerm]);

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) || null;
  const toast = error
    ? { message: error, severity: 'error' }
    : notice
      ? { message: notice, severity: 'success' }
      : null;

  const handleToastClose = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setNotice('');
    setError('');
  };

  const handleNavigate = (page) => {
    setActivePage(page);

    if (page === 'dashboard') {
      setSearchTerm('');
      setShowPatientForm(false);
      setEditingPatient(null);
    }

    if (page === 'patients') {
      setSearchTerm('');
      setShowPatientForm(false);
      setEditingPatient(null);
      setSelectedPatientId((current) => current || patients[0]?.id || null);
    }

    if (page === 'record') {
      setShowPatientForm(false);
      setEditingPatient(null);
      setSelectedPatientId((current) => current || patients[0]?.id || null);
    }

    if (page === 'appointments') {
      setShowPatientForm(false);
      setEditingPatient(null);
    }

    if (page === 'new-patient') {
      setEditingPatient(null);
      setShowPatientForm(true);
    }
  };

  const handleSelectPatient = (patientId) => {
    setSelectedPatientId(patientId);
    setActivePage('record');
  };

  const handleOpenNewPatient = () => {
    setEditingPatient(null);
    setShowPatientForm(true);
    setActivePage('new-patient');
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    if (!firebaseReady) {
      setError('Add the Firebase environment values first, or open the demo workspace.');
      setBusy(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setNotice('Doctor login successful.');
      setLoginForm(emptyLoginForm);
    } catch (loginError) {
      setError(loginError.message.replace('Firebase: ', '').replace(/\(auth\/.*?\)\.?/, '').trim());
    } finally {
      setBusy(false);
    }
  };

  const handleDemoAccess = () => {
    setDemoSession(true);
    setUser({ uid: 'demo-doctor', email: 'demo@clinic.local' });
    setNotice('Demo mode is active. Connect Firebase to save live records.');
  };

  const handleLogout = async () => {
    setError('');

    if (demoSession || !firebaseReady) {
      setDemoSession(false);
      setUser(null);
      setNotice('Signed out of demo mode.');
      return;
    }

    await signOut(auth);
    setNotice('Signed out successfully.');
  };

  const handleSavePatient = async (form) => {
    setBusy(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      patientId: form.patientId?.trim() || '',
      age: form.birthDate ? calculateAgeFromBirthDate(form.birthDate) : String(form.age || '').trim(),
      sex: form.sex,
      birthDate: form.birthDate,
      weight: String(form.weight || '').trim(),
      height: String(form.height || '').trim(),
      heightUnit: form.heightUnit || 'cm',
      contact: '',
      occupation: form.occupation.trim(),
      referredBy: form.referredBy.trim(),
      guardianName: form.guardianName.trim(),
      guardianContact: form.guardianContact.trim(),
      address: form.address.trim(),
      allergies: splitList(form.allergies),
      conditions: splitList(form.conditions)
    };

    try {
      if (isDemoMode) {
        if (editingPatient) {
          setPatients((current) =>
            current.map((patient) =>
              patient.id === editingPatient.id ? { ...patient, ...payload } : patient
            )
          );
          setNotice('Patient updated in demo mode.');
        } else {
          const nextPatient = { id: `demo-${Date.now()}`, ...payload };
          setPatients((current) => [nextPatient, ...current]);
          setSelectedPatientId(nextPatient.id);
          setNotice('Patient added in demo mode.');
        }
      } else if (editingPatient) {
        await updateDoc(doc(db, 'doctors', doctorId, 'patients', editingPatient.id), {
          ...payload,
          updatedAt: serverTimestamp()
        });
        setNotice('Patient updated.');
      } else {
        await addDoc(collection(db, 'doctors', doctorId, 'patients'), {
          ...payload,
          resolvedProblems: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setNotice('Patient added.');
      }

      setEditingPatient(null);
      setShowPatientForm(false);
      setActivePage('patients');
    } catch {
      setError('Unable to save the patient record right now.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePatient = async (patient) => {
    if (!window.confirm(`Delete ${patient.name}?`)) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      if (isDemoMode) {
        setPatients((current) => current.filter((item) => item.id !== patient.id));
        setSelectedPatientId((current) => (current === patient.id ? null : current));
        setNotice('Patient removed from demo mode.');
      } else {
        await deleteDoc(doc(db, 'doctors', doctorId, 'patients', patient.id));
        setNotice('Patient deleted.');
      }
    } catch {
      setError('Unable to delete the patient record.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddVisit = async (patientId, form, file) => {
    setBusy(true);
    setError('');

    try {
      const isEditingVisit = Boolean(form.id);
      const diagnosisItems = Array.isArray(form.diagnoses)
        ? form.diagnoses.map((item) => String(item || '').trim()).filter(Boolean)
        : String(form.diagnosis || '').trim()
          ? [String(form.diagnosis || '').trim()]
          : [];
      const diagnosisSummary = diagnosisItems.join(', ');
      const normalizedDiagnosisNames = new Set(diagnosisItems.map((item) => item.toLowerCase()));
      const medicationItems = Array.isArray(form.medications)
        ? form.medications
          .map((item) => ({
            name: String(item?.name || '').trim(),
            dose: String(item?.dose || '').trim(),
            frequency: String(item?.frequency || '').trim(),
            duration: String(item?.duration || '').trim()
          }))
          .filter((item) => item.name || item.dose || item.frequency || item.duration)
        : [];
      const primaryMedication = medicationItems[0] || {
        name: String(form.medicationName || '').trim(),
        dose: String(form.medicationDose || '').trim(),
        frequency: String(form.medicationFrequency || '').trim(),
        duration: String(form.medicationDuration || '').trim()
      };
      const shouldActivateProblem = Boolean(form.addToProblemList && diagnosisItems.length);

      if (isDemoMode) {
        const visitPayload = {
          dateOfVisit: form.dateOfVisit,
          diagnosis: diagnosisSummary,
          diagnoses: diagnosisItems,
          prescriptions: form.prescriptions,
          notes: form.notes,
          chiefComplaint: form.chiefComplaint || '',
          historyExam: form.historyExam || '',
          exam: form.exam || '',
          medicationName: primaryMedication.name,
          medicationDose: primaryMedication.dose,
          medicationFrequency: primaryMedication.frequency,
          medicationDuration: primaryMedication.duration,
          medications: medicationItems,
          temperature: form.temperature || '',
          heartRate: form.heartRate || '',
          respiratoryRate: form.respiratoryRate || '',
          oxygenSaturation: form.oxygenSaturation || '',
          bloodPressure: form.bloodPressure || '',
          weight: form.weight || '',
          height: form.height || '',
          addToProblemList: !!form.addToProblemList,
          development: form.development || [],
          administeredVaccines: form.administeredVaccines || [],
          attachmentName: file?.name || form.attachmentName || '',
          attachmentUrl: form.attachmentUrl || '',
          attachmentPath: form.attachmentPath || ''
        };

        setDemoVisits((current) => {
          const currentVisits = current[patientId] || [];

          return {
            ...current,
            [patientId]: isEditingVisit
              ? currentVisits.map((visit) => (
                visit.id === form.id ? { ...visit, ...visitPayload } : visit
              ))
              : [{ id: `visit-${Date.now()}`, ...visitPayload }, ...currentVisits]
          };
        });
        setPatients((current) => current.map((item) => (
          item.id === patientId
            ? {
                ...item,
                weight: form.weight || item.weight || '',
                height: form.height || item.height || '',
                temperature: form.temperature || item.temperature || '',
                heartRate: form.heartRate || item.heartRate || '',
                resolvedProblems: shouldActivateProblem
                  ? (item.resolvedProblems || []).filter((problem) => !normalizedDiagnosisNames.has(String(problem).toLowerCase()))
                  : (item.resolvedProblems || [])
              }
            : item
        )));
        setNotice(isEditingVisit ? 'Visit updated in demo mode.' : 'Visit saved in demo mode.');
        return;
      }

      const currentPatient = patients.find((item) => item.id === patientId) || null;
      const nextResolvedProblems = shouldActivateProblem
        ? (currentPatient?.resolvedProblems || []).filter((problem) => !normalizedDiagnosisNames.has(String(problem).toLowerCase()))
        : (currentPatient?.resolvedProblems || []);

      let attachmentName = form.attachmentName || '';
      let attachmentUrl = form.attachmentUrl || '';
      let attachmentPath = form.attachmentPath || '';

      if (file) {
        attachmentPath = `doctors/${doctorId}/patients/${patientId}/${Date.now()}-${file.name}`;
        const fileRef = ref(storage, attachmentPath);
        await uploadBytes(fileRef, file);
        attachmentUrl = await getDownloadURL(fileRef);
        attachmentName = file.name;
      }

      const visitPayload = {
        dateOfVisit: form.dateOfVisit,
        diagnosis: diagnosisSummary,
        diagnoses: diagnosisItems,
        prescriptions: form.prescriptions,
        notes: form.notes,
        chiefComplaint: form.chiefComplaint || '',
        historyExam: form.historyExam || '',
        exam: form.exam || '',
        medicationName: primaryMedication.name,
        medicationDose: primaryMedication.dose,
        medicationFrequency: primaryMedication.frequency,
        medicationDuration: primaryMedication.duration,
        medications: medicationItems,
        temperature: form.temperature || '',
        heartRate: form.heartRate || '',
        respiratoryRate: form.respiratoryRate || '',
        oxygenSaturation: form.oxygenSaturation || '',
        bloodPressure: form.bloodPressure || '',
        weight: form.weight || '',
        height: form.height || '',
        addToProblemList: !!form.addToProblemList,
        development: form.development || [],
        administeredVaccines: form.administeredVaccines || [],
        attachmentName,
        attachmentUrl,
        attachmentPath
      };

      if (isEditingVisit) {
        await updateDoc(doc(db, 'doctors', doctorId, 'patients', patientId, 'visits', form.id), {
          ...visitPayload,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'doctors', doctorId, 'patients', patientId, 'visits'), {
          ...visitPayload,
          createdAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, 'doctors', doctorId, 'patients', patientId), {
        weight: form.weight || '',
        height: form.height || '',
        temperature: form.temperature || '',
        heartRate: form.heartRate || '',
        resolvedProblems: nextResolvedProblems,
        updatedAt: serverTimestamp()
      });

      setNotice(isEditingVisit ? 'Visit updated.' : 'Visit record saved.');
    } catch {
      setError('Unable to save the visit or upload the file.');
    } finally {
      setBusy(false);
    }
  };

  const handleResolveProblem = async (patientId, problemName) => {
    const normalizedProblem = String(problemName || '').trim();

    if (!normalizedProblem) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      if (isDemoMode) {
        setPatients((current) => current.map((item) => (
          item.id === patientId
            ? {
                ...item,
                resolvedProblems: Array.from(new Set([...(item.resolvedProblems || []), normalizedProblem]))
              }
            : item
        )));
        setNotice('Problem marked as resolved in demo mode.');
        return;
      }

      const currentPatient = patients.find((item) => item.id === patientId) || null;
      const nextResolvedProblems = Array.from(new Set([...(currentPatient?.resolvedProblems || []), normalizedProblem]));

      await updateDoc(doc(db, 'doctors', doctorId, 'patients', patientId), {
        resolvedProblems: nextResolvedProblems,
        updatedAt: serverTimestamp()
      });
      setNotice('Problem marked as resolved.');
    } catch {
      setError('Unable to update the problem list right now.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddVaccine = async (patientId, form) => {
    setBusy(true);
    setError('');

    const payload = {
      dateAdministered: form.dateAdministered,
      vaccine: form.vaccine.trim(),
      dose: form.dose.trim(),
      site: form.site.trim(),
      signedBy: form.signedBy.trim(),
      remarks: form.remarks.trim()
    };

    const recordId = makeVaccineRecordId(payload.vaccine, payload.dose);

    try {
      if (isDemoMode) {
        setDemoVaccines((current) => ({
          ...current,
          [patientId]: [
            { id: recordId, ...payload },
            ...(current[patientId] || []).filter((item) => item.id !== recordId)
          ]
        }));
        setNotice('Vaccine record saved in demo mode.');
        return;
      }

      await setDoc(doc(db, 'doctors', doctorId, 'patients', patientId, 'vaccines', recordId), {
        ...payload,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setNotice('Vaccine record saved.');
    } catch {
      setError('Unable to save the vaccine record.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveImmunizationSheet = async (patientId, entries, existingRecords = [], options = {}) => {
    const { silent = false } = options;

    setBusy(true);

    if (!silent) {
      setError('');
    }

    const sanitizedEntries = entries
      .map((entry) => ({
        vaccine: entry.vaccine.trim(),
        dose: entry.dose.trim(),
        dateAdministered: entry.dateAdministered,
        site: entry.site.trim(),
        signedBy: entry.signedBy.trim(),
        remarks: entry.remarks.trim()
      }))
      .filter((entry) => [entry.dateAdministered, entry.site, entry.signedBy, entry.remarks].some(Boolean));

    try {
      if (isDemoMode) {
        setDemoVaccines((current) => ({
          ...current,
          [patientId]: sanitizedEntries.map((entry) => ({
            id: makeVaccineRecordId(entry.vaccine, entry.dose),
            ...entry
          }))
        }));

        if (!silent) {
          setNotice('Immunization sheet saved in demo mode.');
        }

        return true;
      }

      const nextIds = new Set(
        sanitizedEntries.map((entry) => makeVaccineRecordId(entry.vaccine, entry.dose))
      );

      await Promise.all([
        ...sanitizedEntries.map((entry) =>
          setDoc(
            doc(
              db,
              'doctors',
              doctorId,
              'patients',
              patientId,
              'vaccines',
              makeVaccineRecordId(entry.vaccine, entry.dose)
            ),
            {
              ...entry,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          )
        ),
        ...existingRecords
          .filter((record) => record.id && !nextIds.has(record.id))
          .map((record) =>
            deleteDoc(doc(db, 'doctors', doctorId, 'patients', patientId, 'vaccines', record.id))
          )
      ]);

      if (!silent) {
        setNotice('Immunization sheet saved.');
      }

      return true;
    } catch {
      if (!silent) {
        setError('Unable to save the immunization sheet.');
      }

      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleAddAppointment = async (form) => {
    setBusy(true);
    setError('');

    const payload = {
      patientName: form.patientName.trim(),
      scheduledFor: form.scheduledFor,
      notes: form.notes.trim()
    };

    try {
      if (isDemoMode) {
        setAppointments((current) => [{ id: `appt-${Date.now()}`, ...payload }, ...current]);
        setNotice('Appointment scheduled in demo mode.');
      } else {
        await addDoc(collection(db, 'doctors', doctorId, 'appointments'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        setNotice('Appointment scheduled.');
      }
    } catch {
      setError('Unable to schedule the appointment.');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadLabDocument = async (patientId, file) => {
    if (!patientId || !file) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      if (isDemoMode) {
        const nextDocument = {
          id: `lab-${Date.now()}`,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileUrl: URL.createObjectURL(file),
          uploadedAt: new Date().toISOString()
        };

        setDemoLabDocuments((current) => ({
          ...current,
          [patientId]: [nextDocument, ...(current[patientId] || [])]
        }));
        setNotice('Diagnostic document uploaded in demo mode.');
        return;
      }

      const storagePath = `doctors/${doctorId}/patients/${patientId}/lab-documents/${Date.now()}-${file.name}`;
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);

      await addDoc(collection(db, 'doctors', doctorId, 'patients', patientId, 'labDocuments'), {
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileUrl,
        storagePath,
        uploadedAt: serverTimestamp()
      });

      setNotice('Diagnostic document uploaded.');
    } catch {
      setError('Unable to upload the diagnostic document.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading EMR workspace...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        loginForm={loginForm}
        onChange={handleLoginChange}
        onSubmit={handleLogin}
        onDemo={handleDemoAccess}
        error={error}
        busy={busy}
        firebaseReady={firebaseReady}
      />
    );
  }

  const mobileFabConfig = isMobile
    ? activePage === 'record' && selectedPatient
      ? {
          label: 'Add Visit',
          onClick: () => setOpenVisitFormSignal((current) => current + 1)
        }
      : activePage === 'patients' || activePage === 'dashboard'
        ? {
            label: 'New Patient',
            onClick: handleOpenNewPatient
          }
        : null
    : null;

  const dashboardColumns = isMobile ? 12 : isTabletPortrait ? 6 : isTabletLandscape ? 4 : 3;

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }} className={theme === 'dark' ? 'dark' : ''}>
        <Header
          doctorEmail={doctorEmail}
          theme={theme}
          activePage={activePage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((current) => !current)}
        />

        <Box
          component="main"
          sx={{
            ml: `${contentOffset}px`,
            width: isMobile ? '100%' : `calc(100% - ${contentOffset}px)`,
            px: { xs: 1.5, sm: 2, md: 2.5, lg: 3 },
            pb: { xs: 11, sm: 4 },
            pt: { xs: 1.5, sm: 2 }
          }}
        >
          <Container maxWidth={false} disableGutters sx={{ maxWidth: 1440, mx: 'auto' }}>
        {activePage === 'dashboard' ? (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={dashboardColumns === 6 ? 6 : 12} md={dashboardColumns === 4 ? 4 : 6} lg={3}>
              <button
                type="button"
                onClick={() => handleNavigate('patients')}
                className="rounded-lg bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-600/30 dark:bg-slate-900"
                style={{ minHeight: '144px', width: '100%' }}
              >
                <p className="text-sm text-slate-500 dark:text-slate-300">Patients</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{patients.length}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Registered pediatric records</p>
              </button>
              </Grid>
              <Grid item xs={12} sm={dashboardColumns === 6 ? 6 : 12} md={dashboardColumns === 4 ? 4 : 6} lg={3}>
              <button
                type="button"
                onClick={() => handleNavigate('appointments')}
                className="rounded-lg bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-600/30 dark:bg-slate-900"
                style={{ minHeight: '144px', width: '100%' }}
              >
                <p className="text-sm text-slate-500 dark:text-slate-300">Appointments</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{appointments.length}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Scheduled patient visits</p>
              </button>
              </Grid>
            </Grid>
          </Box>
        ) : null}

        {activePage === 'patients' ? (
          <div className="space-y-4">
            <PatientList
              patients={filteredPatients}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedPatientId={selectedPatientId}
              onSelect={handleSelectPatient}
              onEdit={(patient) => {
                setEditingPatient(patient);
                setShowPatientForm(true);
                setActivePage('new-patient');
              }}
              onDelete={handleDeletePatient}
            />
          </div>
        ) : null}

        {activePage === 'record' ? (
          selectedPatient ? (
            <div className="space-y-4">
              <PatientProfile
                patient={selectedPatient}
                doctorId={doctorId}
                isDemoMode={isDemoMode}
                demoVisits={demoVisits}
                demoVaccines={demoVaccines}
                demoLabDocuments={demoLabDocuments}
                onAddVisit={handleAddVisit}
                onResolveProblem={handleResolveProblem}
                onAddVaccine={handleAddVaccine}
                onUploadLabDocument={handleUploadLabDocument}
                onSaveImmunizationSheet={handleSaveImmunizationSheet}
                openVisitFormSignal={openVisitFormSignal}
                onEditPatient={() => {
                  setEditingPatient(selectedPatient);
                  setShowPatientForm(true);
                  setActivePage('new-patient');
                }}
                busy={busy}
              />
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              No patient selected yet. Open the Patients page and choose a patient to pull up the medical record.
            </div>
          )
        ) : null}

        {activePage === 'appointments' ? (
          <Box sx={{ mx: 'auto', maxWidth: 1120 }}>
            <AppointmentPanel appointments={appointments} onAddAppointment={handleAddAppointment} busy={busy} />
          </Box>
        ) : null}

        {activePage === 'new-patient' && showPatientForm ? (
          <PatientForm
            patient={editingPatient}
            onCancel={() => {
              setEditingPatient(null);
              setShowPatientForm(false);
              setActivePage('patients');
            }}
            onSave={handleSavePatient}
            busy={busy}
          />
        ) : null}
          </Container>
        </Box>
        {mobileFabConfig ? (
          <Fab
            color="primary"
            variant="extended"
            onClick={mobileFabConfig.onClick}
            sx={{
              position: 'fixed',
              right: 16,
              bottom: 20,
              zIndex: (currentTheme) => currentTheme.zIndex.drawer - 1,
              minHeight: 56,
              px: 2.25
            }}
          >
            <AddRoundedIcon sx={{ mr: 1 }} />
            {mobileFabConfig.label}
          </Fab>
        ) : null}
      </Box>
      <Snackbar
        open={!!toast}
        autoHideDuration={3600}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleToastClose}
          severity={toast?.severity || 'success'}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {toast?.message || ''}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
