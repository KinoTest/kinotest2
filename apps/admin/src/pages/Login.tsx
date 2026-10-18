import { IonButton, IonContent, IonInput, IonPage, IonText } from '@ionic/react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ApiError, requestLink, useSession } from '../lib/session.ts'

export default function Login() {
  const session = useSession()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/home" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await requestLink(email.trim())
      setSent(true)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Demasiados intentos. Agarda uns minutos.'
          : err instanceof ApiError && err.status === 400
            ? 'Escribe un correo válido.'
            : 'Non se puido enviar o enlace. Téntao de novo.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <IonPage>
      <IonContent className="ion-padding">
        {sent ? (
          <IonText>
            <h2>Revisa o teu correo</h2>
            <p>Se o enderezo é válido, recibirás un enlace para entrar. Caduca en 15 minutos.</p>
          </IonText>
        ) : (
          <form onSubmit={submit}>
            <IonText>
              <h2>Entrar en Kinotest</h2>
            </IonText>
            <IonInput
              type="email"
              label="Correo electrónico"
              labelPlacement="floating"
              autocomplete="email"
              value={email}
              onIonInput={(e) => setEmail(String(e.detail.value ?? ''))}
            />
            {error && (
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            )}
            <IonButton type="submit" expand="block" disabled={loading || !email}>
              Enviar enlace
            </IonButton>
          </form>
        )}
      </IonContent>
    </IonPage>
  )
}
