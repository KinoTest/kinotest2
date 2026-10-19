import { IonApp, IonRouterOutlet } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Navigate, Route } from 'react-router-dom'
import RequireAuth from './components/RequireAuth.tsx'
import Content from './pages/Content.tsx'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import Verify from './pages/Verify.tsx'

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/verify" element={<Verify />} />
          <Route
            path="/home"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/content"
            element={
              <RequireAuth>
                <Content />
              </RequireAuth>
            }
          />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  )
}
