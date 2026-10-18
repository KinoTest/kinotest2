import { useEffect, useState } from 'react'
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react'
import { getHealth } from '../lib/api.ts'
import { logout } from '../lib/session.ts'

export default function Home() {
  const [api, setApi] = useState('checking...')

  useEffect(() => {
    getHealth()
      .then((h) => setApi(h.status))
      .catch(() => setApi('unreachable'))
  }, [])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Kinotest Admin</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        API status: {api}
      <IonButton onClick={logout}>Saír</IonButton>
      </IonContent>
    </IonPage>
  )
}
