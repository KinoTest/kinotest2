import { useEffect, useState } from 'react'
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react'
import { getHealth } from '../lib/api.ts'

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
          <IonTitle>Kinotest</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">API status: {api}</IonContent>
    </IonPage>
  )
}
