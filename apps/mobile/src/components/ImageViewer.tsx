import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/react'
import { mediaUrl } from '../lib/media.ts'

type Props = { images: string[]; index: number | null; onClose: () => void }

/** Full-screen view of one image. `index` is null while closed. */
export default function ImageViewer({ images, index, onClose }: Props) {
  const key = index === null ? undefined : images[index]
  const src = key ? mediaUrl(key) : null
  return (
    <IonModal isOpen={index !== null} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Imaxe</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Pechar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="viewer">{src && <img src={src} alt="" />}</div>
      </IonContent>
    </IonModal>
  )
}
