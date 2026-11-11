import { bookOutline, calendarOutline, leafOutline, personOutline } from 'ionicons/icons'

/**
 * What a page shows, marked by an icon before its title: `therapies` for every page of the Terapias section
 * (the icon of its tab), `remedy` for a therapy or remedy seen from a session (same icon as the admin).
 */
export type TitleKind = 'therapies' | 'patient' | 'remedy' | 'session'

export const TITLE_ICONS: Record<TitleKind, string> = {
  therapies: bookOutline,
  patient: personOutline,
  remedy: leafOutline,
  session: calendarOutline,
}

/**
 * Options that put the icon of `kind` before the header of an Ionic alert (whose header can only be text).
 * The icon is drawn as a CSS mask, so its outline needs the stroke that Ionicons normally gets from its own CSS.
 */
export function alertTitleIcon(kind: TitleKind) {
  const svg = TITLE_ICONS[kind].replace(
    /class='ionicon-fill-none ionicon-stroke-width'/g,
    "fill='none' stroke='black' stroke-width='32'",
  )
  return { cssClass: 'alert-title-icon', htmlAttributes: { style: { '--title-icon': `url("${svg}")` } } }
}
