import { IonApp, IonRouterOutlet } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route } from 'react-router-dom'
import DeepLinks from './components/DeepLinks.tsx'
import MainTabs from './components/MainTabs.tsx'
import RequireAuth from './components/RequireAuth.tsx'
import Login from './pages/Login.tsx'
import Verify from './pages/Verify.tsx'

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <DeepLinks />
        <IonRouterOutlet>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/verify" element={<Verify />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <MainTabs />
              </RequireAuth>
            }
          />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  )
}
