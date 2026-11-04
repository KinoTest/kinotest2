import { useCallback, useRef, useState } from 'react'
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react'
import AssignModal from '../components/AssignModal.tsx'
import { listUsers, type UserSummary } from '../lib/assignments.ts'

export default function Therapists() {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const search = useRef('')

  const load = useCallback(async () => {
    try {
      setUsers(await listUsers(search.current))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    }
  }, [])

  // Also when coming back from a therapist: the counts may have changed.
  useIonViewWillEnter(() => {
    void load()
  })

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Terapeutas</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            debounce={300}
            placeholder="Buscar por email"
            onIonInput={(e) => {
              search.current = e.detail.value ?? ''
              void load()
            }}
          />
          <IonButtons slot="end">
            <IonButton onClick={() => setInviting(true)}>Novos terapeutas</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {error && (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        )}
        <IonList>
          {users.map((u) => (
            <IonItem key={u.id} button detail routerLink={`/therapists/${u.id}`}>
              <IonLabel className="ion-text-wrap">
                <h2>{u.email}</h2>
                <p>
                  {u.assignmentCount} terapia(s) asignada(s){u.role === 'owner' ? ' · propietario' : ''}
                  {u.confirmedAt ? '' : ' · sen confirmar'}
                </p>
              </IonLabel>
            </IonItem>
          ))}
          {users.length === 0 && (
            <IonItem>
              <IonLabel className="ion-text-wrap">
                Non hai terapeutas. Aparecen aquí cando entran por primeira vez co seu enlace.
              </IonLabel>
            </IonItem>
          )}
        </IonList>
      </IonContent>
      {inviting && (
        <AssignModal
          mode="emails"
          fixedId=""
          excludeIds={[]}
          onClose={() => setInviting(false)}
          onDone={() => {
            setInviting(false)
            void load()
          }}
        />
      )}
    </IonPage>
  )
}
