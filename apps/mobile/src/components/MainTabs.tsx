import { IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/react'
import { bookOutline, peopleOutline } from 'ionicons/icons'
import { Navigate, Route } from 'react-router-dom'
import Home from '../pages/Home.tsx'
import Patient from '../pages/Patient.tsx'
import Patients from '../pages/Patients.tsx'
import SessionEditor from '../pages/SessionEditor.tsx'
import SessionRemedy from '../pages/SessionRemedy.tsx'
import SessionView from '../pages/SessionView.tsx'
import Therapy from '../pages/Therapy.tsx'

/**
 * The signed-in app: two sections, each with its own history. The bar at the bottom is always shown, and going
 * back to a section returns to the page it was left on. Ionic tells the sections apart by the start of the path,
 * so every page of a section lives under its root (/therapies/..., /patients/...).
 */
export default function MainTabs() {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/therapies" element={<Home />} />
        <Route path="/therapies/:id" element={<Therapy />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<Patient />} />
        <Route path="/patients/:patientId/sessions/new" element={<SessionEditor />} />
        <Route path="/patients/:patientId/sessions/:sessionId" element={<SessionView />} />
        <Route path="/patients/:patientId/sessions/:sessionId/edit" element={<SessionEditor />} />
        <Route path="/patients/:patientId/sessions/:sessionId/remedies/:index" element={<SessionRemedy />} />
        {/* Old address of the list of therapies (links already sent, bookmarks). */}
        <Route path="/home" element={<Navigate to="/therapies" replace />} />
        <Route path="/" element={<Navigate to="/therapies" replace />} />
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="therapies" href="/therapies">
          <IonIcon icon={bookOutline} aria-hidden="true" />
          <IonLabel>Terapias</IonLabel>
        </IonTabButton>
        <IonTabButton tab="patients" href="/patients">
          <IonIcon icon={peopleOutline} aria-hidden="true" />
          <IonLabel>Pacientes</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  )
}
