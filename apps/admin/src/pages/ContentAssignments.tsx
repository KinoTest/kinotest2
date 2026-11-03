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
import { deleteAssignments, listAssignments, type AssignmentRow } from '../lib/assignments.ts'
import { listContent, type ContentSummary } from '../lib/content.ts'

/** The therapists who have one therapy (one language) assigned, with batch assignment. */
export default function ContentAssignments() {
  const { id = '' } = useParams<{ id: string }>()
  const [item, setItem] = useState<ContentSummary | null>(null)
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [editing, setEditing] = useState<AssignmentRow | null>(null)

  const reload = useCallback(async () => {
    try {
      // The listing has no `data`, so it is a light way to get the title.
      const [items, r] = await Promise.all([listContent(), listAssignments({ contentItemId: id })])
      setItem(items.find((i) => i.id === id) ?? null)
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
    if (!window.confirm(`Quitar a terapia a ${row.user.email}?`)) return
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
            <IonBackButton defaultHref="/content" />
          </IonButtons>
          <IonTitle>{item ? `${item.title} (${item.lang})` : 'Terapeutas da terapia'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonButton disabled={!item} onClick={() => setAssigning(true)}>
          Asignar a terapeutas
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
              title={row.user.email}
              subtitle={`Asignada o ${new Date(row.createdAt).toLocaleDateString('gl-ES')}`}
              row={row}
              onEdit={() => setEditing(row)}
              onRemove={() => void remove(row)}
            />
          ))}
          {rows.length === 0 && !error && (
            <IonItem>
              <IonLabel>Non está asignada a ningún terapeuta.</IonLabel>
            </IonItem>
          )}
        </IonList>
      </IonContent>
      {assigning && (
        <AssignModal
          mode="users"
          fixedId={id}
          excludeIds={rows.map((r) => r.userId)}
          onClose={() => setAssigning(false)}
          onDone={done}
        />
      )}
      {editing && <EditAssignmentModal row={editing} onClose={() => setEditing(null)} onDone={done} />}
    </IonPage>
  )
}
