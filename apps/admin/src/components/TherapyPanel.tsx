import { useEffect, useRef } from 'react'
import { IonButton, IonIcon } from '@ionic/react'
import {
  addOutline,
  arrowRedoOutline,
  arrowUndoOutline,
  chevronDown,
  chevronForward,
  createOutline,
  folderOutline,
  leafOutline,
  trashOutline,
} from 'ionicons/icons'
import { Tree, type NodeApi, type NodeRendererProps, type TreeApi } from 'react-arborist'
import { historyKey } from '../editor/keys.ts'
import { canRedo, canUndo, NO_HISTORY, THERAPY } from '../editor/state.ts'
import MarkdownEditor from './MarkdownEditor.tsx'
import {
  cmdInsert,
  cmdMove,
  cmdRemove,
  cmdSetField,
  cmdSetMeta,
  countRemedies,
  insertionParentId,
  newCatalog,
  newRemedy,
  ROOT_ID,
  type TreeNode,
} from '../editor/tree.ts'
import type { EditorStore } from '../editor/useEditorStore.ts'
import { useElementHeight } from '../lib/hooks.ts'

function RenameInput({ node }: { node: NodeApi<TreeNode> }) {
  return (
    <input
      className="tree-rename"
      autoFocus
      defaultValue={node.data.name}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => node.reset()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') node.reset()
        if (e.key === 'Enter') node.submit(e.currentTarget.value)
      }}
    />
  )
}

function Row({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
  const data = node.data
  const isCatalog = data.type === 'catalog'
  const classes = ['tree-row', node.isSelected && 'is-selected', node.willReceiveDrop && 'is-drop']
  return (
    <div style={style} className={classes.filter(Boolean).join(' ')}>
      <div ref={dragHandle} className="tree-row-inner" onDoubleClick={() => void node.edit()}>
        {isCatalog ? (
          <button
            type="button"
            className="tree-toggle"
            aria-label={node.isOpen ? 'Pechar' : 'Abrir'}
            onClick={(e) => {
              e.stopPropagation()
              node.toggle()
            }}
          >
            <IonIcon icon={node.isOpen ? chevronDown : chevronForward} />
          </button>
        ) : (
          <span className="tree-toggle" />
        )}
        <IonIcon icon={isCatalog ? folderOutline : leafOutline} className="tree-icon" />
        {node.isEditing ? (
          <RenameInput node={node} />
        ) : (
          <span className="tree-name">{data.name || '(sen nome)'}</span>
        )}
        {isCatalog && <span className="tree-count">{countRemedies(data)}</span>}
      </div>
    </div>
  )
}

export default function TherapyPanel({ store }: { store: EditorStore }) {
  const { state, exec, undo, redo, select } = store
  const { doc, selectedId } = state
  const treeRef = useRef<TreeApi<TreeNode> | undefined>(undefined)
  const [treeBox, treeHeight] = useElementHeight<HTMLDivElement>()

  // Show the selection when it changes from outside the tree (a new node, an undo).
  useEffect(() => {
    const api = treeRef.current
    if (!api || !selectedId) return
    api.get(selectedId)?.openParents()
    api.scrollTo(selectedId)
  }, [selectedId])

  const add = (node: TreeNode) => exec(THERAPY, cmdInsert(doc, insertionParentId(doc, selectedId), node))
  const canRemove = selectedId !== null && selectedId !== ROOT_ID

  return (
    <section className="panel" aria-label="Terapia" onKeyDown={(e) => historyKey(e, () => undo(THERAPY), () => redo(THERAPY))}>
      <header className="panel-head">
        <h2>Terapia</h2>
        <div>
          <IonButton fill="clear" size="small" title="Desfacer (Ctrl+Z)" disabled={!canUndo(state, THERAPY)} onClick={() => undo(THERAPY)}>
            <IonIcon slot="icon-only" icon={arrowUndoOutline} />
          </IonButton>
          <IonButton fill="clear" size="small" title="Refacer (Ctrl+Shift+Z)" disabled={!canRedo(state, THERAPY)} onClick={() => redo(THERAPY)}>
            <IonIcon slot="icon-only" icon={arrowRedoOutline} />
          </IonButton>
        </div>
      </header>

      <div className="panel-body">
        <label className="field">
          <span>Nome da terapia</span>
          <input value={doc.root.name} onChange={(e) => exec(NO_HISTORY, cmdSetField(doc, ROOT_ID, 'name', e.target.value))} />
        </label>
        <div className="form-row">
          <label className="field">
            <span>Identificador</span>
            <input
              value={doc.meta.slug}
              placeholder="p. ex. biomagneticPair"
              onChange={(e) => exec(NO_HISTORY, cmdSetMeta(doc, 'slug', e.target.value))}
            />
          </label>
          <label className="field">
            <span>Idioma</span>
            <input value={doc.meta.lang} placeholder="es-ES" onChange={(e) => exec(NO_HISTORY, cmdSetMeta(doc, 'lang', e.target.value))} />
          </label>
        </div>
        <div className="field">
          <span>Notas (Markdown)</span>
          <MarkdownEditor
            value={doc.root.notes}
            rows={4}
            onChange={(value) => exec(NO_HISTORY, cmdSetField(doc, ROOT_ID, 'notes', value))}
          />
        </div>

        <div className="tree-toolbar">
          <IonButton size="small" fill="outline" onClick={() => add(newCatalog())}>
            <IonIcon slot="start" icon={addOutline} />
            Contedor
          </IonButton>
          <IonButton size="small" fill="outline" onClick={() => add(newRemedy())}>
            <IonIcon slot="start" icon={addOutline} />
            Remedio
          </IonButton>
          <IonButton size="small" fill="outline" disabled={!selectedId} onClick={() => selectedId && void treeRef.current?.edit(selectedId)}>
            <IonIcon slot="start" icon={createOutline} />
            Renomear
          </IonButton>
          <IonButton
            size="small"
            fill="outline"
            color="danger"
            disabled={!canRemove}
            onClick={() => selectedId && exec(THERAPY, cmdRemove(doc, selectedId))}
          >
            <IonIcon slot="start" icon={trashOutline} />
            Eliminar
          </IonButton>
        </div>

        <div ref={treeBox} className="tree-box">
          <Tree<TreeNode>
            ref={treeRef}
            data={[doc.root]}
            width="100%"
            height={treeHeight}
            rowHeight={32}
            indent={20}
            initialOpenState={{ [ROOT_ID]: true }}
            selection={selectedId ?? undefined}
            disableMultiSelection
            disableEdit={false}
            disableDrag={(n) => n.id === ROOT_ID}
            disableDrop={({ parentNode }) => parentNode.isRoot || parentNode.data.type === 'remedy'}
            onSelect={(nodes) => select(nodes[0]?.id ?? null)}
            onMove={({ dragIds, parentId, index }) => {
              const id = dragIds[0]
              if (id && parentId) exec(THERAPY, cmdMove(doc, id, parentId, index))
            }}
            onRename={({ id, name }) => {
              const clean = name.trim()
              if (clean) exec(THERAPY, cmdSetField(doc, id, 'name', clean))
            }}
            onDelete={({ ids }) => {
              const id = ids[0]
              if (id) exec(THERAPY, cmdRemove(doc, id))
            }}
          >
            {Row}
          </Tree>
        </div>
      </div>
    </section>
  )
}
