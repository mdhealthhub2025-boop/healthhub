# Firebase EMR for a Single Doctor

A mobile-friendly Electronic Medical Record system built with React, Tailwind CSS, Firebase Authentication, Firestore, and Storage.

## Features

- Doctor email/password login
- Add, edit, delete, and search patients
- Patient profile with consultation history
- Visit notes, diagnosis, prescriptions, and file uploads
- Real-time Firestore updates
- Appointment scheduling
- Dark mode toggle
- Export patient profile using the browser print-to-PDF flow

## Project structure

- client: React frontend with Tailwind and Firebase
- server: original Node starter kept in the workspace, but not required for the Firebase version
- firestore.rules: example secure Firestore access rules
- storage.rules: example secure Storage access rules

## 1. Firebase setup

1. Create a Firebase project in the Firebase console.
2. Enable Authentication and turn on Email/Password.
3. Create a Firestore database in production or test mode.
4. Enable Firebase Storage.
5. In the web app settings, copy the Firebase config values.
6. Copy client/.env.example to client/.env and paste your values.

Example client/.env values:

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

## 2. Firestore schema

Use the following collection structure:

- doctors
  - {doctorId}
    - profile
      - email
      - displayName
    - patients
      - {patientId}
        - name: string
        - age: number
        - sex: string
        - contact: string
        - allergies: string[]
        - conditions: string[]
        - createdAt: timestamp
        - updatedAt: timestamp
        - visits
          - {visitId}
            - dateOfVisit: string
            - diagnosis: string
            - prescriptions: string
            - notes: string
            - attachmentName: string
            - attachmentUrl: string
            - attachmentPath: string
            - createdAt: timestamp
    - appointments
      - {appointmentId}
        - patientName: string
        - scheduledFor: string
        - notes: string
        - createdAt: timestamp

## 3. Security rules

### Firestore rules

See firestore.rules in the project root.

### Storage rules

See storage.rules in the project root.

Both are scoped so only the signed-in doctor can read and write their own records.

## 4. Run locally

1. Install dependencies

npm install

2. Start the app

npm run dev

3. Open the site

http://localhost:5173

If Firebase is not configured yet, the app still opens in demo mode so you can review the full UI.

## 5. Deploy

### Firebase Hosting

1. Build the app:
   npm run build
2. Install Firebase CLI globally if needed:
   npm install -g firebase-tools
3. Login:
   firebase login
4. Initialize hosting in the project root:
   firebase init hosting
5. Set the public directory to client/dist
6. Deploy:
   firebase deploy

## Notes

- Create the doctor user from the Firebase Authentication console first.
- For mobile use, the layout is optimized for phone and tablet widths.
- Attachments support images and PDF files.
