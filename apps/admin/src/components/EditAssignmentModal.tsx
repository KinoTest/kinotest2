import { useState } from 'react'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { fieldsFromRow, parseFields, type FieldsForm } from '../lib/assignmentFields.ts'
import { patchAssignment, type AssignmentRow } from '../lib/assignments.ts'
import AssignmentFields from './AssignmentFields.tsx'

interface Props {
  row: AssignmentRow
  onClose: () => void
  onDone: () => void
}

export default function EditAssignmentModal({ row, onClose, onDone }: Props) {
  const [form, setForm] = useState<FieldsForm>(() => fieldsFromRow(row))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const parsed = parseFields(form)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setBusy(true)
    try {
      // null clears a field, so the form is always sent whole.
      await patchAssignment(row.id, parsed.value)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
      setBusy(false)
    }
  }

  return (
    <IonModal isOpen onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>Cancelar</IonButton>
          </IonButtons>
          <IonTitle>Editar asignación</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={busy} onClick={save}>
              Gardar
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>
          {row.user.email} · {row.contentItem.title} ({row.contentItem.lang})
        </p>
        <AssignmentFields value={form} onChange={setForm} />
        {error && (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        )}
      </IonContent>
    </IonModal>
  )
}
