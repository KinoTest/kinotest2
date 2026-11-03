import { IonInput, IonItem, IonList, IonTextarea } from '@ionic/react'
import type { FieldsForm } from '../lib/assignmentFields.ts'

interface Props {
  value: FieldsForm
  onChange: (next: FieldsForm) => void
}

/** Expiry date, note and amount of an assignment (all optional). */
export default function AssignmentFields({ value, onChange }: Props) {
  return (
    <IonList>
      <IonItem>
        <IonInput
          label="Caduca o (opcional)"
          labelPlacement="stacked"
          type="date"
          value={value.expiresOn}
          onIonInput={(e) => onChange({ ...value, expiresOn: String(e.detail.value ?? '') })}
        />
      </IonItem>
      <IonItem>
        <IonInput
          label="Importe cobrado, en € (opcional)"
          labelPlacement="stacked"
          inputmode="decimal"
          value={value.amount}
          onIonInput={(e) => onChange({ ...value, amount: String(e.detail.value ?? '') })}
        />
      </IonItem>
      <IonItem>
        <IonTextarea
          label="Nota (opcional)"
          labelPlacement="stacked"
          maxlength={500}
          autoGrow
          value={value.note}
          onIonInput={(e) => onChange({ ...value, note: String(e.detail.value ?? '') })}
        />
      </IonItem>
    </IonList>
  )
}
