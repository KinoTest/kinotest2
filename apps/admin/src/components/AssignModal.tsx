import { useEffect, useMemo, useState } from 'react'
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { EMPTY_FIELDS, parseFields, type FieldsForm } from '../lib/assignmentFields.ts'
import { createAssignments, listUsers } from '../lib/assignments.ts'
import { listContent } from '../lib/content.ts'
import AssignmentFields from './AssignmentFields.tsx'

interface Candidate {
  id: string
  label: string
  detail: string
}

interface Props {
  /** `users`: assign ONE therapy to several therapists. `therapies`: assign several therapies to ONE therapist. */
  mode: 'users' | 'therapies'
  /** Id of the fixed side: the ContentItem (mode `users`) or the User (mode `therapies`). */
  fixedId: string
  /** Candidates already assigned: they are not offered again. */
  excludeIds: string[]
  onClose: () => void
  onDone: () => void
}

export default function AssignModal({ mode, fixedId, excludeIds, onClose, onDone }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [form, setForm] = useState<FieldsForm>(EMPTY_FIELDS)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Therapists are searched in the API; therapies are loaded once and filtered here.
  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<Candidate[]> => {
      if (mode === 'users') {
        return (await listUsers(search)).map((u) => ({
          id: u.id,
          label: u.email,
          detail: `${u.assignmentCount} terapia(s) asignada(s)`,
        }))
      }
      return (await listContent()).map((c) => ({ id: c.id, label: c.title, detail: c.lang }))
    }
    load()
      .then((list) => {
        if (!cancelled) setCandidates(list)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro')
      })
    return () => {
      cancelled = true
    }
  }, [mode, mode === 'users' ? search : ''])

  const visible = useMemo(() => {
    const excluded = new Set(excludeIds)
    const text = search.trim().toLowerCase()
    return candidates.filter(
      (c) => !excluded.has(c.id) && (mode === 'users' || !text || c.label.toLowerCase().includes(text)),
    )
  }, [candidates, excludeIds, mode, search])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(c.id))
  const toggleVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const c of visible) {
        if (allVisibleSelected) next.delete(c.id)
        else next.add(c.id)
      }
      return next
    })

  const save = async () => {
    const parsed = parseFields(form)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    const ids = [...selected]
    setBusy(true)
    try {
      await createAssignments({
        userIds: mode === 'users' ? ids : [fixedId],
        contentItemIds: mode === 'users' ? [fixedId] : ids,
        ...parsed.value,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
      setBusy(false)
    }
  }

  return (
    <IonModal isOpen onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>Cancelar</IonButton>
          </IonButtons>
          <IonTitle>{mode === 'users' ? 'Asignar a terapeutas' : 'Asignar terapias'}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={busy || selected.size === 0} onClick={save}>
              Asignar ({selected.size})
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={search}
            debounce={300}
            placeholder={mode === 'users' ? 'Buscar por email' : 'Buscar terapia'}
            onIonInput={(e) => setSearch(e.detail.value ?? '')}
          />
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {error && (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        )}
        <IonButton fill="outline" size="small" disabled={visible.length === 0} onClick={toggleVisible}>
          {allVisibleSelected ? 'Desmarcar os visibles' : 'Marcar os visibles'}
        </IonButton>
        <IonList>
          {visible.map((c) => (
            <IonItem key={c.id}>
              <IonCheckbox checked={selected.has(c.id)} onIonChange={() => toggle(c.id)}>
                <IonLabel className="ion-text-wrap">
                  <h2>{c.label}</h2>
                  <p>{c.detail}</p>
                </IonLabel>
              </IonCheckbox>
            </IonItem>
          ))}
          {visible.length === 0 && (
            <IonItem>
              <IonLabel>Non hai ninguén (ou nada) que asignar con ese filtro.</IonLabel>
            </IonItem>
          )}
        </IonList>
        <h3>Datos da asignación</h3>
        <p>Aplícanse a todas as asignacións deste lote.</p>
        <AssignmentFields value={form} onChange={setForm} />
      </IonContent>
    </IonModal>
  )
}
