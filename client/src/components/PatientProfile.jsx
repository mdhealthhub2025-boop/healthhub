import { Fragment, useEffect, useRef, useState } from 'react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import KeyboardArrowLeftRoundedIcon from '@mui/icons-material/KeyboardArrowLeftRounded';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Box, Grid, Tab, Tabs, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, firebaseReady } from '../firebase';
import VisitDetailsModal from './VisitDetailsModal';

function createEmptyMedication() {
  return {
    name: '',
    dose: '',
    frequency: '',
    duration: ''
  };
}

const initialVisitForm = {
  id: '',
  dateOfVisit: new Date().toISOString().slice(0, 10),
  chiefComplaint: '',
  historyExam: '',
  exam: '',
  diagnosis: '',
  diagnoses: [''],
  prescriptions: '',
  notes: '',
  medicationName: '',
  medicationDose: '',
  medicationFrequency: '',
  medicationDuration: '',
  medications: [createEmptyMedication()],
  temperature: '',
  heartRate: '',
  respiratoryRate: '',
  oxygenSaturation: '',
  bloodPressure: '',
  weight: '',
  height: '',
  addToProblemList: true,
  development: [],
  administeredVaccines: [],
  attachmentName: '',
  attachmentUrl: '',
  attachmentPath: ''
};

const immunizationColumns = [
  [
    { vaccine: 'BCG' },
    { vaccine: 'Hepatitis B', doses: ['1', '2', '3', '4'] },
    { vaccine: 'DTwP / DTaP', doses: ['1', '2', '3', 'Booster 1', 'Booster 2', 'Booster 3'] },
    { vaccine: 'OPV / IPV', doses: ['1', '2', '3', 'Booster 1', 'Booster 2'] },
    { vaccine: 'H. Influenza B (HIB)', doses: ['1', '2', '3', 'Booster 1'] }
  ],
  [
    { vaccine: 'Rotavirus', doses: ['1', '2', '3'] },
    { vaccine: 'PCV', doses: ['1', '2', '3', '4'] },
    { vaccine: 'Measles' },
    { vaccine: 'Influenza', doses: ['1', '2', '3', '4', '5'] },
    { vaccine: 'PPV', doses: ['1', '2'] },
    { vaccine: 'Meningococcal', doses: ['1', 'Booster'] }
  ],
  [
    { vaccine: 'Japanese Encephalitis', doses: ['1', '2'] },
    { vaccine: 'MMR', doses: ['1', '2'] },
    { vaccine: 'Varicella', doses: ['1', '2'] },
    { vaccine: 'Hepatitis A', doses: ['1', '2'] },
    { vaccine: 'Typhoid', doses: ['1'] },
    { vaccine: 'HPV', doses: ['1', '2', '3'] },
    { vaccine: 'Mantoux Testing' },
    { vaccine: 'Vitamin A Supplementation' },
    { vaccine: 'Deworming' }
  ]
];

const VISIT_DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'Select date range' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'thisYear', label: 'This year' }
];

const VISITS_PER_PAGE = 5;
const IMMUNIZATION_AUTO_SAVE_DELAY = 1200;

function formatItems(items) {
  return items?.length ? items.join(', ') : 'None recorded';
}

function formatDate(value) {
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

function getDiagnosisItems(visit) {
  if (Array.isArray(visit?.diagnoses)) {
    return visit.diagnoses.map((item) => String(item || '').trim()).filter(Boolean);
  }

  const diagnosis = String(visit?.diagnosis || '').trim();
  return diagnosis ? [diagnosis] : [];
}

function getMedicationItems(visit) {
  if (Array.isArray(visit?.medications) && visit.medications.length) {
    return visit.medications
      .map((item) => ({
        name: String(item?.name || '').trim(),
        dose: String(item?.dose || '').trim(),
        frequency: String(item?.frequency || '').trim(),
        duration: String(item?.duration || '').trim()
      }))
      .filter((item) => item.name || item.dose || item.frequency || item.duration);
  }

  if (visit?.medicationName || visit?.medicationDose || visit?.medicationFrequency || visit?.medicationDuration) {
    return [{
      name: String(visit.medicationName || '').trim(),
      dose: String(visit.medicationDose || '').trim(),
      frequency: String(visit.medicationFrequency || '').trim(),
      duration: String(visit.medicationDuration || '').trim()
    }].filter((item) => item.name || item.dose || item.frequency || item.duration);
  }

  return [];
}

function formatDiagnosisSummary(items) {
  return items.length ? items.join(', ') : '';
}

function formatMedicationSummary(items) {
  return items
    .map((item) => {
      const details = [
        item.dose ? `Dose ${item.dose}` : '',
        item.frequency,
        item.duration
      ].filter(Boolean).join(' • ');

      if (item.name && details) {
        return `${item.name} (${details})`;
      }

      return item.name || details;
    })
    .filter(Boolean)
    .join(' | ');
}

function getAgeInMonths(value) {
  if (!value) {
    return null;
  }

  const birthDate = new Date(value);

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());

  if (today.getDate() < birthDate.getDate()) {
    totalMonths -= 1;
  }

  return Math.max(totalMonths, 0);
}

function formatHeightDisplay(height, unit = 'cm') {
  return height ? `${height} ${unit}` : 'Not recorded';
}

function formatAgeDisplay(age, birthDateValue) {
  if (birthDateValue) {
    const birthDate = new Date(birthDateValue);

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

      const totalMonths = getAgeInMonths(birthDateValue);

      if (totalMonths !== null && totalMonths < 24) {
        const safeMonths = Math.max(totalMonths, 1);
        return `${safeMonths} month${safeMonths === 1 ? '' : 's'}`;
      }

      if (totalMonths !== null) {
        const years = Math.floor(totalMonths / 12);
        const remainingMonths = totalMonths % 12;
        return remainingMonths > 0
          ? `${years} year${years === 1 ? '' : 's'} ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`
          : `${years} year${years === 1 ? '' : 's'}`;
      }
    }
  }

  const rawAge = String(age ?? '').trim();

  if (!rawAge) {
    return '—';
  }

  return /[a-z]/i.test(rawAge) ? rawAge : `${rawAge} year${rawAge === '1' ? '' : 's'}`;
}

function getVisitDateObject(value) {
  if (!value) {
    return null;
  }

  const parsedDate =
    typeof value === 'string'
      ? new Date(value)
      : value?.seconds
        ? new Date(value.seconds * 1000)
        : new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getVisitYear(value) {
  const parsedDate = getVisitDateObject(value);
  return parsedDate ? String(parsedDate.getFullYear()) : 'Unknown year';
}

function parseMeasurementValue(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildGrowthMetricSeries(visits, patient, field, unit = '') {
  return [...visits]
    .map((visit) => {
      const value = parseMeasurementValue(visit[field]);

      if (value === null) {
        return null;
      }

      return {
        id: visit.id || `${field}-${visit.dateOfVisit}`,
        date: getVisitDateObject(visit.dateOfVisit),
        label: formatDate(visit.dateOfVisit),
        value,
        displayValue: `${value}${unit ? ` ${unit}` : ''}`,
        source: 'visit'
      };
    })
    .filter(Boolean)
    .sort((left, right) => (left.date?.getTime() || 0) - (right.date?.getTime() || 0));
}

function getGrowthTrendSummary(series) {
  if (!series.length) {
    return null;
  }

  const latest = series[series.length - 1];
  const baseline = series.length > 1 ? series[0] : null;

  if (!baseline) {
    return {
      latest,
      previous: null,
      delta: null,
      direction: 'flat',
      note: 'Only one measurement recorded'
    };
  }

  const delta = Number((latest.value - baseline.value).toFixed(2));
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const absoluteDelta = Math.abs(delta);
  const note = delta === 0
    ? `No change since ${baseline.label}`
    : `${delta > 0 ? 'Up' : 'Down'} ${absoluteDelta} since ${baseline.label}`;

  return {
    latest,
    previous: baseline,
    delta,
    direction,
    note
  };
}

function formatChartTickValue(value, unit = '') {
  const roundedValue = Number.isInteger(value) ? value : Number(value.toFixed(1));
  return `${roundedValue}${unit ? ` ${unit}` : ''}`;
}

function getGrowthChartLabel(entry, index, total, series) {
  const duplicateCount = series.filter((item) => item.label === entry.label).length;

  if (total <= 1) {
    return entry.label;
  }

  if (duplicateCount > 1) {
    if (index === 0) {
      return 'Start';
    }

    if (index === total - 1) {
      return 'Latest';
    }

    return `#${index + 1}`;
  }

  if (index === 0) {
    return `Start`;
  }

  if (index === total - 1) {
    return 'Latest';
  }

  return entry.label;
}

function buildGrowthLineChartGeometry(series, width = 320, height = 152) {
  if (!series.length) {
    return null;
  }

  const padding = { top: 16, right: 14, bottom: 28, left: 14 };
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const values = series.map((entry) => entry.value);
  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);

  if (minValue === maxValue) {
    minValue -= 1;
    maxValue += 1;
  }

  const markers = series.map((entry, index) => {
    const x = series.length === 1
      ? padding.left + usableWidth / 2
      : padding.left + (index * usableWidth) / (series.length - 1);
    const y = padding.top + ((maxValue - entry.value) / (maxValue - minValue)) * usableHeight;

    return {
      ...entry,
      x,
      y
    };
  });

  const linePath = markers
    .map((marker, index) => `${index === 0 ? 'M' : 'L'} ${marker.x} ${marker.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${markers[markers.length - 1].x} ${height - padding.bottom} L ${markers[0].x} ${height - padding.bottom} Z`;
  const yTicks = [maxValue, (maxValue + minValue) / 2, minValue];

  return {
    width,
    height,
    padding,
    markers,
    linePath,
    areaPath,
    yTicks,
    minValue,
    maxValue
  };
}

function truncateVisitText(value = '', maxLength = 64) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function getVisitProviderLabel(visit) {
  return visit.provider || visit.doctorName || visit.doctor || 'Clinic team';
}

function getVisitLeadLabel(visit) {
  return visit.chiefComplaint || visit.diagnosis || 'General follow-up';
}

function getVisitRowDetails(visit) {
  const leadLabel = getVisitLeadLabel(visit);
  const detailParts = [getVisitProviderLabel(visit)];

  if (visit.diagnosis && visit.diagnosis !== leadLabel) {
    detailParts.push(visit.diagnosis);
  }

  const outcome = visit.prescriptions || visit.notes || visit.exam || visit.historyExam || '';

  if (outcome) {
    detailParts.push(truncateVisitText(outcome, 54));
  }

  return detailParts.filter(Boolean);
}

function matchesVisitDateRange(visit, dateRange) {
  if (dateRange === 'all') {
    return true;
  }

  const visitDate = getVisitDateObject(visit.dateOfVisit);

  if (!visitDate) {
    return false;
  }

  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (dateRange === 'last30') {
    const threshold = new Date(currentDate);
    threshold.setDate(threshold.getDate() - 30);
    return visitDate >= threshold;
  }

  if (dateRange === 'last90') {
    const threshold = new Date(currentDate);
    threshold.setDate(threshold.getDate() - 90);
    return visitDate >= threshold;
  }

  if (dateRange === 'thisYear') {
    return visitDate.getFullYear() === currentDate.getFullYear();
  }

  return true;
}

function normalizeText(value = '') {
  return value
    .toLowerCase()
    .replace(/vaccine|vaccination/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function makeSheetKey(vaccine, dose = '') {
  return `${normalizeText(vaccine)}::${normalizeText(dose || 'single')}`;
}

function buildVaccineRecordMap(records) {
  const mapped = new Map();

  records.forEach((record) => {
    const vaccineKey = normalizeText(record.vaccine);
    const doseKey = normalizeText(record.dose);

    if (!mapped.has(vaccineKey)) {
      mapped.set(vaccineKey, []);
    }

    mapped.get(vaccineKey).push(record);

    if (doseKey) {
      mapped.set(`${vaccineKey}::${doseKey}`, record);
    }
  });

  return mapped;
}

function findVaccineRecord(vaccineMap, vaccine, dose = '') {
  const vaccineKey = normalizeText(vaccine);
  const doseKey = normalizeText(dose);

  if (doseKey && vaccineMap.has(`${vaccineKey}::${doseKey}`)) {
    return vaccineMap.get(`${vaccineKey}::${doseKey}`);
  }

  const records = vaccineMap.get(vaccineKey) || [];

  if (!doseKey) {
    return records[0] || null;
  }

  return records.find((record) => normalizeText(record.dose).includes(doseKey)) || null;
}

function createImmunizationDraft(records) {
  const vaccineMap = buildVaccineRecordMap(records);
  const draft = {};

  immunizationColumns.forEach((column) => {
    column.forEach((item) => {
      if (item.doses?.length) {
        item.doses.forEach((dose) => {
          const record = findVaccineRecord(vaccineMap, item.vaccine, dose);
          draft[makeSheetKey(item.vaccine, dose)] = {
            vaccine: item.vaccine,
            dose,
            dateAdministered: record?.dateAdministered || '',
            site: record?.site || '',
            signedBy: record?.signedBy || '',
            remarks: record?.remarks || ''
          };
        });
        return;
      }

      const record = findVaccineRecord(vaccineMap, item.vaccine);
      draft[makeSheetKey(item.vaccine)] = {
        vaccine: item.vaccine,
        dose: '',
        dateAdministered: record?.dateAdministered || '',
        site: record?.site || '',
        signedBy: record?.signedBy || '',
        remarks: record?.remarks || ''
      };
    });
  });

  return draft;
}

function serializeImmunizationEntries(entries) {
  return JSON.stringify(
    entries
      .map((entry) => ({
        vaccine: String(entry?.vaccine || '').trim(),
        dose: String(entry?.dose || '').trim(),
        dateAdministered: String(entry?.dateAdministered || ''),
        site: String(entry?.site || '').trim(),
        signedBy: String(entry?.signedBy || '').trim(),
        remarks: String(entry?.remarks || '').trim()
      }))
      .sort((left, right) => makeSheetKey(left.vaccine, left.dose).localeCompare(makeSheetKey(right.vaccine, right.dose)))
  );
}

function ImmunizationTable({ items, draft, busy, onCellChange }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-white dark:border-violet-900 dark:bg-slate-950">
      <table className="min-w-full border-collapse text-left text-[11px] sm:text-xs">
        <thead className="bg-violet-100 text-slate-700 dark:bg-violet-950/60 dark:text-slate-200">
          <tr>
            <th className="border border-violet-200 px-2 py-2 font-semibold dark:border-violet-900">Vaccine</th>
            <th className="border border-violet-200 px-2 py-2 font-semibold dark:border-violet-900">Date</th>
            <th className="border border-violet-200 px-2 py-2 font-semibold dark:border-violet-900">Site</th>
            <th className="border border-violet-200 px-2 py-2 font-semibold dark:border-violet-900">Sign</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            if (!item.doses?.length) {
              const entry = draft[makeSheetKey(item.vaccine)] || {
                vaccine: item.vaccine,
                dose: '',
                dateAdministered: '',
                site: '',
                signedBy: ''
              };

              return (
                <tr key={item.vaccine} className="align-top">
                  <td className="border border-violet-100 px-2 py-1.5 font-medium text-slate-800 dark:border-slate-800 dark:text-slate-100">{item.vaccine}</td>
                  <td className="border border-violet-100 px-1 py-1 dark:border-slate-800">
                    <input
                      className="w-full rounded-md border border-slate-200 bg-transparent px-1.5 py-1 text-slate-700 outline-none focus:border-violet-400 dark:border-slate-700 dark:text-slate-200"
                      type="date"
                      value={entry.dateAdministered}
                      onChange={(event) => onCellChange(item.vaccine, '', 'dateAdministered', event.target.value)}
                      disabled={busy}
                    />
                  </td>
                  <td className="border border-violet-100 px-1 py-1 dark:border-slate-800">
                    <input
                      className="w-full rounded-md border border-slate-200 bg-transparent px-1.5 py-1 text-slate-700 outline-none focus:border-violet-400 dark:border-slate-700 dark:text-slate-200"
                      value={entry.site}
                      onChange={(event) => onCellChange(item.vaccine, '', 'site', event.target.value)}
                      disabled={busy}
                    />
                  </td>
                  <td className="border border-violet-100 px-1 py-1 dark:border-slate-800">
                    <input
                      className="w-full rounded-md border border-slate-200 bg-transparent px-1.5 py-1 text-slate-700 outline-none focus:border-violet-400 dark:border-slate-700 dark:text-slate-200"
                      value={entry.signedBy}
                      onChange={(event) => onCellChange(item.vaccine, '', 'signedBy', event.target.value)}
                      disabled={busy}
                    />
                  </td>
                </tr>
              );
            }

            return (
              <Fragment key={item.vaccine}>
                <tr className="bg-violet-50/70 dark:bg-violet-950/20">
                  <td className="border border-violet-100 px-2 py-1.5 font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
                    {item.vaccine}
                  </td>
                  <td className="border border-violet-100 dark:border-slate-800" />
                  <td className="border border-violet-100 dark:border-slate-800" />
                  <td className="border border-violet-100 dark:border-slate-800" />
                </tr>

                {item.doses.map((dose) => {
                  const entry = draft[makeSheetKey(item.vaccine, dose)] || {
                    vaccine: item.vaccine,
                    dose,
                    dateAdministered: '',
                    site: '',
                    signedBy: ''
                  };

                  return (
                    <tr key={`${item.vaccine}-${dose}`} className="align-top">
                      <td className="border border-violet-100 px-2 py-1.5 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                        <span className="pl-4">{dose}</span>
                      </td>
                      <td className="border border-violet-100 px-1 py-1 dark:border-slate-800">
                        <input
                          className="w-full rounded-md border border-slate-200 bg-transparent px-1.5 py-1 text-slate-700 outline-none focus:border-violet-400 dark:border-slate-700 dark:text-slate-200"
                          type="date"
                          value={entry.dateAdministered}
                          onChange={(event) => onCellChange(item.vaccine, dose, 'dateAdministered', event.target.value)}
                          disabled={busy}
                        />
                      </td>
                      <td className="border border-violet-100 px-1 py-1 dark:border-slate-800">
                        <input
                          className="w-full rounded-md border border-slate-200 bg-transparent px-1.5 py-1 text-slate-700 outline-none focus:border-violet-400 dark:border-slate-700 dark:text-slate-200"
                          value={entry.site}
                          onChange={(event) => onCellChange(item.vaccine, dose, 'site', event.target.value)}
                          disabled={busy}
                        />
                      </td>
                      <td className="border border-violet-100 px-1 py-1 dark:border-slate-800">
                        <input
                          className="w-full rounded-md border border-slate-200 bg-transparent px-1.5 py-1 text-slate-700 outline-none focus:border-violet-400 dark:border-slate-700 dark:text-slate-200"
                          value={entry.signedBy}
                          onChange={(event) => onCellChange(item.vaccine, dose, 'signedBy', event.target.value)}
                          disabled={busy}
                        />
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PatientProfile({
  patient,
  doctorId,
  isDemoMode,
  demoVisits,
  demoVaccines,
  demoLabDocuments,
  onAddVisit,
  onResolveProblem,
  onUploadLabDocument,
  onSaveImmunizationSheet,
  onEditPatient,
  openVisitFormSignal,
  busy
}) {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isTabletPortrait = useMediaQuery(muiTheme.breakpoints.between('sm', 'md'));
  const isTabletLandscape = useMediaQuery(muiTheme.breakpoints.between('md', 'lg'));
  const [visitForm, setVisitForm] = useState(initialVisitForm);
  const [uploadFile, setUploadFile] = useState(null);
  const [labUploadFile, setLabUploadFile] = useState(null);
  const [visits, setVisits] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [labDocuments, setLabDocuments] = useState([]);
  const [immunizationDraft, setImmunizationDraft] = useState({});
  const [immunizationSaveState, setImmunizationSaveState] = useState('saved');
  const [activeTab, setActiveTab] = useState('overview');
  const [visitPanelMode, setVisitPanelMode] = useState('history');
  const [selectedVisitDetails, setSelectedVisitDetails] = useState(null);
  const [visitFilterDraft, setVisitFilterDraft] = useState({ dateRange: 'all', diagnosis: 'all', provider: 'all' });
  const [visitFilters, setVisitFilters] = useState({ dateRange: 'all', diagnosis: 'all', provider: 'all' });
  const [visitPage, setVisitPage] = useState(1);
  const [expandedVisitYears, setExpandedVisitYears] = useState({});
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showOptionalVitals, setShowOptionalVitals] = useState(false);
  const vitalsEditorRef = useRef(null);
  const weightInputRef = useRef(null);
  const immunizationAutoSaveTimeoutRef = useRef(null);
  const lastSavedImmunizationRef = useRef('');
  const createDefaultVisitForm = () => ({
    ...initialVisitForm,
    weight: patient?.weight || '',
    height: patient?.height || '',
    temperature: patient?.temperature || '',
    heartRate: patient?.heartRate || ''
  });

  useEffect(() => {
    if (!patient) {
      setVisits([]);
      return;
    }

    if (isDemoMode || !firebaseReady) {
      setVisits(demoVisits[patient.id] || []);
      return;
    }

    const visitsQuery = query(
      collection(db, 'doctors', doctorId, 'patients', patient.id, 'visits'),
      orderBy('dateOfVisit', 'desc')
    );

    const unsubscribe = onSnapshot(visitsQuery, (snapshot) => {
      setVisits(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return () => unsubscribe();
  }, [patient, doctorId, isDemoMode, demoVisits]);

  useEffect(() => {
    if (!patient) {
      setVaccines([]);
      return;
    }

    if (isDemoMode || !firebaseReady) {
      setVaccines(demoVaccines?.[patient.id] || []);
      return;
    }

    const vaccinesQuery = query(
      collection(db, 'doctors', doctorId, 'patients', patient.id, 'vaccines'),
      orderBy('dateAdministered', 'desc')
    );

    const unsubscribe = onSnapshot(vaccinesQuery, (snapshot) => {
      setVaccines(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return () => unsubscribe();
  }, [patient, doctorId, isDemoMode, demoVaccines]);

  useEffect(() => {
    if (!patient) {
      setLabDocuments([]);
      return;
    }

    if (isDemoMode || !firebaseReady) {
      setLabDocuments(demoLabDocuments?.[patient.id] || []);
      return;
    }

    const labDocumentsQuery = query(
      collection(db, 'doctors', doctorId, 'patients', patient.id, 'labDocuments'),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(labDocumentsQuery, (snapshot) => {
      setLabDocuments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return () => unsubscribe();
  }, [patient, doctorId, isDemoMode, demoLabDocuments]);

  useEffect(() => {
    const nextDraft = createImmunizationDraft(vaccines);
    const serializedDraft = serializeImmunizationEntries(Object.values(nextDraft));

    if (immunizationAutoSaveTimeoutRef.current) {
      clearTimeout(immunizationAutoSaveTimeoutRef.current);
      immunizationAutoSaveTimeoutRef.current = null;
    }

    lastSavedImmunizationRef.current = serializedDraft;
    setImmunizationSaveState('saved');
    setImmunizationDraft(nextDraft);
  }, [vaccines]);

  useEffect(() => () => {
    if (immunizationAutoSaveTimeoutRef.current) {
      clearTimeout(immunizationAutoSaveTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    setActiveTab('overview');
    setVisitPanelMode('history');
    setSelectedVisitDetails(null);
    setVisitFilterDraft({ dateRange: 'all', diagnosis: 'all', provider: 'all' });
    setVisitFilters({ dateRange: 'all', diagnosis: 'all', provider: 'all' });
    setVisitPage(1);
    setExpandedVisitYears({});
    setShowVitalsEditor(false);
    setShowOptionalVitals(false);
    setVisitForm(createDefaultVisitForm());
  }, [patient?.id, patient?.weight, patient?.height, patient?.temperature, patient?.heartRate]);

  useEffect(() => {
    if (showVitalsEditor) {
      weightInputRef.current?.focus();
    }
  }, [showVitalsEditor]);

  useEffect(() => {
    if (visitForm.respiratoryRate || visitForm.oxygenSaturation || visitForm.bloodPressure) {
      setShowOptionalVitals(true);
    }
  }, [visitForm.respiratoryRate, visitForm.oxygenSaturation, visitForm.bloodPressure]);

  const handleVisitChange = (event) => {
    const { name, value, type, checked } = event.target;
    setVisitForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDiagnosisItemChange = (index, value) => {
    setVisitForm((current) => ({
      ...current,
      diagnoses: current.diagnoses.map((item, itemIndex) => (itemIndex === index ? value : item))
    }));
  };

  const handleAddDiagnosisItem = () => {
    setVisitForm((current) => ({
      ...current,
      diagnoses: [...current.diagnoses, '']
    }));
  };

  const handleRemoveDiagnosisItem = (index) => {
    setVisitForm((current) => ({
      ...current,
      diagnoses: current.diagnoses.length > 1
        ? current.diagnoses.filter((_, itemIndex) => itemIndex !== index)
        : current.diagnoses
    }));
  };

  const handleMedicationItemChange = (index, field, value) => {
    setVisitForm((current) => ({
      ...current,
      medications: current.medications.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
    }));
  };

  const handleAddMedicationItem = () => {
    setVisitForm((current) => ({
      ...current,
      medications: [...current.medications, createEmptyMedication()]
    }));
  };

  const handleRemoveMedicationItem = (index) => {
    setVisitForm((current) => ({
      ...current,
      medications: current.medications.length > 1
        ? current.medications.filter((_, itemIndex) => itemIndex !== index)
        : current.medications
    }));
  };

  const handleEditVitals = () => {
    setShowVitalsEditor((current) => !current);
    vitalsEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleOpenVisitHistory = () => {
    setShowVitalsEditor(false);
    setShowOptionalVitals(false);
    setVisitForm(createDefaultVisitForm());
    setActiveTab('visits');
    setVisitPanelMode('history');
  };

  const handleVisitFilterDraftChange = (field, value) => {
    setVisitFilterDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleApplyVisitFilters = () => {
    setVisitFilters(visitFilterDraft);
    setVisitPage(1);
    setExpandedVisitYears({});
  };

  const handleToggleVisitYear = (year) => {
    setExpandedVisitYears((current) => ({
      ...current,
      [year]: !(current[year] ?? year === pagedVisitYears[0])
    }));
  };

  const handleOpenVisitForm = () => {
    setShowVitalsEditor(false);
    setShowOptionalVitals(false);
    setVisitForm(createDefaultVisitForm());
    setActiveTab('visits');
    setVisitPanelMode('form');
  };

  useEffect(() => {
    if (openVisitFormSignal && patient) {
      handleOpenVisitForm();
    }
  }, [openVisitFormSignal, patient]);

  const handleOpenVisitDetails = (visit) => {
    setSelectedVisitDetails(visit);
  };

  const handleCloseVisitDetails = () => {
    setSelectedVisitDetails(null);
  };

  const handleStartVisitEdit = (visit) => {
    setUploadFile(null);
    const diagnosisItems = getDiagnosisItems(visit);
    const medicationItems = getMedicationItems(visit);

    setVisitForm({
      ...initialVisitForm,
      id: visit.id || '',
      dateOfVisit: visit.dateOfVisit || new Date().toISOString().slice(0, 10),
      chiefComplaint: visit.chiefComplaint || '',
      historyExam: visit.historyExam || '',
      exam: visit.exam || '',
      diagnosis: visit.diagnosis || '',
      diagnoses: diagnosisItems.length ? diagnosisItems : [''],
      prescriptions: visit.prescriptions || '',
      notes: visit.notes || '',
      medicationName: visit.medicationName || '',
      medicationDose: visit.medicationDose || '',
      medicationFrequency: visit.medicationFrequency || '',
      medicationDuration: visit.medicationDuration || '',
      medications: medicationItems.length ? medicationItems : [createEmptyMedication()],
      temperature: visit.temperature || '',
      heartRate: visit.heartRate || '',
      respiratoryRate: visit.respiratoryRate || '',
      oxygenSaturation: visit.oxygenSaturation || '',
      bloodPressure: visit.bloodPressure || '',
      weight: visit.weight || patient?.weight || '',
      height: visit.height || patient?.height || '',
      addToProblemList: Boolean(visit.addToProblemList),
      development: visit.development || [],
      administeredVaccines: visit.administeredVaccines || [],
      attachmentName: visit.attachmentName || '',
      attachmentUrl: visit.attachmentUrl || '',
      attachmentPath: visit.attachmentPath || ''
    });
    setShowVitalsEditor(false);
    setShowOptionalVitals(Boolean(visit.respiratoryRate || visit.oxygenSaturation || visit.bloodPressure));
    setActiveTab('visits');
    setVisitPanelMode('form');
  };

  const handleImmunizationChange = (vaccine, dose, field, value) => {
    setImmunizationDraft((current) => {
      const key = makeSheetKey(vaccine, dose);
      const existing = current[key] || {
        vaccine,
        dose,
        dateAdministered: '',
        site: '',
        signedBy: '',
        remarks: ''
      };

      return {
        ...current,
        [key]: {
          ...existing,
          [field]: value
        }
      };
    });
  };

  useEffect(() => {
    if (!patient) {
      return undefined;
    }

    const draftEntries = Object.values(immunizationDraft);

    if (!draftEntries.length) {
      return undefined;
    }

    const serializedDraft = serializeImmunizationEntries(draftEntries);

    if (serializedDraft === lastSavedImmunizationRef.current) {
      return undefined;
    }

    if (immunizationAutoSaveTimeoutRef.current) {
      clearTimeout(immunizationAutoSaveTimeoutRef.current);
    }

    setImmunizationSaveState('pending');
    immunizationAutoSaveTimeoutRef.current = setTimeout(async () => {
      setImmunizationSaveState('saving');
      const saved = await onSaveImmunizationSheet(patient.id, draftEntries, vaccines, { silent: true });

      if (saved) {
        lastSavedImmunizationRef.current = serializedDraft;
        setImmunizationSaveState('saved');
      } else {
        setImmunizationSaveState('error');
      }

      immunizationAutoSaveTimeoutRef.current = null;
    }, IMMUNIZATION_AUTO_SAVE_DELAY);

    return () => {
      if (immunizationAutoSaveTimeoutRef.current) {
        clearTimeout(immunizationAutoSaveTimeoutRef.current);
        immunizationAutoSaveTimeoutRef.current = null;
      }
    };
  }, [immunizationDraft, onSaveImmunizationSheet, patient, vaccines]);

  const handleVisitSubmit = async (event) => {
    event.preventDefault();

    if (!patient) {
      return;
    }

    const diagnoses = visitForm.diagnoses.map((item) => String(item || '').trim()).filter(Boolean);
    const medications = visitForm.medications
      .map((item) => ({
        name: String(item?.name || '').trim(),
        dose: String(item?.dose || '').trim(),
        frequency: String(item?.frequency || '').trim(),
        duration: String(item?.duration || '').trim()
      }))
      .filter((item) => item.name || item.dose || item.frequency || item.duration);

    if (!diagnoses.length) {
      return;
    }

    const primaryMedication = medications[0] || createEmptyMedication();
    const diagnosisSummary = formatDiagnosisSummary(diagnoses);
    const medicationSummary = formatMedicationSummary(medications);

    const normalizedVisit = {
      ...visitForm,
      diagnosis: diagnosisSummary,
      diagnoses,
      notes: visitForm.notes || [visitForm.chiefComplaint, visitForm.historyExam, visitForm.exam].filter(Boolean).join(' • '),
      prescriptions: visitForm.prescriptions || medicationSummary,
      medicationName: primaryMedication.name,
      medicationDose: primaryMedication.dose,
      medicationFrequency: primaryMedication.frequency,
      medicationDuration: primaryMedication.duration,
      medications
    };

    await onAddVisit(patient.id, normalizedVisit, uploadFile);
    setVisitForm(createDefaultVisitForm());
    setUploadFile(null);
    setActiveTab('visits');
    setVisitPanelMode('history');
  };

  const handleSaveSheet = async () => {
    if (!patient) {
      return;
    }

    if (immunizationAutoSaveTimeoutRef.current) {
      clearTimeout(immunizationAutoSaveTimeoutRef.current);
      immunizationAutoSaveTimeoutRef.current = null;
    }

    setImmunizationSaveState('saving');
    const draftEntries = Object.values(immunizationDraft);
    const saved = await onSaveImmunizationSheet(patient.id, draftEntries, vaccines);

    if (saved) {
      lastSavedImmunizationRef.current = serializeImmunizationEntries(draftEntries);
      setImmunizationSaveState('saved');
    } else {
      setImmunizationSaveState('error');
    }
  };

  const handleLabUpload = async (event) => {
    event.preventDefault();

    if (!patient || !labUploadFile) {
      return;
    }

    await onUploadLabDocument(patient.id, labUploadFile);
    setLabUploadFile(null);
  };

  const latestVisit = visits[0] || null;
  const medicationSummary = latestVisit ? (formatMedicationSummary(getMedicationItems(latestVisit)) || latestVisit.prescriptions || 'None') : 'None';
  const ageInMonths = getAgeInMonths(patient?.birthDate);
  const resolvedProblemNames = new Set((patient?.resolvedProblems || []).map((problem) => String(problem || '').trim().toLowerCase()).filter(Boolean));
  const activeProblems = [
    ...visits
      .flatMap((visit) => (
        visit.addToProblemList
          ? getDiagnosisItems(visit).map((diagnosis) => ({
              name: diagnosis,
              status: 'Active',
              date: getVisitDateObject(visit.dateOfVisit)
            }))
          : []
      ))
      .sort((left, right) => (right.date?.getTime() || 0) - (left.date?.getTime() || 0)),
    ...(patient?.conditions || [])
      .map((condition) => String(condition || '').trim())
      .filter((condition) => condition && condition.toLowerCase() !== 'none')
      .map((condition) => ({
        name: condition,
        status: 'Active',
        date: null
      }))
  ]
    .filter((problem) => !resolvedProblemNames.has(problem.name.toLowerCase()))
    .filter((problem, index, items) => items.findIndex((item) => item.name.toLowerCase() === problem.name.toLowerCase()) === index);
  const visibleActiveProblems = activeProblems.slice(0, 5);
  const hiddenActiveProblemCount = Math.max(activeProblems.length - visibleActiveProblems.length, 0);
  const diagnosisOptions = Array.from(new Set(visits.flatMap((visit) => getDiagnosisItems(visit)))).sort((left, right) => left.localeCompare(right));
  const providerOptions = Array.from(new Set(visits.map((visit) => getVisitProviderLabel(visit)).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  const immunizationSaveMessage = {
    pending: 'Auto-save pending...',
    saving: 'Saving changes...',
    saved: 'All vaccine changes saved',
    error: 'Auto-save failed. Use Save now.'
  }[immunizationSaveState];
  const filteredVisits = visits.filter((visit) => {
    const diagnosisValues = getDiagnosisItems(visit);
    const providerValue = getVisitProviderLabel(visit);

    return matchesVisitDateRange(visit, visitFilters.dateRange)
      && (visitFilters.diagnosis === 'all' || diagnosisValues.includes(visitFilters.diagnosis))
      && (visitFilters.provider === 'all' || providerValue === visitFilters.provider);
  });
  const totalVisitPages = Math.max(1, Math.ceil(filteredVisits.length / VISITS_PER_PAGE));
  const safeVisitPage = Math.min(visitPage, totalVisitPages);
  const pagedVisits = filteredVisits.slice((safeVisitPage - 1) * VISITS_PER_PAGE, safeVisitPage * VISITS_PER_PAGE);
  const pagedVisitGroups = pagedVisits.reduce((groups, visit) => {
    const year = getVisitYear(visit.dateOfVisit);

    if (!groups[year]) {
      groups[year] = [];
    }

    groups[year].push(visit);
    return groups;
  }, {});
  const pagedVisitYears = Object.keys(pagedVisitGroups).sort((left, right) => Number(right) - Number(left));
  const weightTrendSeries = buildGrowthMetricSeries(visits, patient, 'weight', 'kg');
  const heightTrendSeries = buildGrowthMetricSeries(visits, patient, 'height', patient?.heightUnit || 'cm');
  const growthTrendCards = [
    {
      key: 'weight',
      label: 'Weight',
      accent: 'emerald',
      unit: 'kg',
      series: weightTrendSeries
    },
    {
      key: 'height',
      label: 'Height',
      accent: 'sky',
      unit: patient?.heightUnit || 'cm',
      series: heightTrendSeries
    }
  ].map((item) => ({
    ...item,
    summary: getGrowthTrendSummary(item.series)
  }));
  const upcomingVaccineSummary = ageInMonths !== null && ageInMonths < 12
    ? 'MMR due at 12 months'
    : vaccines.length > 0
      ? 'Immunization records available'
      : 'No vaccine records yet';

  if (!patient) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        Select a patient to view their medical record.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-100 text-3xl dark:bg-amber-900/30">
              👤
            </div>
            <div className="space-y-2">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{patient.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                  <span>{formatAgeDisplay(patient.age, patient.birthDate)}</span>
                  <span>•</span>
                  <span>{patient.sex || '—'}</span>
                </div>
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-200">
                <span className="font-semibold">Parents:</span> {patient.guardianName || 'Unknown'}
                <span className="px-2 text-slate-400">•</span>
                {patient.guardianContact || 'No contact recorded'}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  Allergies
                </span>
                <span className="text-slate-700 dark:text-slate-200">{formatItems(patient.allergies)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              type="button"
              onClick={() => onEditPatient?.(patient)}
            >
              Edit Patient
            </button>
            <button
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
              type="button"
              onClick={handleOpenVisitForm}
            >
              Add Visit
            </button>
          </div>
        </div>

        <Box sx={{ mt: 2, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }} className="print:hidden">
          <Tabs
            value={activeTab}
            onChange={(_, value) => {
              setActiveTab(value);
              if (value === 'visits') {
                setVisitPanelMode('history');
              }
            }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 44,
              '& .MuiTabs-flexContainer': {
                gap: { xs: 1, sm: 2 }
              },
              '& .MuiTab-root': {
                minHeight: 44,
                px: { xs: 1, sm: 1.5 },
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'none'
              }
            }}
          >
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'growth', label: 'Growth' },
              { key: 'visits', label: 'Visits' },
              { key: 'vaccines', label: 'Vaccines' },
              { key: 'labs', label: 'Labs' }
            ].map((tab) => (
              <Tab key={tab.key} value={tab.key} label={tab.label} />
            ))}
          </Tabs>
        </Box>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-4">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} lg={4}>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-full">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">Problem List</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Active only</p>
                  </div>
                </div>

                {visibleActiveProblems.length ? (
                  <div className="mt-4 space-y-2">
                    {visibleActiveProblems.map((problem) => (
                      <div key={problem.name} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                        <span className="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{problem.name}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {problem.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => onResolveProblem?.(patient.id, problem.name)}
                            disabled={busy}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    ))}

                    {hiddenActiveProblemCount ? (
                      <p className="pt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        +{hiddenActiveProblemCount} more active problem{hiddenActiveProblemCount === 1 ? '' : 's'}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">None recorded</p>
                )}
              </div>
            </Grid>

            <Grid item xs={12} sm={6} lg={4}>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-full">
                <p className="text-base font-semibold text-slate-900 dark:text-white">Medications</p>
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{medicationSummary}</p>
              </div>
            </Grid>

            <Grid item xs={12} sm={6} lg={4}>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-full">
                <p className="text-base font-semibold text-slate-900 dark:text-white">Guardian Info</p>
                <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">{patient.guardianName || 'Unknown'}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{patient.guardianContact || 'No contact recorded'}</p>
              </div>
            </Grid>

            <Grid item xs={12} sm={6} lg={4}>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-full">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Latest Visit</h3>
                <button
                  className="rounded-xl bg-violet-100 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-200 dark:bg-slate-800 dark:text-violet-300"
                  type="button"
                  onClick={handleOpenVisitForm}
                >
                  + Add Visit
                </button>
              </div>

              {latestVisit ? (
                <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatDate(latestVisit.dateOfVisit)}</p>
                  <p><span className="font-semibold">Diagnosis:</span> {latestVisit.diagnosis}</p>
                  <p><span className="font-semibold">Notes:</span> {latestVisit.notes}</p>
                  <p><span className="font-semibold">Medication:</span> {latestVisit.prescriptions}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  No visits recorded yet.
                </div>
              )}
            </div>
            </Grid>
          </Grid>

          <div>
            <h3 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-white">Growth</h3>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-full">
                  <p className="text-base font-semibold text-slate-900 dark:text-white">Weight</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{patient.weight ? `${patient.weight} kg` : '—'}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Latest recorded weight</p>
                </div>
              </Grid>
              <Grid item xs={12} sm={6}>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-full">
                  <p className="text-base font-semibold text-slate-900 dark:text-white">Height</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{patient.height ? formatHeightDisplay(patient.height, patient.heightUnit) : '—'}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Latest recorded height</p>
                </div>
              </Grid>
            </Grid>
          </div>
        </div>
      ) : null}

      {activeTab === 'growth' ? (
        <div className="space-y-3">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800 h-full">
              <p className="text-xs font-semibold uppercase text-slate-500">Weight</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{patient.weight ? `${patient.weight} kg` : 'Not recorded'}</p>
            </div>
            </Grid>
            <Grid item xs={12} sm={6}>
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800 h-full">
              <p className="text-xs font-semibold uppercase text-slate-500">Height</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{formatHeightDisplay(patient.height, patient.heightUnit)}</p>
            </div>
            </Grid>
          </Grid>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Trends</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Based on the measurements already recorded in visits and the current patient profile.
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {visits.length} recorded visit{visits.length === 1 ? '' : 's'}
              </p>
            </div>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              {growthTrendCards.map((metric) => {
                const summary = metric.summary;
                const series = metric.series;
                const chartGeometry = buildGrowthLineChartGeometry(series);
                const accentClasses = {
                  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
                  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'
                };
                const accentColors = {
                  emerald: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.16)', dot: '#059669' },
                  sky: { stroke: '#0ea5e9', fill: 'rgba(14, 165, 233, 0.16)', dot: '#0284c7' }
                };
                const accentColor = accentColors[metric.accent];

                return (
                  <Grid item xs={12} md={6} key={metric.key}>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 h-full">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{metric.label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                          {summary?.latest?.displayValue || 'Not recorded'}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${accentClasses[metric.accent]}`}>
                        {summary ? summary.note : 'No measurements yet'}
                      </span>
                    </div>

                    {series.length ? (
                      <>
                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                          <div className="flex items-start gap-3">
                            <div className="flex h-38 flex-col justify-between py-4 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                              {chartGeometry.yTicks.map((tick, index) => (
                                <span key={`${metric.key}-tick-${index}`}>{formatChartTickValue(tick, metric.unit)}</span>
                              ))}
                            </div>

                            <div className="min-w-0 flex-1">
                              <svg viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`} className="h-38 w-full overflow-visible">
                                {chartGeometry.yTicks.map((tick, index) => {
                                  const y = chartGeometry.padding.top + ((chartGeometry.maxValue - tick) / (chartGeometry.maxValue - chartGeometry.minValue)) * (chartGeometry.height - chartGeometry.padding.top - chartGeometry.padding.bottom);

                                  return (
                                    <line
                                      key={`${metric.key}-grid-${index}`}
                                      x1={chartGeometry.padding.left}
                                      x2={chartGeometry.width - chartGeometry.padding.right}
                                      y1={y}
                                      y2={y}
                                      stroke="currentColor"
                                      strokeWidth="1"
                                      className="text-slate-200 dark:text-slate-800"
                                    />
                                  );
                                })}

                                <path d={chartGeometry.areaPath} fill={accentColor.fill} />
                                <path d={chartGeometry.linePath} fill="none" stroke={accentColor.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                                {chartGeometry.markers.map((marker) => (
                                  <g key={`${metric.key}-${marker.id}`}>
                                    <circle cx={marker.x} cy={marker.y} r="4.5" fill="white" stroke={accentColor.dot} strokeWidth="2.5" />
                                    <title>{`Record ${chartGeometry.markers.findIndex((item) => item.id === marker.id) + 1} • ${marker.label}: ${marker.displayValue}`}</title>
                                  </g>
                                ))}
                              </svg>

                              <div className="mt-1 grid gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400" style={{ gridTemplateColumns: `repeat(${Math.max(series.length, 1)}, minmax(0, 1fr))` }}>
                                {series.map((entry, index) => (
                                  <span key={`${metric.key}-label-${entry.id}`} className="truncate text-center">
                                    {getGrowthChartLabel(entry, index, series.length, series)}
                                  </span>
                                ))}
                              </div>

                              {series.some((entry, index) => series.findIndex((item) => item.label === entry.label) !== index) ? (
                                <p className="mt-2 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                  Same-day entries are shown in recorded order from left to right.
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          {series.slice().reverse().slice(0, 3).map((entry) => (
                            <div key={`${metric.key}-${entry.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                              <span>{entry.label}</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{entry.displayValue}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                        No {metric.label.toLowerCase()} measurements recorded yet.
                      </div>
                    )}
                  </div>
                  </Grid>
                );
              })}
            </Grid>
          </div>
        </div>
      ) : null}

      {activeTab === 'visits' ? (
        <div className="space-y-3">
          {visitPanelMode === 'history' ? (
            <div className="space-y-4 print:hidden">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Visits</h3>
                      <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                        Total Visits: {visits.length} | Last Visit: {latestVisit ? formatDate(latestVisit.dateOfVisit) : '—'}
                      </p>
                    </div>

                    <button
                      className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
                      type="button"
                      onClick={handleOpenVisitForm}
                    >
                      + Add Visit
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                    <label className="flex min-w-0 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950">
                      <span className="border-r border-slate-200 px-4 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Date Range</span>
                      <select
                        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-slate-600 outline-none dark:text-slate-300"
                        value={visitFilterDraft.dateRange}
                        onChange={(event) => handleVisitFilterDraftChange('dateRange', event.target.value)}
                      >
                        {VISIT_DATE_RANGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                    <label className="flex min-w-0 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950">
                      <span className="border-r border-slate-200 px-4 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Diagnosis</span>
                      <select
                        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-slate-600 outline-none dark:text-slate-300"
                        value={visitFilterDraft.diagnosis}
                        onChange={(event) => handleVisitFilterDraftChange('diagnosis', event.target.value)}
                      >
                        <option value="all">All Diagnoses</option>
                        {diagnosisOptions.map((diagnosis) => (
                          <option key={diagnosis} value={diagnosis}>{diagnosis}</option>
                        ))}
                      </select>
                    </label>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                    <label className="flex min-w-0 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950">
                      <span className="border-r border-slate-200 px-4 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Provider</span>
                      <select
                        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-slate-600 outline-none dark:text-slate-300"
                        value={visitFilterDraft.provider}
                        onChange={(event) => handleVisitFilterDraftChange('provider', event.target.value)}
                      >
                        <option value="all">All Providers</option>
                        {providerOptions.map((provider) => (
                          <option key={provider} value={provider}>{provider}</option>
                        ))}
                      </select>
                    </label>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4} lg={2}>
                    <button
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                      type="button"
                      onClick={handleApplyVisitFilters}
                    >
                      <SearchRoundedIcon fontSize="small" />
                      Search
                    </button>
                    </Grid>
                  </Grid>
                </div>
              </div>

              {filteredVisits.length ? (
                <div className="space-y-3">
                  {pagedVisitYears.map((year) => {
                    const yearVisits = pagedVisitGroups[year] || [];
                    const isExpanded = expandedVisitYears[year] ?? year === pagedVisitYears[0];

                    return (
                      <div key={year} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => handleToggleVisitYear(year)}
                          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                        >
                          <span className="inline-flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
                            <ExpandMoreRoundedIcon className={`transition ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                            {year} Visits
                          </span>
                          <ExpandMoreRoundedIcon className={`transition ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                        </button>

                        {isExpanded ? (
                          <div className="border-t border-slate-200 dark:border-slate-800">
                            {yearVisits.map((visit, index) => {
                              const leadLabel = getVisitLeadLabel(visit);
                              const detailParts = getVisitRowDetails(visit);

                              return (
                                <div
                                  key={visit.id || `${visit.dateOfVisit}-${visit.diagnosis || visit.notes || 'visit'}`}
                                  className={`flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between ${index > 0 ? 'border-t border-slate-200 dark:border-slate-800' : ''}`}
                                >
                                  <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-5">
                                    <p className="shrink-0 text-[1.65rem] font-bold tracking-[-0.02em] text-slate-900 dark:text-white lg:w-44 lg:text-[1.55rem]">
                                      {formatDate(visit.dateOfVisit)}
                                    </p>
                                    <div className="min-w-0 text-base text-slate-700 dark:text-slate-200">
                                      <span className="font-bold text-sky-800 dark:text-sky-300">{leadLabel}</span>
                                      {detailParts.length ? (
                                        <>
                                          <span className="px-2 text-slate-300 dark:text-slate-600">•</span>
                                          <span>{detailParts.join(' • ')}</span>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenVisitDetails(visit)}
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-950 dark:text-violet-300 dark:hover:bg-slate-800"
                                    >
                                      <VisibilityOutlinedIcon fontSize="small" />
                                      View
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStartVisitEdit(visit)}
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-950 dark:text-violet-300 dark:hover:bg-slate-800"
                                    >
                                      <EditOutlinedIcon fontSize="small" />
                                      Edit
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-center gap-0 rounded-2xl pt-3">
                    <button
                      type="button"
                      onClick={() => setVisitPage((current) => Math.max(1, current - 1))}
                      disabled={safeVisitPage === 1}
                      className="inline-flex items-center gap-1 rounded-l-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <KeyboardArrowLeftRoundedIcon />
                      Previous
                    </button>
                    <div className="border-y border-slate-200 bg-white px-6 py-3 text-xl font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      Page {safeVisitPage} of {totalVisitPages}
                    </div>
                    <button
                      type="button"
                      onClick={() => setVisitPage((current) => Math.min(totalVisitPages, current + 1))}
                      disabled={safeVisitPage >= totalVisitPages}
                      className="inline-flex items-center gap-1 rounded-r-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Next
                      <KeyboardArrowRightRoundedIcon />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  No visits match the selected filters.
                </div>
              )}
            </div>
          ) : (
          <form className="space-y-3 print:hidden" onSubmit={handleVisitSubmit}>
            <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={handleOpenVisitHistory}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{visitForm.id ? 'Edit Visit' : 'New Visit'}</h3>
              <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700" type="submit" disabled={busy}>
                {busy ? (visitForm.id ? 'Updating...' : 'Saving...') : (visitForm.id ? 'Update Visit' : 'Save Visit')}
              </button>
            </div>
            {visitForm.id && visitForm.attachmentName ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                Current attachment: {visitForm.attachmentName}
              </div>
            ) : null}

            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} lg={8}>
              <div className="space-y-3 min-w-0">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Chief Complaint</h3>
                  </div>
                  <input className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" name="chiefComplaint" placeholder="Reason for visit..." value={visitForm.chiefComplaint} onChange={handleVisitChange} required />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">History &amp; Exam</h3>
                  <textarea className="mt-2 min-h-16 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" name="historyExam" placeholder="Duration of symptoms, feeding, relevant history..." value={visitForm.historyExam} onChange={handleVisitChange} />
                  <textarea className="mt-2 min-h-20 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" name="exam" placeholder="General appearance and physical findings..." value={visitForm.exam} onChange={handleVisitChange} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Diagnosis</h3>
                    <button
                      type="button"
                      onClick={handleAddDiagnosisItem}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <AddRoundedIcon sx={{ fontSize: 18 }} />
                      Add Diagnosis
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {visitForm.diagnoses.map((diagnosis, index) => (
                      <div key={`diagnosis-${index}`} className={`flex gap-2 ${isMobile ? 'flex-col' : 'items-center'}`}>
                        <input
                          className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          placeholder={`Diagnosis ${index + 1}`}
                          value={diagnosis}
                          onChange={(event) => handleDiagnosisItemChange(index, event.target.value)}
                          required={index === 0}
                        />
                        {visitForm.diagnoses.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveDiagnosisItem(index)}
                            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <RemoveRoundedIcon sx={{ fontSize: 16 }} />
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input type="checkbox" name="addToProblemList" checked={visitForm.addToProblemList} onChange={handleVisitChange} />
                      Add to Problem List
                    </label>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">Active</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Medications / Plan</h3>
                    <button
                      type="button"
                      onClick={handleAddMedicationItem}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <AddRoundedIcon sx={{ fontSize: 18 }} />
                      Add Medication
                    </button>
                  </div>
                  <div className="mt-2 space-y-3">
                    {visitForm.medications.map((medication, index) => (
                      <div key={`medication-${index}`} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Medication {index + 1}</p>
                          {visitForm.medications.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveMedicationItem(index)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <RemoveRoundedIcon sx={{ fontSize: 16 }} />
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <input
                          className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          placeholder="Medication name"
                          value={medication.name}
                          onChange={(event) => handleMedicationItemChange(index, 'name', event.target.value)}
                        />
                        <div className={`mt-2 grid gap-2 ${isMobile ? 'grid-cols-1' : isTabletPortrait ? 'grid-cols-2' : 'grid-cols-3'}`}>
                          <input
                            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            placeholder="Dose (mg)"
                            value={medication.dose}
                            onChange={(event) => handleMedicationItemChange(index, 'dose', event.target.value)}
                          />
                          <input
                            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            placeholder="Frequency"
                            value={medication.frequency}
                            onChange={(event) => handleMedicationItemChange(index, 'frequency', event.target.value)}
                          />
                          <input
                            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            placeholder="Duration"
                            value={medication.duration}
                            onChange={(event) => handleMedicationItemChange(index, 'duration', event.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Attachments</h3>
                  <input className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" type="file" accept="image/*,.pdf" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
                </div>
              </div>
              </Grid>

              <Grid item xs={12} lg={4}>
              <div className="space-y-3 min-w-0">
                <div ref={vitalsEditorRef} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Vitals</h3>
                    <button
                      type="button"
                      onClick={handleEditVitals}
                      className="rounded-xl bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {showVitalsEditor ? 'Done' : 'Edit'}
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                    <p><span className="font-semibold">Weight</span> {visitForm.weight ? `${visitForm.weight} kg` : (patient.weight ? `${patient.weight} kg` : 'Not recorded')}</p>
                    <p><span className="font-semibold">Height</span> {visitForm.height ? formatHeightDisplay(visitForm.height, patient.heightUnit) : formatHeightDisplay(patient.height, patient.heightUnit)}</p>
                    <p><span className="font-semibold">Temp</span> {visitForm.temperature || patient.temperature || '—'}</p>
                    <p><span className="font-semibold">HR</span> {visitForm.heartRate || patient.heartRate || '—'}</p>
                    {visitForm.respiratoryRate ? <p><span className="font-semibold">RR</span> {visitForm.respiratoryRate}</p> : null}
                    {visitForm.oxygenSaturation ? <p><span className="font-semibold">SpO2</span> {visitForm.oxygenSaturation}</p> : null}
                    {visitForm.bloodPressure ? <p><span className="font-semibold">BP</span> {visitForm.bloodPressure}</p> : null}
                  </div>
                  {showVitalsEditor ? (
                    <>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Edit vitals</p>
                        <button
                          type="button"
                          onClick={() => setShowOptionalVitals((current) => !current)}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          <ExpandMoreRoundedIcon className={`transition ${showOptionalVitals ? 'rotate-180' : 'rotate-0'}`} fontSize="small" />
                          More vitals
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2">
                        <input ref={weightInputRef} className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" name="weight" placeholder="Weight (kg)" value={visitForm.weight} onChange={handleVisitChange} />
                        <input className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" name="height" placeholder={`Height (${patient.heightUnit || 'cm'})`} value={visitForm.height} onChange={handleVisitChange} />
                        <input className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" name="temperature" placeholder="Temp" value={visitForm.temperature} onChange={handleVisitChange} />
                        <input className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" name="heartRate" placeholder="HR" value={visitForm.heartRate} onChange={handleVisitChange} />
                        {showOptionalVitals ? (
                          <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
                            <input className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" name="respiratoryRate" placeholder="RR" value={visitForm.respiratoryRate} onChange={handleVisitChange} />
                            <input className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" name="oxygenSaturation" placeholder="SpO2" value={visitForm.oxygenSaturation} onChange={handleVisitChange} />
                            <input className="rounded-2xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" name="bloodPressure" placeholder="BP" value={visitForm.bloodPressure} onChange={handleVisitChange} />
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">RR, SpO2, and BP are optional and can be expanded when needed.</p>
                    </>
                  ) : null}
                </div>


              </div>
              </Grid>
            </Grid>

            <div className="flex justify-end gap-3 rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-900/70">
              <button
                type="button"
                onClick={handleOpenVisitHistory}
                className="rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button className="rounded-2xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-700" type="submit" disabled={busy}>
                {busy ? 'Saving...' : 'Save Visit'}
              </button>
            </div>
          </form>
          )}


        </div>
      ) : null}

      <VisitDetailsModal
        open={Boolean(selectedVisitDetails)}
        onClose={handleCloseVisitDetails}
        visit={selectedVisitDetails}
        heightUnit={patient?.heightUnit}
      />

      {activeTab === 'vaccines' ? (
        <div className="rounded-2xl border border-violet-200 bg-linear-to-br from-violet-50 to-white p-3 dark:border-violet-900 dark:from-slate-950 dark:to-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
                Printable child health card
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Immunization History</h3>
            </div>
            <p className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
              {vaccines.length} vaccine entr{vaccines.length === 1 ? 'y' : 'ies'} recorded
            </p>
          </div>

          <div className="mt-3 grid gap-2.5 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-violet-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/80">
              <p className="text-xs font-semibold uppercase text-slate-500">Patient's name</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">{patient.name}</p>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/80">
              <p className="text-xs font-semibold uppercase text-slate-500">Age / Sex</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatAgeDisplay(patient.age, patient.birthDate)} / {patient.sex || '—'}</p>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/80">
              <p className="text-xs font-semibold uppercase text-slate-500">Date of birth</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatDate(patient.birthDate)}</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-dashed border-violet-300 px-3 py-2 text-xs text-violet-800 dark:border-violet-900 dark:text-violet-200 print:hidden">
            Edit the date, site, and sign directly in the table. Changes auto-save after a short pause.
          </div>

          <div className="mt-3 grid gap-2 xl:grid-cols-3">
            {immunizationColumns.map((column, index) => (
              <ImmunizationTable
                items={column}
                key={`column-${index}`}
                draft={immunizationDraft}
                busy={busy}
                onCellChange={handleImmunizationChange}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <p className={`text-sm font-medium ${immunizationSaveState === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-violet-700 dark:text-violet-300'}`}>
              {immunizationSaveMessage}
            </p>
            <button
              className="rounded-2xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-700"
              type="button"
              onClick={handleSaveSheet}
              disabled={busy}
            >
              {busy ? 'Saving...' : 'Save now'}
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === 'labs' ? (
        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Labs / Files</h3>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Upload laboratory results, imaging reports, or supporting clinical files.
              </p>
            </div>

            <form className="flex w-full flex-col gap-2 sm:max-w-sm" onSubmit={handleLabUpload}>
              <input
                id="lab-document-upload"
                key={labUploadFile ? labUploadFile.name : 'empty-lab-upload'}
                className="hidden"
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(event) => setLabUploadFile(event.target.files?.[0] || null)}
              />
              <label
                htmlFor="lab-document-upload"
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {labUploadFile ? 'Change selected document' : 'Select document'}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Browse files
                </span>
              </label>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                {labUploadFile ? `Selected file: ${labUploadFile.name}` : 'No file selected yet. Tap “Select document” to choose a file.'}
              </p>
              <button
                className="rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={busy || !labUploadFile}
              >
                {busy ? 'Uploading...' : 'Upload document'}
              </button>
            </form>
          </div>

          <div className="mt-3 space-y-2">
            {labDocuments.length > 0 ? (
              labDocuments.map((document) => (
                <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800" key={document.id}>
                  <p className="font-semibold text-slate-900 dark:text-white">{document.fileName || 'Diagnostic document'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-300">Uploaded {formatDate(document.uploadedAt)}</p>
                  <a className="mt-2 inline-block font-semibold text-cyan-600" href={document.fileUrl} target="_blank" rel="noreferrer">
                    Open file
                  </a>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                No diagnostic documents uploaded yet.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
