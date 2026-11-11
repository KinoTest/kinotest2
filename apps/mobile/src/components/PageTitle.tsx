import { IonIcon, IonTitle } from '@ionic/react'
import type { ReactNode } from 'react'
import { TITLE_ICONS, type TitleKind } from '../lib/titleIcons.ts'

/** A page title with the icon of what the page shows before it (see TitleKind). */
export default function PageTitle({ kind, className, children }: { kind: TitleKind; className?: string; children: ReactNode }) {
  return (
    <IonTitle className={className}>
      <span className="page-title">
        <IonIcon icon={TITLE_ICONS[kind]} aria-hidden="true" />
        <span className="page-title-text">{children}</span>
      </span>
    </IonTitle>
  )
}
