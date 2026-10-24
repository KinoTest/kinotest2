import { useCallback, useRef, useState, type ChangeEvent } from 'react'
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
  useIonViewWillEnter,
} from '@ionic/react'
import { createContent, listContent, type ContentSummary } from '../lib/content.ts'
import { readContentFile } from '../lib/importFile.ts'

export default function Content() {
  const [items, setItems] = useState<ContentSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    try {
      setItems(await listContent())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    }
  }, [])

  // Also when coming back from the editor: the list may have changed.
  useIonViewWillEnter(() => {
    void reload()
  })

  // Imports a JSON file as a new therapy. Replacing or deleting one is done from its editor.
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be picked again
    if (!file) return
    setError(null)
    const result = await readContentFile(file)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setBusy(true)
    try {
      await createContent(result.doc)
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
        <IonButton routerLink="/content/new" disabled={busy}>
          Nova terapia
        </IonButton>
        <IonButton fill="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
          Importar JSON
        </IonButton>
        {error && (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        )}

        <IonList>
          {items.map((item) => (
            <IonItem key={item.id} button detail routerLink={`/content/${item.id}/edit`}>
              <IonLabel className="ion-text-wrap">
                <h2>{item.title}</h2>
                <p>
                  {item.slug} · {item.lang} · formato {item.formatVersion}
                </p>
              </IonLabel>
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
