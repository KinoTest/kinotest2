import type { ReactElement } from 'react'
import { IonApp, IonRouterOutlet } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Navigate, Route } from 'react-router-dom'
import RequireAuth from './components/RequireAuth.tsx'
import Content from './pages/Content.tsx'
import ContentAssignments from './pages/ContentAssignments.tsx'
import Editor from './pages/Editor.tsx'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import TherapistDetail from './pages/TherapistDetail.tsx'
import Therapists from './pages/Therapists.tsx'
import Verify from './pages/Verify.tsx'

const guarded = (page: ReactElement) => <RequireAuth>{page}</RequireAuth>

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/verify" element={<Verify />} />
          <Route path="/home" element={guarded(<Home />)} />
          <Route path="/content" element={guarded(<Content />)} />
          <Route path="/content/new" element={guarded(<Editor />)} />
          <Route path="/content/:id/edit" element={guarded(<Editor />)} />
          <Route path="/content/:id/assignments" element={guarded(<ContentAssignments />)} />
          <Route path="/therapists" element={guarded(<Therapists />)} />
          <Route path="/therapists/:id" element={guarded(<TherapistDetail />)} />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  )
}
