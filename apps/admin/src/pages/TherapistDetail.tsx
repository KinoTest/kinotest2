import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
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
  IonText,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react'
import AssignModal from '../components/AssignModal.tsx'
import AssignmentItem from '../components/AssignmentItem.tsx'
import EditAssignmentModal from '../components/EditAssignmentModal.tsx'
import {
  deleteAssignments,
  getUser,
  listAssignments,
  type AssignmentRow,
  type UserSummary,
} from '../lib/assignments.ts'

/** The therapies assigned to one therapist, with batch assignment of new ones. */
export default function TherapistDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const [user, setUser] = useState<UserSummary | null>(null)
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [editing, setEditing] = useState<AssignmentRow | null>(null)

  const reload = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([getUser(id), listAssignments({ userId: id })])
      setUser(u)
      setRows(r)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    }
  }, [id])

  useIonViewWillEnter(() => {
    void reload()
  })

  const remove = async (row: AssignmentRow) => {
    if (!window.confirm(`Quitar «${row.contentItem.title}» (${row.contentItem.lang}) a ${row.user.email}?`)) return
    try {
      await deleteAssignments({ userIds: [row.userId], contentItemIds: [row.contentItemId] })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    }
  }

  const done = () => {
    setAssigning(false)
    setEditing(null)
    void reload()
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/therapists" />
          </IonButtons>
          <IonTitle>{user?.email ?? 'Terapeuta'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonButton disabled={!user} onClick={() => setAssigning(true)}>
          Asignar terapias
        </IonButton>
        {error && (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        )}
        <IonList>
          {rows.map((row) => (
            <AssignmentItem
              key={row.id}
              title={row.contentItem.title}
              subtitle={row.contentItem.lang}
              row={row}
              onEdit={() => setEditing(row)}
              onRemove={() => void remove(row)}
            />
          ))}
          {rows.length === 0 && !error && (
            <IonItem>
              <IonLabel>Aínda non ten terapias asignadas.</IonLabel>
            </IonItem>
          )}
        </IonList>
      </IonContent>
      {assigning && (
        <AssignModal
          mode="therapies"
          fixedId={id}
          excludeIds={rows.map((r) => r.contentItemId)}
          onClose={() => setAssigning(false)}
          onDone={done}
        />
      )}
      {editing && <EditAssignmentModal row={editing} onClose={() => setEditing(null)} onDone={done} />}
    </IonPage>
  )
}
