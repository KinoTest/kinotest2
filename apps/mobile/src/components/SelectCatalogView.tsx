import { IonBadge, IonButton, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react'
import type { Catalog } from '@kinotest/shared'
import { checkmarkCircle, ellipseOutline } from 'ionicons/icons'
import { isCatalog, parentPath, type Crumb } from '../lib/tree.ts'
import Breadcrumb from './Breadcrumb.tsx'
import ImageStrip from './ImageStrip.tsx'
import MarkdownView from './MarkdownView.tsx'

type Props = {
  node: Catalog
  path: number[]
  crumbs: Crumb[]
  /** The first crumb, before the therapy (back to the session). */
  root: { label: string; onSelect: () => void }
  onOpen: (path: number[]) => void
  onToggle: (path: number[], name: string) => void
  isSelected: (path: number[], name: string) => boolean
  isVisited: (path: number[]) => boolean
  countSelected: (path: number[]) => number
}

/**
 * A category of a therapy while choosing the remedies of a session. Like CatalogView, but a remedy is ticked or
 * unticked instead of opened, the categories already entered look different, and a badge counts the remedies
 * chosen inside each category.
 */
export default function SelectCatalogView(props: Props) {
  const { node, path, crumbs, root, onOpen, onToggle, isSelected, isVisited, countSelected } = props
  return (
    <>
      <Breadcrumb crumbs={crumbs} onSelect={onOpen} root={root} />
      {node.notes && <MarkdownView text={node.notes} />}
      {node.contents.length === 0 ? (
        <p className="state">Esta categoría está baleira.</p>
      ) : (
        <IonList lines="full">
          {node.contents.map((child, i) => {
            const at = [...path, i]
            if (isCatalog(child)) {
              const count = countSelected(at)
              return (
                <IonItem key={i} button detail className={isVisited(at) ? 'visited' : undefined} onClick={() => onOpen(at)}>
                  <IonLabel className="ion-text-wrap">
                    <h2>{child.name}</h2>
                  </IonLabel>
                  {count > 0 && (
                    <IonBadge slot="end" aria-label={`${count} seleccionados`}>
                      {count}
                    </IonBadge>
                  )}
                </IonItem>
              )
            }
            const selected = isSelected(at, child.name)
            return (
              <IonItem
                key={i}
                button
                className={selected ? 'selected' : undefined}
                aria-pressed={selected}
                onClick={() => onToggle(at, child.name)}
              >
                <IonIcon
                  slot="start"
                  icon={selected ? checkmarkCircle : ellipseOutline}
                  color={selected ? 'primary' : 'medium'}
                  aria-hidden="true"
                />
                <IonLabel className="ion-text-wrap">
                  <h2>{child.name}</h2>
                  <ImageStrip images={child.images} />
                </IonLabel>
              </IonItem>
            )
          })}
        </IonList>
      )}
      <div className="up">
        <IonButton expand="block" fill="outline" onClick={path.length > 0 ? () => onOpen(parentPath(path)) : root.onSelect}>
          Subir
        </IonButton>
      </div>
    </>
  )
}
