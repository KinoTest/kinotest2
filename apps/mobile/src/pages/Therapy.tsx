import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonSpinner, IonTitle, IonToolbar } from '@ionic/react'
import { useMemo, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CatalogView from '../components/CatalogView.tsx'
import RemedyView from '../components/RemedyView.tsx'
import { crumbsOf, getNode, isCatalog, parsePath, therapyUrl } from '../lib/tree.ts'
import { useTherapy } from '../lib/useTherapy.ts'

/**
 * One page for the whole therapy. `?path=0.2.1` says where we are (indexes into `contents`, from the root):
 * a category shows its list, a remedy shows its detail. Every move is a normal navigation, so Back returns
 * to the previous screen and a reload keeps the place.
 */
export default function Therapy() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [state, reload] = useTherapy(id)
  const path = useMemo(() => parsePath(params.get('path')), [params])
  const open = (next: number[]) => navigate(therapyUrl(id, next))

  let title = 'Terapia'
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
        <p>{state.notFound ? 'Esta terapia non está dispoñible (pode ter caducado).' : 'Non se puido cargar a terapia.'}</p>
        {!state.notFound && <IonButton onClick={reload}>Reintentar</IonButton>}
      </div>
    )
  } else {
    const root = state.therapy.data
    const node = getNode(root, path)
    const ancestors = crumbsOf(root, path)
    title = state.therapy.title
    if (!node || !ancestors) {
      body = (
        <div className="state">
          <p>Esta páxina xa non existe na terapia.</p>
          <IonButton onClick={() => open([])}>Ir ao inicio</IonButton>
        </div>
      )
    } else if (isCatalog(node)) {
      if (path.length > 0) title = node.name
      body = <CatalogView node={node} path={path} crumbs={ancestors} onOpen={open} />
    } else {
      title = node.name
      body = (
        <RemedyView
          key={path.join('.')}
          node={node}
          path={path}
          crumbs={[...ancestors, { name: node.name, path }]}
          onOpen={open}
        />
      )
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="Atrás" />
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>{body}</IonContent>
    </IonPage>
  )
}
