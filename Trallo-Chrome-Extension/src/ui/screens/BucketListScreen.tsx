import { useState } from 'react'
import { money, parseAmount } from '../../core/format'
import type { BucketListItem } from '../../core/types/items'
import { mapsUrl, openUrl } from '../../platform/browser'
import { useTrip } from '../../state/useTrip'
import { GhostButton, PrimaryButton } from '../components/Buttons'
import { Badge, QuickView } from '../components/Cards'
import { Field, FormRow, TextArea, TextInput } from '../components/Form'
import { SavedList, SavedRow } from '../components/SavedList'
import {
  CloseIcon,
  DollarIcon,
  LinkIcon,
  MapIcon,
  MapPinIcon,
  SaveIcon,
  SheetIcon,
  TagIcon,
  UndoIcon,
} from '../components/icons'
import { useCurrentTabUrl, useDirtyForm } from '../hooks'
import { ModuleShell, UseCurrentUrl } from './ModuleShell'

type BucketForm = {
  link: string
  name: string
  address: string
  category: string
  cost: string
  notes: string
  lat: string
  lng: string
}

const BLANK: BucketForm = {
  link: '',
  name: '',
  address: '',
  category: '',
  cost: '',
  notes: '',
  lat: '',
  lng: '',
}

function fromItem(item: BucketListItem): BucketForm {
  return {
    link: item.link ?? '',
    name: item.name ?? '',
    address: item.address ?? '',
    category: item.category ?? '',
    cost: item.cost === undefined ? '' : String(item.cost),
    notes: item.notes ?? '',
    lat: item.lat === undefined ? '' : String(item.lat),
    lng: item.lng === undefined ? '' : String(item.lng),
  }
}

export function BucketListScreen() {
  const { state, actions, items, activeTrip } = useTrip()
  const [editingId, setEditingId] = useState<string>()
  const [baseline, setBaseline] = useState<BucketForm>(BLANK)
  const [form, setForm] = useState<BucketForm>(BLANK)
  const [touched, setTouched] = useState(false)
  const currentUrl = useCurrentTabUrl()

  useDirtyForm('Bucket List', form, baseline)

  const set = <K extends keyof BucketForm>(key: K, value: BucketForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const reset = () => {
    setForm(BLANK)
    setBaseline(BLANK)
    setEditingId(undefined)
    setTouched(false)
  }

  const startEdit = (item: BucketListItem) => {
    const next = fromItem(item)
    setForm(next)
    setBaseline(next)
    setEditingId(item.rowId)
    setTouched(false)
  }

  const nameError = form.name.trim() ? undefined : 'Give this place a name.'

  const save = () => {
    setTouched(true)
    if (nameError) return
    const payload = {
      tab: 'Bucket List' as const,
      link: form.link.trim() || undefined,
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      category: form.category.trim() || undefined,
      cost: parseAmount(form.cost),
      notes: form.notes.trim() || undefined,
      lat: parseAmount(form.lat),
      lng: parseAmount(form.lng),
    }
    const done = editingId
      ? actions.updateItem('Bucket List', editingId, payload)
      : actions.addItem(payload)
    void done.then(reset)
  }

  const rows = items['Bucket List']
  const mapQuery =
    form.address.trim() ||
    form.name.trim() ||
    rows.map((r) => r.address || r.name).find(Boolean) ||
    activeTrip?.cities.join(', ') ||
    ''

  return (
    <ModuleShell
      title="Bucket List"
      below={
        <>
          <SavedList label="Saved places" count={rows.length} empty="No places saved yet.">
            {rows.map((place) => (
              <SavedRow
                key={place.rowId}
                title={place.name || 'Untitled place'}
                badges={[
                  place.category ?? '',
                  place.cost !== undefined ? money(place.cost, activeTrip?.currency) : '',
                ].filter(Boolean)}
                lines={[place.address, place.notes]}
                link={place.link}
                onEdit={() => startEdit(place)}
                onDelete={() => void actions.deleteItem('Bucket List', place.rowId)}
              />
            ))}
          </SavedList>

          <div className="section" style={{ paddingTop: 0 }}>
            <p className="section__label">Quick views</p>
            <div className="quickviews">
              <QuickView
                icon={<MapIcon size={16} />}
                title="Open Maps"
                sub={mapQuery ? 'Search this place' : 'Add an address first'}
                onClick={() => mapQuery && void openUrl(mapsUrl(mapQuery))}
              />
              <QuickView
                icon={<SheetIcon size={16} />}
                title="Open Sheets"
                sub="Live sync"
                onClick={() => void actions.openSheet('Bucket List')}
              />
            </div>
          </div>
        </>
      }
    >
      {editingId ? <Badge tone="green">Editing a saved place</Badge> : null}

      <Field
        label="URL"
        htmlFor="bucket-url"
        action={
          currentUrl.available ? (
            <UseCurrentUrl onPick={() => void currentUrl.fetch().then((u) => u && set('link', u))} />
          ) : undefined
        }
      >
        <TextInput
          id="bucket-url"
          type="url"
          value={form.link}
          onChange={(v) => set('link', v)}
          placeholder="https://www.teamlab.art/e/planets/"
          icon={<LinkIcon size={14} />}
        />
      </Field>

      <Field label="Name" htmlFor="bucket-name" error={touched ? nameError : undefined}>
        <TextInput
          id="bucket-name"
          value={form.name}
          onChange={(v) => set('name', v)}
          placeholder="teamLab Planets TOKYO"
          invalid={touched && !!nameError}
        />
      </Field>

      <Field label="Address" htmlFor="bucket-address">
        <TextInput
          id="bucket-address"
          value={form.address}
          onChange={(v) => set('address', v)}
          placeholder="6 Chome-1-16 Toyosu, Koto City, Tokyo"
          icon={<MapPinIcon size={14} />}
        />
      </Field>

      <FormRow>
        <Field label="Category" htmlFor="bucket-category">
          <TextInput
            id="bucket-category"
            value={form.category}
            onChange={(v) => set('category', v)}
            placeholder="Museum"
            icon={<TagIcon size={14} />}
          />
        </Field>
        <Field label="Cost ($)" htmlFor="bucket-cost">
          <TextInput
            id="bucket-cost"
            value={form.cost}
            onChange={(v) => set('cost', v)}
            placeholder="26"
            inputMode="decimal"
            icon={<DollarIcon size={14} />}
          />
        </Field>
      </FormRow>

      <Field label="Notes" htmlFor="bucket-notes">
        <TextArea
          id="bucket-notes"
          value={form.notes}
          onChange={(v) => set('notes', v)}
          placeholder="Booking windows, what to wear, best time to go…"
        />
      </Field>

      <FormRow>
        <Field
          label="Latitude (optional)"
          htmlFor="bucket-lat"
          hint="Saved for the in-panel map in a later version."
        >
          <TextInput
            id="bucket-lat"
            value={form.lat}
            onChange={(v) => set('lat', v)}
            placeholder="35.6499"
            inputMode="decimal"
          />
        </Field>
        <Field label="Longitude (optional)" htmlFor="bucket-lng">
          <TextInput
            id="bucket-lng"
            value={form.lng}
            onChange={(v) => set('lng', v)}
            placeholder="139.7906"
            inputMode="decimal"
          />
        </Field>
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
