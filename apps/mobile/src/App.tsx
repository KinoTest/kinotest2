import type { ReactElement } from 'react'
import { IonApp, IonRouterOutlet } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Navigate, Route } from 'react-router-dom'
import RequireAuth from './components/RequireAuth.tsx'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import Therapy from './pages/Therapy.tsx'
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
          <Route path="/therapies/:id" element={guarded(<Therapy />)} />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  )
}
