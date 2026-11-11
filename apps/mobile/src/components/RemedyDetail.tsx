import type { Remedy } from '@kinotest/shared'
import { useState } from 'react'
import ImageStrip from './ImageStrip.tsx'
import ImageViewer from './ImageViewer.tsx'
import MarkdownView from './MarkdownView.tsx'

/** The sheet of a remedy: name, images (tap to enlarge) and description. */
export default function RemedyDetail({ remedy }: { remedy: Remedy }) {
  const [opened, setOpened] = useState<number | null>(null)
  const empty = remedy.images.length === 0 && !remedy.description.trim()

  return (
    <>
      <div className="remedy">
        <h1>{remedy.name}</h1>
        <ImageStrip images={remedy.images} size="large" onOpen={setOpened} />
        <MarkdownView text={remedy.description} />
        {empty && <p className="state">Este remedio aínda non ten contido.</p>}
      </div>
      <ImageViewer images={remedy.images} index={opened} onClose={() => setOpened(null)} />
    </>
  )
}
