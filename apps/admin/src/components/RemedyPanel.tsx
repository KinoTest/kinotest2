import { IonButton, IonIcon } from '@ionic/react'
import { addOutline } from 'ionicons/icons'
import { NO_HISTORY, THERAPY } from '../editor/state.ts'
import { cmdInsert, cmdSetField, getNode, newRemedy } from '../editor/tree.ts'
import type { EditorStore } from '../editor/useEditorStore.ts'
import ImageManager from './ImageManager.tsx'
import MarkdownEditor from './MarkdownEditor.tsx'

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
            <ImageManager store={store} remedy={remedy} contentId={doc.meta.id} />
          </>
        )}
      </div>
    </section>
  )
}
