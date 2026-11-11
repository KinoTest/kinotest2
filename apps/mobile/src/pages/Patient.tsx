import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonText,
  IonToolbar,
  useIonActionSheet,
  useIonAlert,
  useIonRouter,
  useIonToast,
} from '@ionic/react'
import { MarkdownEditor } from '@kinotest/ui'
import { add, ellipsisVertical } from 'ionicons/icons'
import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import MarkdownView from '../components/MarkdownView.tsx'
import PageTitle from '../components/PageTitle.tsx'
import { deletePatient, MAX_PATIENT_NOTES, updatePatient, type PatientDetail } from '../lib/patients.ts'
import { listSessions } from '../lib/sessions.ts'
import { formatSessionDate, newSessionUrl, sessionUrl } from '../lib/sessionView.ts'
import { useLoad, useOnReturn } from '../lib/useLoad.ts'
import { usePatient } from '../lib/usePatient.ts'

/**
 * One patient: the notes (free Markdown), shown read-only until tapped, and the sessions, newest first.
 * While editing the notes, the header holds Cancelar / Gardar instead of the back button, so the draft is not
 * lost by leaving the page.
 */
export default function Patient() {
  const { id = '' } = useParams()
  const [state, reload, setPatient] = usePatient(id)
  const [draft, setDraft] = useState<string | null>(null) // null = not editing
  const [saving, setSaving] = useState(false)
  const [presentAlert] = useIonAlert()
  const [presentToast] = useIonToast()
  const [presentActions] = useIonActionSheet()
  const router = useIonRouter()

  const toList = () => router.push('/patients', 'back')
  const fail = (message: string) => void presentToast({ message, duration: 3000, color: 'danger' })

  const save = async (patient: PatientDetail, patch: { name?: string; notes?: string }) => {
    setSaving(true)
    try {
      setPatient(await updatePatient(patient.id, patch))
      return true
    } catch {
      fail('Non se puideron gardar os cambios.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async (patient: PatientDetail) => {
    if (draft === null) return
    if (draft === patient.notes || (await save(patient, { notes: draft }))) setDraft(null)
  }

  const cancelEdit = (patient: PatientDetail) => {
    if (draft === null || draft === patient.notes) {
      setDraft(null)
      return
    }
    void presentAlert({
      header: 'Descartar os cambios?',
      message: 'Perderanse os cambios nas notas.',
      buttons: [
        { text: 'Seguir editando', role: 'cancel' },
        { text: 'Descartar', role: 'destructive', handler: () => setDraft(null) },
      ],
    })
  }

  const rename = (patient: PatientDetail) =>
    void presentAlert({
      header: 'Cambiar nome',
      inputs: [{ name: 'name', value: patient.name, attributes: { maxlength: 200, autocapitalize: 'words' } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Gardar',
          handler: (values: { name?: string }) => {
            const name = values.name?.trim()
            if (!name) return false // keep the alert open
            if (name !== patient.name) void save(patient, { name })
          },
        },
      ],
    })

  const remove = (patient: PatientDetail) =>
    void presentAlert({
      header: `Eliminar a ${patient.name}?`,
      message: 'Borraranse tamén as súas notas. Non se pode desfacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            deletePatient(patient.id).then(toList, () => fail('Non se puido eliminar o paciente.'))
          },
        },
      ],
    })

  const showActions = (patient: PatientDetail) =>
    void presentActions({
      buttons: [
        { text: 'Cambiar nome', handler: () => rename(patient) },
        { text: 'Eliminar paciente', role: 'destructive', handler: () => remove(patient) },
        { text: 'Cancelar', role: 'cancel' },
      ],
    })

  const patient = state.status === 'ready' ? state.value : null
  const tooLong = draft !== null && draft.length > MAX_PATIENT_NOTES

  let body: ReactNode
  if (state.status === 'loading') {
    body = (
      <div className="state">
        <IonSpinner />
      </div>
    )
  } else if (state.status === 'error') {
    body = (
      <div className="state">
        <p>{state.notFound ? 'Este paciente non existe ou foi eliminado.' : 'Non se puido cargar o paciente.'}</p>
        {!state.notFound && <IonButton onClick={() => reload()}>Reintentar</IonButton>}
        <IonButton fill="outline" onClick={toList}>
          Volver aos pacientes
        </IonButton>
      </div>
    )
  } else if (draft !== null) {
    body = (
      <div className="patient-notes-edit">
        <MarkdownEditor value={draft} onChange={setDraft} />
        {tooLong && (
          <IonText color="danger">
            <p>
              As notas superan o máximo de {MAX_PATIENT_NOTES.toLocaleString()} caracteres ({draft.length.toLocaleString()}).
            </p>
          </IonText>
        )}
      </div>
    )
  } else {
    const { notes } = state.value
    body = (
      <>
      <section className="patient-notes">
        {notes.trim() ? (
          <MarkdownView text={notes} onTap={() => setDraft(notes)} tapLabel="Editar as notas" />
        ) : (
          <div className="section-body">
            <IonButton fill="outline" size="small" onClick={() => setDraft('')}>
              Engadir notas
            </IonButton>
          </div>
        )}
      </section>
      <PatientSessions patientId={state.value.id} />
      </>
    )
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {patient && draft !== null ? (
            <>
              <IonButtons slot="start">
                <IonButton disabled={saving} onClick={() => cancelEdit(patient)}>
                  Cancelar
                </IonButton>
              </IonButtons>
              <PageTitle kind="patient">Notas</PageTitle>
              <IonButtons slot="end">
                <IonButton strong disabled={saving || tooLong} onClick={() => void saveNotes(patient)}>
                  {saving ? <IonSpinner name="dots" /> : 'Gardar'}
                </IonButton>
              </IonButtons>
            </>
          ) : (
            <>
              <IonButtons slot="start">
                <IonBackButton defaultHref="/patients" text="" />
              </IonButtons>
              <PageTitle kind="patient">{patient ? patient.name : 'Paciente'}</PageTitle>
              {patient && (
                <IonButtons slot="end">
                  <IonButton aria-label="Accións do paciente" onClick={() => showActions(patient)}>
                    <IonIcon slot="icon-only" icon={ellipsisVertical} />
                  </IonButton>
                </IonButtons>
              )}
            </>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {body}
        {patient && draft === null && (
          <IonFab slot="fixed" vertical="bottom" horizontal="end">
            <IonFabButton aria-label="Nova sesión" routerLink={newSessionUrl(patient.id)}>
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        )}
      </IonContent>
    </IonPage>
  )
}

/** The patient's sessions, newest first; each one shows its date and the start of its notes. */
function PatientSessions({ patientId }: { patientId: string }) {
  const [state, reload] = useLoad(patientId, () => listSessions(patientId))
  useOnReturn(() => reload(true)) // a session may have been created, edited or deleted

  return (
    <section>
      {state.status === 'loading' && (
        <div className="state">
          <IonSpinner />
        </div>
      )}
      {state.status === 'error' && (
        <div className="state">
          <p>Non se puideron cargar as sesións.</p>
          <IonButton onClick={() => reload()}>Reintentar</IonButton>
        </div>
      )}
      {state.status === 'ready' && state.value.length === 0 && (
        <p className="section-body muted">Aínda non hai sesións con este paciente.</p>
      )}
      {state.status === 'ready' && state.value.length > 0 && (
        <IonList lines="full" className="fab-space">
          {state.value.map((s) => (
            <IonItem key={s.id} routerLink={sessionUrl(patientId, s.id)} detail>
              <IonLabel>
                <h2>{formatSessionDate(s.date)}</h2>
                {s.notesPreview && <p className="session-preview">{s.notesPreview}</p>}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      )}
    </section>
  )
}
