import { IonButton, IonIcon } from '@ionic/react'
import { addOutline } from 'ionicons/icons'
import { NO_HISTORY, THERAPY } from '../editor/state.ts'
import { cmdInsert, cmdSetField, getNode, newRemedy } from '../editor/tree.ts'
import type { EditorStore } from '../editor/useEditorStore.ts'
import MarkdownEditor from './MarkdownEditor.tsx'

// Public base URL of the image bucket (see DECISIONS.md). Without it the images are listed by key only.
const MEDIA_URL = (import.meta.env.VITE_MEDIA_URL as string | undefined)?.replace(/\/$/, '')

export default function RemedyPanel({ store }: { store: EditorStore }) {
  const { state, exec } = store
  const { doc, selectedId } = state
  const node = selectedId ? getNode(doc.root, selectedId) : null
  const remedy = node?.type === 'remedy' ? node : null

  return (
    <section className="panel" aria-label="Remedio">
      <header className="panel-head">
        <h2>Remedio</h2>
      </header>

      <div className="panel-body">
        {!node && (
          <div className="invite">
            <p>Selecciona un contedor ou un remedio no panel Terapia.</p>
          </div>
        )}

        {node?.type === 'catalog' && (
          <div className="invite">
            <p>
              Está seleccionado o contedor <strong>{node.name || '(sen nome)'}</strong>.
            </p>
            <IonButton onClick={() => exec(THERAPY, cmdInsert(doc, node.id, newRemedy()))}>
              <IonIcon slot="start" icon={addOutline} />
              Crear un remedio novo aquí
            </IonButton>
          </div>
        )}

        {remedy && (
          <>
            <label className="field">
              <span>Nome</span>
              <input value={remedy.name} onChange={(e) => exec(NO_HISTORY, cmdSetField(doc, remedy.id, 'name', e.target.value))} />
            </label>
            <div className="field">
              <span>Descrición (Markdown)</span>
              <MarkdownEditor
                key={remedy.id}
                value={remedy.description}
                onChange={(value) => exec(NO_HISTORY, cmdSetField(doc, remedy.id, 'description', value))}
              />
            </div>
            <div className="field">
              <span>Imaxes ({remedy.images.length})</span>
              {remedy.images.length === 0 ? (
                <p className="muted">Este remedio non ten imaxes.</p>
              ) : (
                <ul className="image-list">
                  {remedy.images.map((key) => (
                    <li key={key}>
                      {MEDIA_URL && <img src={`${MEDIA_URL}/${key}`} alt="" loading="lazy" />}
                      <code>{key}</code>
                    </li>
                  ))}
                </ul>
              )}
              <p className="muted">Engadir, substituír e reordenar imaxes chegará coa parte 2 (almacenamento en R2).</p>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
