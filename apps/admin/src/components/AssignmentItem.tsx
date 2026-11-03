import { IonButton, IonItem, IonLabel, IonText } from '@ionic/react'
import { formatDate, formatEuro, isExpired } from '../lib/assignmentFields.ts'
import type { AssignmentRow } from '../lib/assignments.ts'

interface Props {
  title: string
  subtitle: string
  row: AssignmentRow
  onEdit: () => void
  onRemove: () => void
}

/** One assignment in a list: who/what, expiry, amount and note, with edit and remove. */
export default function AssignmentItem({ title, subtitle, row, onEdit, onRemove }: Props) {
  const expired = isExpired(row.expiresAt)
  return (
    <IonItem>
      <IonLabel className="ion-text-wrap">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <p>
          {row.expiresAt === null ? (
            'Sen caducidade'
          ) : expired ? (
            <IonText color="danger">Caducou o {formatDate(row.expiresAt)}</IonText>
          ) : (
            `Caduca o ${formatDate(row.expiresAt)}`
          )}
          {row.amount !== null && ` · ${formatEuro(row.amount)}`}
        </p>
        {row.note && <p>{row.note}</p>}
      </IonLabel>
      <IonButton slot="end" fill="clear" onClick={onEdit}>
        Editar
      </IonButton>
      <IonButton slot="end" fill="clear" color="danger" onClick={onRemove}>
        Quitar
      </IonButton>
    </IonItem>
  )
}
