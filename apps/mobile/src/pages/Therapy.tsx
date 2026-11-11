import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonToolbar,
} from '@ionic/react'
import { searchOutline } from 'ionicons/icons'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CatalogView from '../components/CatalogView.tsx'
import PageTitle from '../components/PageTitle.tsx'
import RemedyView from '../components/RemedyView.tsx'
import SearchResults from '../components/SearchResults.tsx'
import { search } from '../lib/search.ts'
import { crumbsOf, getNode, isCatalog, parsePath, therapyUrl } from '../lib/tree.ts'
import { useTherapy } from '../lib/useTherapy.ts'

/**
 * One page for the whole therapy. `?path=0.2.1` says where we are (indexes into `contents`, from the root):
 * a category shows its list, a remedy shows its detail. `&search=1` turns the page into the search of the therapy
 * (the text typed is kept while the page lives, so Back from a result finds the same results).
 * Every move is a normal navigation, and the breadcrumb starts with a way back to the list of therapies.
 */
export default function Therapy() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [state, reload] = useTherapy(id)
  const path = useMemo(() => parsePath(params.get('path')), [params])
  const searching = params.has('search')
  const [query, setQuery] = useState('')
  const searchbar = useRef<HTMLIonSearchbarElement>(null)

  const open = (next: number[]) => navigate(therapyUrl(id, next))
  const openSearch = () => navigate(therapyUrl(id, path, true))
  const closeSearch = () => navigate(therapyUrl(id, path), { replace: true })

  const results = useMemo(
    () => (state.status === 'ready' ? search(state.therapy.data, query) : []),
    [state, query],
  )

  useEffect(() => {
    if (!searching) return
    const timer = setTimeout(() => void searchbar.current?.setFocus(), 150) // after the header is on screen
    return () => clearTimeout(timer)
  }, [searching])

  const title = state.status === 'ready' ? state.therapy.title : 'Terapia'
  const toList = (
    <IonButton fill="outline" onClick={() => navigate('/therapies')}>
      Volver ás terapias
    </IonButton>
  )

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
        {toList}
      </div>
    )
  } else if (searching) {
    body = <SearchResults results={results} query={query} onOpen={open} />
  } else {
    const root = state.therapy.data
    const node = getNode(root, path)
    const ancestors = crumbsOf(root, path)
    if (!node || !ancestors) {
      body = (
        <div className="state">
          <p>Esta páxina xa non existe na terapia.</p>
          <IonButton onClick={() => open([])}>Ir ao inicio da terapia</IonButton>
          {toList}
        </div>
      )
    } else if (isCatalog(node)) {
      body = <CatalogView node={node} path={path} crumbs={ancestors} onOpen={open} />
    } else {
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
          {searching ? (
            <IonSearchbar
              ref={searchbar}
              value={query}
              debounce={150}
              placeholder="Buscar nesta terapia"
              showCancelButton="always"
              cancelButtonText="Cancelar"
              onIonInput={(e) => setQuery(e.detail.value ?? '')}
              onIonCancel={closeSearch}
            />
          ) : (
            <>
              <PageTitle kind="therapies" className="therapy-title">
                {title}
              </PageTitle>
              <IonButtons slot="end">
                <IonButton aria-label="Buscar nesta terapia" onClick={openSearch}>
                  <IonIcon slot="icon-only" icon={searchOutline} />
                </IonButton>
              </IonButtons>
            </>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent>{body}</IonContent>
    </IonPage>
  )
}
