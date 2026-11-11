import { IonButton, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react'
import { closeCircleOutline } from 'ionicons/icons'
import { remedyKey, remedyTrail, sortForDisplay, type ListedRemedy } from '../lib/sessionView.ts'

type Props<T extends ListedRemedy> = {
  items: T[]
  /** Tap on a remedy; receives its position in `items`. */
  onOpen?: (index: number) => void
  /** Shows a button to take a remedy out of the list; receives the remedy. */
  onRemove?: (item: T) => void
}

/** The remedies of a session, grouped by therapy and category, each with the categories it belongs to above its name. */
export default function SessionRemedyList<T extends ListedRemedy>({ items, onOpen, onRemove }: Props<T>) {
  return (
    <IonList lines="full" className="session-remedies">
      {sortForDisplay(items).map(({ item, index }) => (
        <IonItem key={remedyKey(item)} button={!!onOpen} detail={!!onOpen} onClick={onOpen ? () => onOpen(index) : undefined}>
          <IonLabel className="ion-text-wrap">
            <p className="remedy-trail">{remedyTrail(item)}</p>
            <h2>{item.name}</h2>
          </IonLabel>
          {onRemove && (
            <IonButton slot="end" fill="clear" color="medium" aria-label={`Quitar ${item.name}`} onClick={() => onRemove(item)}>
              <IonIcon slot="icon-only" icon={closeCircleOutline} />
            </IonButton>
          )}
        </IonItem>
      ))}
    </IonList>
  )
}
