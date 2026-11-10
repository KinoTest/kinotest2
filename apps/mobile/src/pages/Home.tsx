import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useCallback, useEffect, useState } from 'react'
import { logout } from '../lib/session.ts'
import { listTherapies, type TherapySummary } from '../lib/therapies.ts'
import { therapyUrl } from '../lib/tree.ts'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: TherapySummary[] }

export default function Home() {
  const [state, setState] = useState<State>({ status: 'loading' })

  const load = useCallback(async () => {
    try {
      setState({ status: 'ready', items: await listTherapies() })
    } catch {
      setState({ status: 'error' })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>As miñas terapias</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => void logout()}>Saír</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) => {
            void load().finally(() => e.detail.complete())
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        {state.status === 'loading' && (
          <div className="state">
            <IonSpinner />
          </div>
        )}
        {state.status === 'error' && (
          <div className="state">
            <p>Non se puideron cargar as terapias.</p>
            <IonButton
              onClick={() => {
                setState({ status: 'loading' })
                void load()
              }}
            >
              Reintentar
            </IonButton>
          </div>
        )}
        {state.status === 'ready' && state.items.length === 0 && <p className="state">Aínda non tes terapias asignadas.</p>}
        {state.status === 'ready' && state.items.length > 0 && (
          <IonList lines="full">
            {state.items.map((t) => (
              <IonItem key={t.id} routerLink={therapyUrl(t.id)} detail>
                <IonLabel className="ion-text-wrap">
                  <h2>{t.title}</h2>
                  {t.expiresAt && <p>Caduca o {new Date(t.expiresAt).toLocaleDateString()}</p>}
                </IonLabel>
                <IonNote slot="end">{t.lang}</IonNote>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  )
}
