import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react'
import { arrowBack } from 'ionicons/icons'
import { useParams } from 'react-router-dom'
import { contentDocumentSchema } from '@kinotest/shared'
import RemedyPanel from '../components/RemedyPanel.tsx'
import TherapyPanel from '../components/TherapyPanel.tsx'
import { THERAPY } from '../editor/state.ts'
import { cmdReplaceAll, emptyDocument, fromDocument, toDocument, type EditorDoc } from '../editor/tree.ts'
import { useEditorStore } from '../editor/useEditorStore.ts'
import { createContent, deleteContent, getContent, replaceContent } from '../lib/content.ts'
import { readContentFile } from '../lib/importFile.ts'
import { useMediaQuery } from '../lib/hooks.ts'
import './Editor.css'

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Erro')

/**
 * Loads the therapy (or starts an empty one) and hands it to the editor.
 *
 * The `IonPage` must stay the same element from the first render on: if it were swapped when the data
 * arrives, Ionic's router would never mark the new one as visible and the page would stay blank.
 */
export default function Editor() {
  const { id } = useParams<{ id: string }>()
  const [fresh] = useState(emptyDocument)
  const [loaded, setLoaded] = useState<{ id: string; doc: EditorDoc } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoadError(null)
    getContent(id)
      .then((row) => {
        const parsed = contentDocumentSchema.safeParse(row.data)
        if (!parsed.success) throw new Error('O contido gardado non ten un formato válido.')
        if (!cancelled) setLoaded({ id, doc: fromDocument(parsed.data) })
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorText(err))
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const ready = id ? (loaded?.id === id ? loaded.doc : null) : fresh

  return (
    <IonPage>
      {ready ? (
        <EditorView key={id ?? 'new'} initial={ready} serverId={id ?? null} />
      ) : (
        <>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton routerLink="/content" routerDirection="back">
                  <IonIcon slot="start" icon={arrowBack} />
                  Contidos
                </IonButton>
              </IonButtons>
              <IonTitle>Terapia</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {loadError ? (
              <IonText color="danger">
                <p>{loadError}</p>
              </IonText>
            ) : (
              <p>Cargando…</p>
            )}
          </IonContent>
        </>
      )}
    </IonPage>
  )
}

function EditorView({ initial, serverId }: { initial: EditorDoc; serverId: string | null }) {
  const store = useEditorStore(initial)
  const { state } = store
  const router = useIonRouter()
  const narrow = useMediaQuery('(max-width: 820px)')
  const [pane, setPane] = useState<'therapy' | 'remedy'>('therapy')
  const [savedRevision, setSavedRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = state.revision !== savedRevision

  const save = useCallback(async () => {
    const parsed = contentDocumentSchema.safeParse(toDocument(state.doc))
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      setError(`Non se pode gardar (${issue?.path.map(String).join('.') || 'terapia'}): ${issue?.message}`)
      return
    }
    const revision = state.revision
    setBusy(true)
    setError(null)
    try {
      if (serverId) {
        await replaceContent(serverId, parsed.data)
        setSavedRevision(revision)
      } else {
        const created = await createContent(parsed.data)
        setSavedRevision(revision)
        // From now on it is an existing therapy: reopen it under its own address.
        router.push(`/content/${created.id}/edit`, 'none', 'replace')
      }
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }, [state.doc, state.revision, serverId, router])

  // Ctrl/Cmd+S saves; the listener always calls the latest `save`.
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Reloading or closing the tab with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const leave = () => {
    if (router.canGoBack()) router.goBack()
    else router.push('/content', 'back')
  }

  const back = () => {
    if (dirty && !window.confirm('Hai cambios sen gardar. Saír igualmente?')) return
    leave()
  }

  const title = state.doc.root.name || 'Terapia nova'

  const remove = async () => {
    if (!serverId) return
    if (!window.confirm(`Borrar «${title}»? Isto non se pode desfacer.`)) return
    setBusy(true)
    setError(null)
    try {
      await deleteContent(serverId)
      setSavedRevision(state.revision) // nothing left to lose: do not ask on the way out
      leave()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  // Replaces the content of the editor with a JSON file. Nothing is saved until "Gardar", and Desfacer brings it back.
  const fileInput = useRef<HTMLInputElement>(null)
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be picked again
    if (!file) return
    setError(null)
    const result = await readContentFile(file)
    if ('error' in result) setError(result.error)
    else store.exec(THERAPY, cmdReplaceAll(state.doc, fromDocument(result.doc)))
  }

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={back}>
              <IonIcon slot="start" icon={arrowBack} />
              Contidos
            </IonButton>
          </IonButtons>
          <IonTitle>
            {title}
            {dirty ? ' •' : ''}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              disabled={busy}
              title="Substituír o contido desta terapia polo dun ficheiro JSON. Non se garda ata premer Gardar e pódese desfacer."
              onClick={() => fileInput.current?.click()}
            >
              Substituír
            </IonButton>
            {serverId && (
              <IonButton fill="clear" color="danger" disabled={busy} onClick={() => void remove()}>
                Borrar
              </IonButton>
            )}
            <IonButton fill="solid" disabled={busy || !dirty} onClick={() => void save()}>
              Gardar
            </IonButton>
          </IonButtons>
        </IonToolbar>
        {narrow && (
          <IonToolbar>
            <IonSegment value={pane} onIonChange={(e) => setPane(e.detail.value === 'remedy' ? 'remedy' : 'therapy')}>
              <IonSegmentButton value="therapy">
                <IonLabel>Terapia</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="remedy">
                <IonLabel>Remedio</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonToolbar>
        )}
      </IonHeader>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onFile} />
      <IonContent scrollY={false}>
        {error && (
          <div className="editor-error" role="alert">
            {error}
          </div>
        )}
        <div className={`editor-grid${narrow ? ' is-narrow' : ''}${error ? ' has-error' : ''}`}>
          <div className={narrow && pane !== 'therapy' ? 'is-hidden' : 'pane'}>
            <TherapyPanel store={store} />
          </div>
          <div className={narrow && pane !== 'remedy' ? 'is-hidden' : 'pane'}>
            <RemedyPanel store={store} />
          </div>
        </div>
      </IonContent>
    </>
  )
}
