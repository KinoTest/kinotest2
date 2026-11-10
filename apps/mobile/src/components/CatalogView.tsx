import { IonButton, IonItem, IonLabel, IonList } from '@ionic/react'
import type { Catalog } from '@kinotest/shared'
import { isCatalog, parentPath, type Crumb } from '../lib/tree.ts'
import Breadcrumb from './Breadcrumb.tsx'
import ImageStrip from './ImageStrip.tsx'
import MarkdownView from './MarkdownView.tsx'

type Props = {
  node: Catalog
  path: number[]
  crumbs: Crumb[]
  onOpen: (path: number[]) => void
}

const countLabel = (n: number): string => (n === 1 ? '1 elemento' : `${n} elementos`)

/** One row per category or remedy; a remedy with images shows them under its name. */
export default function CatalogView({ node, path, crumbs, onOpen }: Props) {
  return (
    <>
      <Breadcrumb crumbs={crumbs} onSelect={onOpen} />
      {node.notes && <MarkdownView text={node.notes} />}
      {node.contents.length === 0 ? (
        <p className="state">Esta categoría está baleira.</p>
      ) : (
        <IonList lines="full">
          {node.contents.map((child, i) => (
            <IonItem key={i} button detail onClick={() => onOpen([...path, i])}>
              <IonLabel className="ion-text-wrap">
                <h2>{child.name}</h2>
                {isCatalog(child) ? <p>{countLabel(child.contents.length)}</p> : <ImageStrip images={child.images} />}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      )}
      {path.length > 0 && (
        <div className="up">
          <IonButton expand="block" fill="outline" onClick={() => onOpen(parentPath(path))}>
            Subir
          </IonButton>
        </div>
      )}
    </>
  )
}
