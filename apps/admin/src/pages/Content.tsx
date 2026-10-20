import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { contentDocumentSchema } from '@kinotest/shared'
import {
  createContent,
  deleteContent,
  listContent,
  replaceContent,
  type ContentSummary,
} from '../lib/content.ts'

export default function Content() {
  const [items, setItems] = useState<ContentSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  // Id of the document the next file will replace; null = import it as a new one.
  const target = useRef<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setItems(await listContent())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const pick = (id: string | null) => {
    target.current = id
    fileInput.current?.click()
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be picked again
    if (!file) return
    setError(null)
    let json: unknown
    try {
      json = JSON.parse(await file.text())
    } catch {
      setError('O ficheiro non é un JSON válido.')
      return
    }
    const parsed = contentDocumentSchema.safeParse(json)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      setError(`Formato non válido (${issue?.path.map(String).join('.') || 'raíz'}): ${issue?.message}`)
      return
    }
    setBusy(true)
    try {
      if (target.current) await replaceContent(target.current, parsed.data)
      else await createContent(parsed.data)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: ContentSummary) => {
    if (!window.confirm(`Borrar «${item.title}»?`)) return
    setBusy(true)
    setError(null)
    try {
      await deleteContent(item.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Contidos</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onFile} />
        <IonButton disabled={busy} onClick={() => pick(null)}>
          Importar JSON
        </IonButton>
        {error && (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        )}

        <IonList>
          {items.map((item) => (
            <IonItem key={item.id}>
              <IonLabel className="ion-text-wrap">
                <h2>{item.title}</h2>
                <p>
                  {item.slug} · {item.lang} · formato {item.formatVersion}
                </p>
              </IonLabel>
              <IonButton slot="end" fill="clear" disabled={busy} onClick={() => pick(item.id)}>
                Substituír
              </IonButton>
              <IonButton slot="end" fill="clear" color="danger" disabled={busy} onClick={() => remove(item)}>
                Borrar
              </IonButton>
            </IonItem>
          ))}
          {items.length === 0 && (
            <IonItem>
              <IonLabel>Aínda non hai contidos.</IonLabel>
            </IonItem>
          )}
        </IonList>
      </IonContent>
    </IonPage>
  )
}
