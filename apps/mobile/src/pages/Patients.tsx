import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSpinner,
  IonToolbar,
  useIonAlert,
  useIonRouter,
  useIonToast,
  useIonViewWillEnter,
} from '@ionic/react'
import { add } from 'ionicons/icons'
import { useCallback, useMemo, useState } from 'react'
import PageTitle from '../components/PageTitle.tsx'
import { alertTitleIcon } from '../lib/titleIcons.ts'
import { filterPatients, patientUrl } from '../lib/patientList.ts'
import { createPatient, listPatients, type PatientSummary } from '../lib/patients.ts'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: PatientSummary[] }

export default function Patients() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [query, setQuery] = useState('')
  const [presentAlert] = useIonAlert()
  const [presentToast] = useIonToast()
  const router = useIonRouter()

  const load = useCallback(async () => {
    try {
      setState({ status: 'ready', items: await listPatients() })
    } catch {
      // Keep a list already on screen: a failed background refresh should not hide it.
      setState((s) => (s.status === 'ready' ? s : { status: 'error' }))
    }
  }, [])

  // Also on coming back from a patient: the name may have changed, or the patient been deleted.
  useIonViewWillEnter(() => {
    void load()
  }, [load])

  const create = async (name: string) => {
    try {
      const patient = await createPatient(name)
      setState((s) => (s.status === 'ready' ? { ...s, items: [...s.items, patient] } : s))
      router.push(patientUrl(patient.id))
    } catch {
      void presentToast({ message: 'Non se puido crear o paciente.', duration: 3000, color: 'danger' })
    }
  }

  const askName = () =>
    void presentAlert({
      ...alertTitleIcon('patient'),
      header: 'Novo paciente',
      inputs: [
        {
          name: 'name',
          placeholder: 'Nome',
          attributes: { maxlength: 200, autocapitalize: 'words', enterkeyhint: 'done' },
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: (values: { name?: string }) => {
            const name = values.name?.trim()
            if (!name) return false // keep the alert open
            void create(name)
          },
        },
      ],
    })

  const shown = useMemo(() => (state.status === 'ready' ? filterPatients(state.items, query) : []), [state, query])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <PageTitle kind="patient">Os meus pacientes</PageTitle>
        </IonToolbar>
        {state.status === 'ready' && state.items.length > 0 && (
          <IonToolbar>
            <IonSearchbar
              value={query}
              debounce={100}
              placeholder="Buscar paciente"
              onIonInput={(e) => setQuery(e.detail.value ?? '')}
            />
          </IonToolbar>
        )}
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
            <p>Non se puideron cargar os pacientes.</p>
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
        {state.status === 'ready' && state.items.length === 0 && (
          <div className="state">
            <p>Aínda non tes pacientes.</p>
            <IonButton onClick={askName}>Engadir paciente</IonButton>
          </div>
        )}
        {state.status === 'ready' && state.items.length > 0 && shown.length === 0 && (
          <p className="state">Ningún paciente coincide coa busca.</p>
        )}
        {shown.length > 0 && (
          <IonList lines="full" className="fab-space">
            {shown.map((p) => (
              <IonItem key={p.id} routerLink={patientUrl(p.id)} detail>
                <IonLabel className="ion-text-wrap">{p.name}</IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}

        {state.status === 'ready' && (
          <IonFab slot="fixed" vertical="bottom" horizontal="end">
            <IonFabButton aria-label="Engadir paciente" onClick={askName}>
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        )}
      </IonContent>
    </IonPage>
  )
}
