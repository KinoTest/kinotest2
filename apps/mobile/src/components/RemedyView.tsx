import { IonButton } from '@ionic/react'
import type { Remedy } from '@kinotest/shared'
import { parentPath, type Crumb } from '../lib/tree.ts'
import Breadcrumb from './Breadcrumb.tsx'
import RemedyDetail from './RemedyDetail.tsx'

type Props = {
  node: Remedy
  path: number[]
  crumbs: Crumb[] // the categories above it, then the remedy itself
  onOpen: (path: number[]) => void
}

/** Detail of one remedy inside the therapy browser: breadcrumb, the sheet, and a way up. */
export default function RemedyView({ node, path, crumbs, onOpen }: Props) {
  return (
    <>
      <Breadcrumb crumbs={crumbs} onSelect={onOpen} />
      <RemedyDetail remedy={node} />
      <div className="up">
        <IonButton expand="block" fill="outline" onClick={() => onOpen(parentPath(path))}>
          Subir
        </IonButton>
      </div>
    </>
  )
}
