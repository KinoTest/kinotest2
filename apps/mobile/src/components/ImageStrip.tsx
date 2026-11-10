import { useState } from 'react'
import { mediaUrl } from '../lib/media.ts'

type Props = {
  images: string[] // object keys
  size?: 'small' | 'large'
  onOpen?: (index: number) => void
}

function Picture({ src, size, onClick }: { src: string; size: string; onClick?: () => void }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null // a missing image must not leave a broken icon
  return <img className={`thumb ${size}`} src={src} alt="" loading="lazy" onError={() => setFailed(true)} onClick={onClick} />
}

/** A horizontally scrollable row of images. Renders nothing (an empty box that CSS hides) if none can be shown. */
export default function ImageStrip({ images, size = 'small', onOpen }: Props) {
  return (
    <div className={`thumbs ${size}`}>
      {images.map((key, i) => {
        const src = mediaUrl(key)
        // The keys can repeat, so the position is the identity.
        return src ? <Picture key={i} src={src} size={size} onClick={onOpen ? () => onOpen(i) : undefined} /> : null
      })}
    </div>
  )
}
