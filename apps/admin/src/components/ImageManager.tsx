import { useRef, useState } from 'react'
import { NO_HISTORY } from '../editor/state.ts'
import { cmdSetImages, type RemedyNode } from '../editor/tree.ts'
import type { EditorStore } from '../editor/useEditorStore.ts'
import { uploadImage } from '../lib/images.ts'

// Public base URL of the image bucket (see DECISIONS.md). Without it no thumbnails can be shown.
// Read on each render (not at import time) so tests can override it.
const mediaUrl = (): string | undefined => (import.meta.env.VITE_MEDIA_URL as string | undefined)?.replace(/\/$/, '') || undefined

// Same limit as `remedySchema` in packages/shared/src/schemas.ts.
const MAX_IMAGES = 20

interface Props {
  store: EditorStore
  remedy: RemedyNode
  contentId: string
}

/** Add, replace, reorder and remove the images of a remedy. Images have no undo (decided). */
export default function ImageManager({ store, remedy, contentId }: Props) {
  const { state, exec } = store
  const images = remedy.images
  const MEDIA_URL = mediaUrl()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const addInput = useRef<HTMLInputElement>(null)
  const replaceInput = useRef<HTMLInputElement>(null)
  const replaceIndex = useRef(0)

  // The controls are disabled while uploading, so `images` cannot change under the running task.
  const setImages = (next: string[]) => exec(NO_HISTORY, cmdSetImages(state.doc, remedy.id, next))

  const run = async (task: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await task()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao subir a imaxe.')
    } finally {
      setBusy(false)
    }
  }

  const onAdd = (files: FileList | null) => {
    const list = Array.from(files ?? []).slice(0, MAX_IMAGES - images.length)
    if (list.length === 0) return
    void run(async () => {
      const keys: string[] = []
      let failure: unknown
      for (const file of list) {
        try {
          keys.push(await uploadImage(contentId, file))
        } catch (e) {
          failure = e
          break
        }
      }
      if (keys.length > 0) setImages([...new Set([...images, ...keys])])
      if (failure) throw failure
    })
  }

  const onReplace = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const index = replaceIndex.current
    void run(async () => {
      const key = await uploadImage(contentId, file)
      const next = images.map((k, i) => (i === index ? key : k))
      setImages(next.filter((k, i) => next.indexOf(k) === i))
    })
  }

  const move = (index: number, delta: -1 | 1) => {
    const next = [...images]
    const [item] = next.splice(index, 1)
    if (item === undefined) return
    next.splice(index + delta, 0, item)
    setImages(next)
  }

  const remove = (index: number) => setImages(images.filter((_, i) => i !== index))

  return (
    <div className="field">
      <span>
        Imaxes ({images.length}/{MAX_IMAGES})
      </span>
      {images.length > 0 && !MEDIA_URL && (
        <p className="field-error">Falta VITE_MEDIA_URL: non se poden mostrar as miniaturas.</p>
      )}
      {images.length === 0 ? (
        <p className="muted">Este remedio non ten imaxes.</p>
      ) : (
        <ul className="image-list">
          {images.map((key, i) => (
            <li key={key}>
              {MEDIA_URL && <img src={`${MEDIA_URL}/${key}`} alt={`Imaxe ${i + 1}`} title={key} loading="lazy" />}
              <div className="image-actions">
                <button type="button" title="Mover cara atrás" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                  ‹
                </button>
                <button type="button" title="Mover cara adiante" disabled={busy || i === images.length - 1} onClick={() => move(i, 1)}>
                  ›
                </button>
                <button
                  type="button"
                  title="Substituír"
                  disabled={busy}
                  onClick={() => {
                    replaceIndex.current = i
                    replaceInput.current?.click()
                  }}
                >
                  ⇄
                </button>
                <button type="button" title="Eliminar" disabled={busy} onClick={() => remove(i)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="image-add">
        <button type="button" disabled={busy || images.length >= MAX_IMAGES} onClick={() => addInput.current?.click()}>
          Engadir imaxes
        </button>
        {busy && <span className="muted">Subindo…</span>}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <input
        ref={addInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onAdd(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={replaceInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onReplace(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
