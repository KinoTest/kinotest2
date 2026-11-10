import { IonButton } from '@ionic/react'
import type { Remedy } from '@kinotest/shared'
import { useState } from 'react'
import { parentPath, type Crumb } from '../lib/tree.ts'
import Breadcrumb from './Breadcrumb.tsx'
import ImageStrip from './ImageStrip.tsx'
import ImageViewer from './ImageViewer.tsx'
import MarkdownView from './MarkdownView.tsx'

type Props = {
  node: Remedy
  path: number[]
  crumbs: Crumb[] // the categories above it, then the remedy itself
  onOpen: (path: number[]) => void
}

/** Detail of one remedy: name, images (tap to enlarge) and description. */
export default function RemedyView({ node, path, crumbs, onOpen }: Props) {
  const [opened, setOpened] = useState<number | null>(null)
  const empty = node.images.length === 0 && !node.description.trim()

  return (
    <>
      <Breadcrumb crumbs={crumbs} onSelect={onOpen} />
      <div className="remedy">
        <h1>{node.name}</h1>
        <ImageStrip images={node.images} size="large" onOpen={setOpened} />
        <MarkdownView text={node.description} />
        {empty && <p className="state">Este remedio aínda non ten contido.</p>}
      </div>
      <ImageViewer images={node.images} index={opened} onClose={() => setOpened(null)} />
      <div className="up">
        <IonButton expand="block" fill="outline" onClick={() => onOpen(parentPath(path))}>
          Subir
        </IonButton>
      </div>
    </>
  )
}
