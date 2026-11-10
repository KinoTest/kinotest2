import { IonItem, IonLabel, IonList, IonNote } from '@ionic/react'
import { MIN_QUERY_LENGTH, parseQuery, type SearchResult } from '../lib/search.ts'
import { formatPath, isCatalog } from '../lib/tree.ts'

const MAX_SHOWN = 100

type Props = { results: SearchResult[]; query: string; onOpen: (path: number[]) => void }

/** Best matches first. The points are shown on the right, to check the ranking while testing. */
export default function SearchResults({ results, query, onOpen }: Props) {
  if (parseQuery(query).length === 0) {
    return <p className="state">Escribe polo menos {MIN_QUERY_LENGTH} letras para buscar.</p>
  }
  if (results.length === 0) {
    return <p className="state">Sen resultados para «{query.trim()}».</p>
  }
  const shown = results.slice(0, MAX_SHOWN)
  return (
    <>
      <p className="search-count">
        {results.length === 1 ? '1 resultado' : `${results.length} resultados`}
        {results.length > shown.length && ` (amósanse os ${shown.length} primeiros)`}
      </p>
      <IonList lines="full">
        {shown.map((r) => (
          <IonItem key={formatPath(r.path)} button detail onClick={() => onOpen(r.path)}>
            <IonLabel className="ion-text-wrap">
              <h2>{r.node.name}</h2>
              <p>
                {isCatalog(r.node) ? 'Categoría' : 'Remedio'}
                {r.trail.length > 0 && ` · ${r.trail.join(' › ')}`}
              </p>
            </IonLabel>
            <IonNote slot="end">{r.score}</IonNote>
          </IonItem>
        ))}
      </IonList>
    </>
  )
}
