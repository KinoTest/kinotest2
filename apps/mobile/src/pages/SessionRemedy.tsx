import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonSpinner, IonToolbar } from '@ionic/react'
import { useParams } from 'react-router-dom'
import PageTitle from '../components/PageTitle.tsx'
import RemedyDetail from '../components/RemedyDetail.tsx'
import { getSession } from '../lib/sessions.ts'
import { remedyTrail, sessionUrl } from '../lib/sessionView.ts'
import { useLoad } from '../lib/useLoad.ts'

/** The full sheet of a remedy chosen in a session, as it was copied into the session. */
export default function SessionRemedy() {
  const { patientId = '', sessionId = '', index = '' } = useParams()
  const [state] = useLoad(patientId && sessionId ? `${patientId}/${sessionId}` : '', () => getSession(patientId, sessionId))
  const item = state.status === 'ready' && /^\d+$/.test(index) ? state.value.remedies[Number(index)] : undefined

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={sessionUrl(patientId, sessionId)} text="" />
          </IonButtons>
          <PageTitle kind="remedy">{item ? item.remedy.name : 'Remedio'}</PageTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {state.status === 'loading' ? (
          <div className="state">
            <IonSpinner />
          </div>
        ) : item ? (
          <>
            <p className="remedy-trail remedy-trail-head">{remedyTrail(item)}</p>
            <RemedyDetail remedy={item.remedy} />
          </>
        ) : (
          <p className="state">Non se atopou este remedio na sesión.</p>
        )}
      </IonContent>
    </IonPage>
  )
}
