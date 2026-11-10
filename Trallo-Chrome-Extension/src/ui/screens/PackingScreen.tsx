import { useState } from 'react'
import { NECESSITY_LEVELS, type Necessity, type PackingItem } from '../../core/types/items'
import { useTrip } from '../../state/useTrip'
import { GhostButton, PrimaryButton } from '../components/Buttons'
import { Badge } from '../components/Cards'
import { Checkbox, Field, FormRow, Select, TextArea, TextInput } from '../components/Form'
import { SavedList, SavedRow } from '../components/SavedList'
import { CloseIcon, SaveIcon, TagIcon, UndoIcon, UsersIcon } from '../components/icons'
import { useDirtyForm } from '../hooks'
import { ModuleShell } from './ModuleShell'

type PackingForm = {
  item: string
  category: string
  necessity: string
  assignedTo: string
  notes: string
  packed: boolean
}

const BLANK: PackingForm = {
  item: '',
  category: '',
  necessity: '',
  assignedTo: '',
  notes: '',
  packed: false,
}

function fromItem(item: PackingItem): PackingForm {
  return {
    item: item.item ?? '',
    category: item.category ?? '',
    necessity: item.necessity ?? '',
    assignedTo: item.assignedTo ?? '',
    notes: item.notes ?? '',
    packed: item.packed,
  }
}

export function PackingScreen() {
  const { state, actions, items, activeTrip, summary } = useTrip()
  const [editingId, setEditingId] = useState<string>()
  const [baseline, setBaseline] = useState<PackingForm>(BLANK)
  const [form, setForm] = useState<PackingForm>(BLANK)
  const [touched, setTouched] = useState(false)

  useDirtyForm('Packing List', form, baseline)

  const set = <K extends keyof PackingForm>(key: K, value: PackingForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const reset = () => {
    setForm(BLANK)
    setBaseline(BLANK)
    setEditingId(undefined)
    setTouched(false)
  }

  const startEdit = (item: PackingItem) => {
    const next = fromItem(item)
    setForm(next)
    setBaseline(next)
    setEditingId(item.rowId)
    setTouched(false)
  }

  const itemError = form.item.trim() ? undefined : 'Name the item.'

  const save = () => {
    setTouched(true)
    if (itemError) return
    const payload = {
      tab: 'Packing List' as const,
      item: form.item.trim(),
      category: form.category.trim() || undefined,
      necessity: (form.necessity || undefined) as Necessity | undefined,
      assignedTo: form.assignedTo.trim() || undefined,
      notes: form.notes.trim() || undefined,
      packed: form.packed,
    }
    const done = editingId
      ? actions.updateItem('Packing List', editingId, payload)
      : actions.addItem(payload)
    void done.then(reset)
  }

  const rows = items['Packing List']
  const percent = summary?.packedPercent

  return (
    <ModuleShell
      title="Packing List"
      right={
        <Badge tone={percent === 100 ? 'green' : 'soft'}>
          {percent === null || percent === undefined ? 'Not started' : `${percent}% Complete`}
        </Badge>
      }
      below={
        <SavedList label="Saved items" count={rows.length} empty="Nothing on the packing list yet.">
          {rows.map((packingItem) => (
            <SavedRow
              key={packingItem.rowId}
              title={packingItem.item || 'Untitled item'}
              badges={[packingItem.category ?? '', packingItem.necessity ?? ''].filter(Boolean)}
              lines={[
                packingItem.assignedTo ? `Assigned to ${packingItem.assignedTo}` : undefined,
                packingItem.notes,
              ]}
              trailing={
                <span style={{ paddingTop: 2 }}>
                  <Checkbox
                    checked={packingItem.packed}
                    label=""
                    onChange={(checked) =>
                      void actions.updateItem('Packing List', packingItem.rowId, {
                        packed: checked,
                      })
                    }
                  />
                </span>
              }
              onEdit={() => startEdit(packingItem)}
              onDelete={() => void actions.deleteItem('Packing List', packingItem.rowId)}
            />
          ))}
        </SavedList>
      }
    >
      {editingId ? <Badge tone="green">Editing a saved item</Badge> : null}

      <Field label="Item Name" htmlFor="pack-item" error={touched ? itemError : undefined}>
        <TextInput
          id="pack-item"
          value={form.item}
          onChange={(v) => set('item', v)}
          placeholder="Camera"
          icon={<TagIcon size={14} />}
          invalid={touched && !!itemError}
        />
      </Field>

      <Field label="Category" htmlFor="pack-category">
        <TextInput
          id="pack-category"
          value={form.category}
          onChange={(v) => set('category', v)}
          placeholder="Electronics & Gear"
        />
      </Field>

      <Field
        label="Necessity Level"
        htmlFor="pack-necessity"
        hint="Says whether everyone packs this or the group shares one."
      >
        <Select
          id="pack-necessity"
          value={form.necessity}
          onChange={(v) => set('necessity', v)}
          options={NECESSITY_LEVELS}
          placeholder="Choose a level…"
        />
      </Field>

      <Field
        label="Assigned Member(s)"
        htmlFor="pack-assignee"
        hint={
          activeTrip && activeTrip.travelers.length > 0
            ? `Travelers on this trip: ${activeTrip.travelers.join(', ')}`
            : 'Any name works — Trallo stores it as plain text.'
        }
      >
        <TextInput
          id="pack-assignee"
          value={form.assignedTo}
          onChange={(v) => set('assignedTo', v)}
          placeholder="Alexis"
          icon={<UsersIcon size={14} />}
        />
      </Field>

      <Field label="Notes" htmlFor="pack-notes">
        <TextArea
          id="pack-notes"
          value={form.notes}
          onChange={(v) => set('notes', v)}
          placeholder="Alexis already has a camera to bring!"
          rows={2}
        />
      </Field>

      <FormRow>
        <Checkbox
          checked={form.packed}
          onChange={(v) => set('packed', v)}
          label="Already packed"
        />
      </FormRow>

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
