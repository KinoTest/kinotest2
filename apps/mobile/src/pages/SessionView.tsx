import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonToolbar,
  useIonAlert,
  useIonRouter,
  useIonToast,
} from '@ionic/react'
import { trashOutline } from 'ionicons/icons'
import { useParams } from 'react-router-dom'
import MarkdownView from '../components/MarkdownView.tsx'
import PageTitle from '../components/PageTitle.tsx'
import SessionRemedyList from '../components/SessionRemedyList.tsx'
import { patientUrl } from '../lib/patientList.ts'
import { deleteSession, getSession } from '../lib/sessions.ts'
import { editSessionUrl, formatSessionDate, sessionRemedyUrl } from '../lib/sessionView.ts'
import { useLoad, useOnReturn } from '../lib/useLoad.ts'

/** A past session: its date, notes and the remedies chosen (tap one to see its sheet). */
export default function SessionView() {
  const { patientId = '', sessionId = '' } = useParams()
  const [state, reload] = useLoad(patientId && sessionId ? `${patientId}/${sessionId}` : '', () =>
    getSession(patientId, sessionId),
  )
  const router = useIonRouter()
  const [presentAlert] = useIonAlert()
  const [presentToast] = useIonToast()

  useOnReturn(() => reload(true)) // after editing it

  const toPatient = () => router.push(patientUrl(patientId), 'back')

  const remove = () =>
    void presentAlert({
      header: 'Eliminar esta sesión?',
      message: 'Borraranse as súas notas e os remedios escollidos. Non se pode desfacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            deleteSession(patientId, sessionId).then(
              () => (router.canGoBack() ? router.goBack() : router.push(patientUrl(patientId), 'back', 'replace')),
              () => void presentToast({ message: 'Non se puido eliminar a sesión.', duration: 3000, color: 'danger' }),
            )
          },
        },
      ],
    })

  let body
  if (state.status === 'loading') {
    body = (
      <div className="state">
        <IonSpinner />
      </div>
    )
  } else if (state.status === 'error') {
    body = (
      <div className="state">
        <p>{state.notFound ? 'Esta sesión non existe ou foi eliminada.' : 'Non se puido cargar a sesión.'}</p>
        {!state.notFound && <IonButton onClick={() => reload()}>Reintentar</IonButton>}
        <IonButton fill="outline" onClick={toPatient}>
          Volver ao paciente
        </IonButton>
      </div>
    )
  } else {
    const s = state.value
    const remedies = s.remedies.map((r) => ({ ...r, name: r.remedy.name }))
    body = (
      <>
        <h1 className="session-date">{formatSessionDate(s.date)}</h1>
        {s.notes.trim() && (
          <section>
            <MarkdownView
              text={s.notes}
              onTap={() => router.push(editSessionUrl(patientId, s.id, true))}
              tapLabel="Editar as notas"
            />
          </section>
        )}
        <section>
          {remedies.length === 0 ? (
            <p className="section-body muted">Non se escolleron remedios nesta sesión.</p>
          ) : (
            <SessionRemedyList items={remedies} onOpen={(i) => router.push(sessionRemedyUrl(patientId, s.id, i))} />
          )}
        </section>
        <div className="fab-space" />
      </>
    )
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={patientUrl(patientId)} text="" />
          </IonButtons>
          <PageTitle kind="session">Sesión</PageTitle>
          {state.status === 'ready' && (
            <IonButtons slot="end">
              <IonButton strong onClick={() => router.push(editSessionUrl(patientId, sessionId))}>
                Editar
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {body}
        {state.status === 'ready' && (
          <IonFab slot="fixed" vertical="bottom" horizontal="end">
            <IonFabButton color="medium" aria-label="Eliminar sesión" onClick={remove}>
              <IonIcon icon={trashOutline} />
            </IonFabButton>
          </IonFab>
        )}
      </IonContent>
    </IonPage>
  )
}
