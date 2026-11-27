import { useState } from 'react'
import { NOTE_CATEGORIES, type NoteCategory, type NoteItem } from '../../core/types/items'
import { useTrip } from '../../state/useTrip'
import { GhostButton, PrimaryButton } from '../components/Buttons'
import { Badge } from '../components/Cards'
import { Field, Select, TextArea, TextInput } from '../components/Form'
import { SavedList, SavedRow } from '../components/SavedList'
import { CloseIcon, SaveIcon, UndoIcon, UsersIcon } from '../components/icons'
import { useDirtyForm } from '../hooks'
import { ModuleShell } from './ModuleShell'

type NoteForm = { note: string; category: string; assignedTo: string }

const BLANK: NoteForm = { note: '', category: '', assignedTo: '' }

function fromItem(item: NoteItem): NoteForm {
  return {
    note: item.note ?? '',
    category: item.category ?? '',
    assignedTo: item.assignedTo ?? '',
  }
}

export function NotesScreen() {
  const { state, actions, items, activeTrip } = useTrip()
  const [editingId, setEditingId] = useState<string>()
  const [baseline, setBaseline] = useState<NoteForm>(BLANK)
  const [form, setForm] = useState<NoteForm>(BLANK)
  const [touched, setTouched] = useState(false)

  useDirtyForm('Notes & Brainstorming', form, baseline)

  const set = <K extends keyof NoteForm>(key: K, value: NoteForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const reset = () => {
    setForm(BLANK)
    setBaseline(BLANK)
    setEditingId(undefined)
    setTouched(false)
  }

  const startEdit = (item: NoteItem) => {
    const next = fromItem(item)
    setForm(next)
    setBaseline(next)
    setEditingId(item.rowId)
    setTouched(false)
  }

  const noteError = form.note.trim() ? undefined : 'Write the note first.'

  const save = () => {
    setTouched(true)
    if (noteError) return
    const payload = {
      tab: 'Notes & Brainstorming' as const,
      note: form.note.trim(),
      category: (form.category || undefined) as NoteCategory | undefined,
      assignedTo: form.assignedTo.trim() || undefined,
    }
    const done = editingId
      ? actions.updateItem('Notes & Brainstorming', editingId, payload)
      : actions.addItem(payload)
    void done.then(reset)
  }

  const rows = items['Notes & Brainstorming']

  return (
    <ModuleShell
      title="Notes & Brainstorm"
      below={
        <SavedList label="Saved notes" count={rows.length} empty="No notes yet.">
          {rows.map((note) => (
            <SavedRow
              key={note.rowId}
              title={note.note}
              badges={[note.category ?? ''].filter(Boolean)}
              lines={[note.assignedTo ? `Assigned to ${note.assignedTo}` : undefined]}
              onEdit={() => startEdit(note)}
              onDelete={() => void actions.deleteItem('Notes & Brainstorming', note.rowId)}
            />
          ))}
        </SavedList>
      }
    >
      {editingId ? <Badge tone="green">Editing a saved note</Badge> : null}

      <Field label="Note" htmlFor="note-body" error={touched ? noteError : undefined}>
        <TextArea
          id="note-body"
          value={form.note}
          onChange={(v) => set('note', v)}
          placeholder="Check whether a visa is needed before booking"
        />
      </Field>

      <Field label="Category" htmlFor="note-category">
        <Select
          id="note-category"
          value={form.category}
          onChange={(v) => set('category', v)}
          options={NOTE_CATEGORIES}
          placeholder="Choose a category…"
        />
      </Field>

      <Field
        label="Assignee(s)"
        htmlFor="note-assignee"
        hint={
          activeTrip && activeTrip.travelers.length > 0
            ? `Travelers on this trip: ${activeTrip.travelers.join(', ')}`
            : 'Any name works — Trallo stores it as plain text.'
        }
      >
        <TextInput
          id="note-assignee"
          value={form.assignedTo}
          onChange={(v) => set('assignedTo', v)}
          placeholder="Alexis"
          icon={<UsersIcon size={14} />}
        />
      </Field>

      <div className="buttonstack">
        <PrimaryButton block icon={<SaveIcon size={15} />} onClick={save} disabled={state.busy}>
          {state.busy ? 'Saving…' : editingId ? 'Update in Sheets' : 'Save to Sheets'}
        </PrimaryButton>
        <GhostButton
          block
          icon={editingId ? <CloseIcon size={15} /> : <UndoIcon size={15} />}
          onClick={reset}
          disabled={state.busy}
        >
          {editingId ? 'Cancel Edit' : 'Clear Form'}
        </GhostButton>
      </div>
    </ModuleShell>
  )
}
