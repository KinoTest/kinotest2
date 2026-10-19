import { useCallback, useEffect, useState } from 'react'
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import {
  createContent,
  deleteContent,
  listContent,
  updateContent,
  type ContentItem,
} from '../lib/content.ts'

export default function Content() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  const reset = () => {
    setEditingId(null)
    setTitle('')
    setDescription('')
  }

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  const submit = () =>
    run(async () => {
      const input = { title: title.trim(), description }
      if (editingId) await updateContent(editingId, input)
      else await createContent(input)
      reset()
    })

  const edit = (item: ContentItem) => {
    setEditingId(item.id)
    setTitle(item.title)
    setDescription(item.description)
  }

  const remove = (item: ContentItem) => {
    if (!window.confirm(`Borrar «${item.title}»?`)) return
    void run(async () => {
      await deleteContent(item.id)
      if (editingId === item.id) reset()
    })
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
        <IonList>
          <IonItem>
            <IonInput
              label="Título"
              labelPlacement="stacked"
              maxlength={200}
              value={title}
              onIonInput={(e) => setTitle(String(e.detail.value ?? ''))}
            />
          </IonItem>
          <IonItem>
            <IonTextarea
              label="Descrición"
              labelPlacement="stacked"
              maxlength={5000}
              autoGrow
              value={description}
              onIonInput={(e) => setDescription(String(e.detail.value ?? ''))}
            />
          </IonItem>
        </IonList>
        {error && (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        )}
        <IonButton disabled={busy || !title.trim()} onClick={submit}>
          {editingId ? 'Gardar' : 'Crear'}
        </IonButton>
        {editingId && (
          <IonButton fill="outline" disabled={busy} onClick={reset}>
            Cancelar
          </IonButton>
        )}

        <IonList>
          {items.map((item) => (
            <IonItem key={item.id}>
              <IonLabel className="ion-text-wrap">
                <h2>{item.title}</h2>
                {item.description && <p>{item.description}</p>}
              </IonLabel>
              <IonButton slot="end" fill="clear" disabled={busy} onClick={() => edit(item)}>
                Editar
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
