import { IonButton, IonContent, IonPage, IonText } from '@ionic/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, verifyLink } from '../lib/session.ts'

// The button (instead of verifying on load) stops email scanners that open links from consuming the token.
export default function Verify() {
  const navigate = useNavigate()
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Remove the token from the address bar (history, Referer).
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  const enter = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await verifyLink(token)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'O enlace non é válido ou caducou. Pide un novo.'
          : 'Non se puido entrar. Téntao de novo.',
      )
      setLoading(false)
    }
  }

  return (
    <IonPage>
      <IonContent className="ion-padding">
        {token ? (
          <>
            <IonText>
              <h2>Entrar en Kinotest</h2>
            </IonText>
            {error && (
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            )}
            <IonButton expand="block" onClick={enter} disabled={loading}>
              Entrar
            </IonButton>
            {error && (
              <IonButton expand="block" fill="clear" routerLink="/login">
                Pedir un novo enlace
              </IonButton>
            )}
          </>
        ) : (
          <>
            <IonText>
              <p>Falta o enlace de acceso.</p>
            </IonText>
            <IonButton expand="block" routerLink="/login">
              Pedir un enlace
            </IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  )
}
