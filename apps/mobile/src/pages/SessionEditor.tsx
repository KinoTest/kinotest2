import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonText,
  IonToolbar,
  useIonAlert,
  useIonRouter,
  useIonToast,
} from '@ionic/react'
import { MarkdownEditor } from '@kinotest/ui'
import { MAX_SESSION_NOTES, type Catalog } from '@kinotest/shared'
import { arrowBack } from 'ionicons/icons'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import MarkdownView from '../components/MarkdownView.tsx'
import PageTitle from '../components/PageTitle.tsx'
import SelectCatalogView from '../components/SelectCatalogView.tsx'
import { patientUrl } from '../lib/patientList.ts'
import { ApiError } from '../lib/session.ts'
import { createSession, getSession, updateSession } from '../lib/sessions.ts'
import {
  countSelectedUnder,
  formatSessionDate,
  placeKey,
  remedyKey,
  sessionUrl,
  todayIso,
  toRef,
  type ListedRemedy,
} from '../lib/sessionView.ts'
import { getTherapy, listTherapies, type TherapyDetail } from '../lib/therapies.ts'
import { crumbsOf, getNode, isCatalog } from '../lib/tree.ts'
import { useLoad } from '../lib/useLoad.ts'

type Draft = { id?: string; date: string; notes: string; remedies: ListedRemedy[] }

/** /patients/:patientId/sessions/new and /patients/:patientId/sessions/:sessionId/edit */
export default function SessionEditorPage() {
  const { patientId = '', sessionId = '' } = useParams()
  const [params] = useSearchParams()
  const [state, reload] = useLoad(sessionId ? `${patientId}/${sessionId}` : '', () => getSession(patientId, sessionId))

  if (!sessionId) {
    return <SessionEditor key="new" patientId={patientId} initial={{ date: todayIso(), notes: '', remedies: [] }} />
  }
  if (state.status === 'ready') {
    const s = state.value
    const remedies = s.remedies.map((r) => ({ ...r, name: r.remedy.name }))
    return (
      <SessionEditor
        key={s.id}
        patientId={patientId}
        initial={{ id: s.id, date: s.date, notes: s.notes, remedies }}
        editNotes={params.has('notes')}
      />
    )
  }
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <PageTitle kind="session">Editar sesión</PageTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="state">
          {state.status === 'loading' ? (
            <IonSpinner />
          ) : (
            <>
              <p>{state.notFound ? 'Esta sesión non existe ou foi eliminada.' : 'Non se puido cargar a sesión.'}</p>
              {!state.notFound && <IonButton onClick={() => reload()}>Reintentar</IonButton>}
              <IonButton fill="outline" routerLink={patientUrl(patientId)} routerDirection="back">
                Volver ao paciente
              </IonButton>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

/** Where we are while choosing remedies: a therapy and a category in it (empty path = its root). */
type Place = { therapyId: string; path: number[] }

/**
 * The session being written: its notes, the remedies chosen so far, and the therapies to choose them from.
 * Browsing a therapy stays inside this page (not in the address), so the draft lives as long as the page;
 * the arrow in the header and the device's back button go up one level. The visited categories always start empty.
 */
function SessionEditor({ patientId, initial, editNotes = false }: { patientId: string; initial: Draft; editNotes?: boolean }) {
  const router = useIonRouter()
  const [presentAlert] = useIonAlert()
  const [presentToast] = useIonToast()
  const content = useRef<HTMLIonContentElement>(null)

  const [notes, setNotes] = useState(initial.notes)
  const [editingNotes, setEditingNotes] = useState(editNotes)
  const [selected, setSelected] = useState(() => new Map(initial.remedies.map((r) => [remedyKey(r), r])))
  const [visited, setVisited] = useState<ReadonlySet<string>>(new Set())
  const [place, setPlace] = useState<Place | null>(null)
  const [saving, setSaving] = useState(false)

  const [therapies, reloadTherapies] = useLoad('therapies', listTherapies)
  // Each therapy document is fetched once per page (they can weigh hundreds of KB).
  const docs = useRef(new Map<string, Promise<TherapyDetail>>())
  const loadDoc = (id: string) => {
    let doc = docs.current.get(id)
    if (!doc) {
      doc = getTherapy(id)
      doc.catch(() => docs.current.delete(id))
      docs.current.set(id, doc)
    }
    return doc
  }
  const [therapy, reloadTherapy] = useLoad(place?.therapyId ?? '', () => loadDoc(place?.therapyId ?? ''))

  const keysOf = (m: Map<string, unknown>) => [...m.keys()].sort().join(',')
  const [initialKeys] = useState(() => keysOf(selected))
  const dirty = notes !== initial.notes || keysOf(selected) !== initialKeys
  const tooLong = notes.length > MAX_SESSION_NOTES
  const isNew = !initial.id

  const go = useCallback((next: Place | null) => {
    if (next) setVisited((v) => new Set(v).add(placeKey(next.therapyId, next.path)))
    setPlace(next)
    void content.current?.scrollToTop(0)
  }, [])

  const up = useCallback(() => {
    if (!place) return
    go(place.path.length > 0 ? { therapyId: place.therapyId, path: place.path.slice(0, -1) } : null)
  }, [place, go])

  // Back to where the editor was opened from: the patient (new) or the session (edit).
  const leave = () => {
    if (router.canGoBack()) router.goBack()
    else router.push(initial.id ? sessionUrl(patientId, initial.id) : patientUrl(patientId), 'back', 'replace')
  }

  const cancel = () => {
    if (!dirty) return leave()
    void presentAlert({
      header: 'Descartar os cambios?',
      message: isNew ? 'Non se gardará esta sesión.' : 'Perderanse os cambios nesta sesión.',
      buttons: [
        { text: 'Seguir editando', role: 'cancel' },
        { text: 'Descartar', role: 'destructive', handler: leave },
      ],
    })
  }

  // The device's back button goes up one level while browsing, and asks before losing a draft.
  const cancelRef = useRef(cancel)
  useEffect(() => {
    cancelRef.current = cancel
  })
  useEffect(() => {
    if (!place && !dirty) return
    const onBack = (e: Event) =>
      (e as CustomEvent<{ register: (priority: number, handler: () => void) => void }>).detail.register(100, () =>
        place ? up() : cancelRef.current(),
      )
    document.addEventListener('ionBackButton', onBack)
    return () => document.removeEventListener('ionBackButton', onBack)
  }, [place, dirty, up])

  const save = async () => {
    setSaving(true)
    const remedies = [...selected.values()].map(toRef)
    try {
      if (initial.id) {
        await updateSession(patientId, initial.id, { notes, remedies })
        leave()
      } else {
        const created = await createSession(patientId, { date: initial.date, notes, remedies })
        router.push(sessionUrl(patientId, created.id), 'forward', 'replace')
      }
    } catch (err) {
      const message =
        err instanceof ApiError && (err.status === 409 || err.status === 422) ? err.message : 'Non se puido gardar a sesión.'
      void presentToast({ message, duration: 4000, color: 'danger' })
      setSaving(false)
    }
  }

  const toggle = (doc: TherapyDetail, path: number[], name: string) => {
    const key = remedyKey({ contentItemId: doc.id, path })
    setSelected((s) => {
      const next = new Map(s)
      if (next.get(key)?.name === name) next.delete(key)
      else {
        const trail = (crumbsOf(doc.data, path) ?? []).slice(1).map((c) => c.name)
        next.set(key, { contentItemId: doc.id, path, name, therapyTitle: doc.title, trail })
      }
      return next
    })
  }

  const selectedList = [...selected.values()]
  const backToSession = { label: 'Sesión', onSelect: () => go(null) }

  let body: ReactNode
  if (!place) {
    body = (
      <>
        <h1 className="session-date">{formatSessionDate(initial.date)}</h1>

        <section>
          <div className="section-head">
            <h2>Notas</h2>
            {editingNotes && (
              <IonButton fill="clear" size="small" onClick={() => setEditingNotes(false)}>
                Feito
              </IonButton>
            )}
          </div>
          {editingNotes ? (
            <div className="notes-editor">
              <MarkdownEditor value={notes} onChange={setNotes} />
              {tooLong && (
                <IonText color="danger">
                  <p>As notas superan o máximo de {MAX_SESSION_NOTES.toLocaleString()} caracteres.</p>
                </IonText>
              )}
            </div>
          ) : notes.trim() ? (
            <MarkdownView text={notes} onTap={() => setEditingNotes(true)} tapLabel="Editar as notas" />
          ) : (
            <div className="section-body">
              <IonButton fill="outline" size="small" onClick={() => setEditingNotes(true)}>
                Engadir notas
              </IonButton>
            </div>
          )}
        </section>

        <section>
          <div className="section-head">
            <h2>Terapias</h2>
          </div>
          {therapies.status === 'loading' && (
            <div className="state">
              <IonSpinner />
            </div>
          )}
          {therapies.status === 'error' && (
            <div className="state">
              <p>Non se puideron cargar as terapias.</p>
              <IonButton onClick={() => reloadTherapies()}>Reintentar</IonButton>
            </div>
          )}
          {therapies.status === 'ready' && therapies.value.length === 0 && (
            <p className="state">Non tes terapias asignadas.</p>
          )}
          {therapies.status === 'ready' && therapies.value.length > 0 && (
            <IonList lines="full">
              {therapies.value.map((t) => {
                const count = countSelectedUnder(selectedList, t.id, [])
                return (
                  <IonItem
                    key={t.id}
                    button
                    detail
                    className={visited.has(placeKey(t.id, [])) ? 'visited' : undefined}
                    onClick={() => go({ therapyId: t.id, path: [] })}
                  >
                    <IonLabel className="ion-text-wrap">
                      <h2>{t.title}</h2>
                    </IonLabel>
                    {count > 0 && <IonBadge slot="end">{count}</IonBadge>}
                  </IonItem>
                )
              })}
            </IonList>
          )}
        </section>
      </>
    )
  } else if (therapy.status === 'loading') {
    body = (
      <div className="state">
        <IonSpinner />
      </div>
    )
  } else if (therapy.status === 'error') {
    body = (
      <div className="state">
        <p>{therapy.notFound ? 'Esta terapia xa non está dispoñible.' : 'Non se puido cargar a terapia.'}</p>
        {!therapy.notFound && <IonButton onClick={() => reloadTherapy()}>Reintentar</IonButton>}
        <IonButton fill="outline" onClick={() => go(null)}>
          Volver á sesión
        </IonButton>
      </div>
    )
  } else {
    const doc = therapy.value
    const root: Catalog = doc.data
    const node = getNode(root, place.path)
    const crumbs = crumbsOf(root, place.path)
    if (!node || !isCatalog(node) || !crumbs) {
      body = (
        <div className="state">
          <p>Esta categoría xa non existe na terapia.</p>
          <IonButton onClick={() => go(null)}>Volver á sesión</IonButton>
        </div>
      )
    } else {
      const at = (path: number[]) => ({ contentItemId: doc.id, path })
      body = (
        <SelectCatalogView
          key={place.path.join('.')}
          node={node}
          path={place.path}
          crumbs={crumbs}
          root={backToSession}
          onOpen={(path) => go({ therapyId: doc.id, path })}
          onToggle={(path, name) => toggle(doc, path, name)}
          isSelected={(path, name) => selected.get(remedyKey(at(path)))?.name === name}
          isVisited={(path) => visited.has(placeKey(doc.id, path))}
          countSelected={(path) => countSelectedUnder(selectedList, doc.id, path)}
        />
      )
    }
  }

  const title = place ? (therapy.status === 'ready' ? therapy.value.title : 'Terapia') : isNew ? 'Nova sesión' : 'Editar sesión'

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            {place ? (
              <IonButton aria-label="Subir" onClick={up}>
                <IonIcon slot="icon-only" icon={arrowBack} />
              </IonButton>
            ) : (
              <IonButton disabled={saving} onClick={cancel}>
                Cancelar
              </IonButton>
            )}
          </IonButtons>
          <PageTitle kind={place ? 'remedy' : 'session'}>{title}</PageTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={saving || tooLong} onClick={() => void save()}>
              {saving ? <IonSpinner name="dots" /> : 'Gardar'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
        {place && selectedList.length > 0 && (
          <IonToolbar className="selection-bar">
            <p>
              {selectedList.length === 1 ? '1 remedio seleccionado' : `${selectedList.length} remedios seleccionados`}
            </p>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent ref={content}>{body}</IonContent>
    </IonPage>
  )
}
