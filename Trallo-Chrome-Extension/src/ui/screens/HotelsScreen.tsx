import { useState } from 'react'
import { formatDay } from '../../core/dates'
import { money, parseAmount, plural } from '../../core/format'
import type { HotelItem } from '../../core/types/items'
import { useTrip } from '../../state/useTrip'
import { GhostButton, PrimaryButton } from '../components/Buttons'
import { Badge } from '../components/Cards'
import { Field, FormRow, TextArea, TextInput } from '../components/Form'
import { SavedList, SavedRow } from '../components/SavedList'
import { CalendarIcon, CloseIcon, DollarIcon, LinkIcon, MapPinIcon, SaveIcon, UndoIcon } from '../components/icons'
import { useCurrentTabUrl, useDirtyForm } from '../hooks'
import { ModuleShell, UseCurrentUrl } from './ModuleShell'

type HotelForm = {
  link: string
  name: string
  address: string
  checkIn: string
  checkOut: string
  pricePerNight: string
  beds: string
  guests: string
  notes: string
}

const BLANK: HotelForm = {
  link: '',
  name: '',
  address: '',
  checkIn: '',
  checkOut: '',
  pricePerNight: '',
  beds: '',
  guests: '',
  notes: '',
}

function fromItem(item: HotelItem): HotelForm {
  return {
    link: item.link ?? '',
    name: item.name ?? '',
    address: item.address ?? '',
    checkIn: item.checkIn ?? '',
    checkOut: item.checkOut ?? '',
    pricePerNight: item.pricePerNight === undefined ? '' : String(item.pricePerNight),
    beds: item.beds === undefined ? '' : String(item.beds),
    guests: item.guests === undefined ? '' : String(item.guests),
    notes: item.notes ?? '',
  }
}

export function HotelsScreen() {
  const { state, actions, items, activeTrip } = useTrip()
  const [editingId, setEditingId] = useState<string>()
  const [baseline, setBaseline] = useState<HotelForm>(BLANK)
  const [form, setForm] = useState<HotelForm>(BLANK)
  const [touched, setTouched] = useState(false)
  const currentUrl = useCurrentTabUrl()

  useDirtyForm('Hotels & Housing', form, baseline)

  const set = <K extends keyof HotelForm>(key: K, value: HotelForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const reset = () => {
    setForm(BLANK)
    setBaseline(BLANK)
    setEditingId(undefined)
    setTouched(false)
  }

  const startEdit = (item: HotelItem) => {
    const next = fromItem(item)
    setForm(next)
    setBaseline(next)
    setEditingId(item.rowId)
    setTouched(false)
  }

  const nameError = form.name.trim() ? undefined : 'Add the hotel or housing name.'

  const save = () => {
    setTouched(true)
    if (nameError) return
    const payload = {
      tab: 'Hotels & Housing' as const,
      link: form.link.trim() || undefined,
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      checkIn: form.checkIn || undefined,
      checkOut: form.checkOut || undefined,
      pricePerNight: parseAmount(form.pricePerNight),
      beds: parseAmount(form.beds),
      guests: parseAmount(form.guests),
      notes: form.notes.trim() || undefined,
    }
    const done = editingId
      ? actions.updateItem('Hotels & Housing', editingId, payload)
      : actions.addItem(payload)
    void done.then(reset)
  }

  const rows = items['Hotels & Housing']

  return (
    <ModuleShell
      title="Hotels & Housing"
      below={
        <SavedList label="Saved stays" count={rows.length} empty="No stays saved yet.">
          {rows.map((hotel) => (
            <SavedRow
              key={hotel.rowId}
              title={hotel.name || 'Untitled stay'}
              badges={[
                hotel.pricePerNight !== undefined
                  ? `${money(hotel.pricePerNight, activeTrip?.currency)}/night`
                  : '',
                hotel.beds !== undefined ? plural(hotel.beds, 'bed') : '',
                hotel.guests !== undefined ? plural(hotel.guests, 'guest') : '',
              ].filter(Boolean)}
              lines={[
                hotel.address,
                [hotel.checkIn && formatDay(hotel.checkIn), hotel.checkOut && formatDay(hotel.checkOut)]
                  .filter(Boolean)
                  .join(' → '),
                hotel.notes,
              ]}
              link={hotel.link}
              onEdit={() => startEdit(hotel)}
              onDelete={() => void actions.deleteItem('Hotels & Housing', hotel.rowId)}
            />
          ))}
        </SavedList>
      }
    >
      {editingId ? <Badge tone="green">Editing a saved stay</Badge> : null}

      <Field
        label="URL"
        htmlFor="hotel-url"
        action={
          currentUrl.available ? (
            <UseCurrentUrl onPick={() => void currentUrl.fetch().then((u) => u && set('link', u))} />
          ) : undefined
        }
      >
        <TextInput
          id="hotel-url"
          type="url"
          value={form.link}
          onChange={(v) => set('link', v)}
          placeholder="https://www.expedia.com/…"
          icon={<LinkIcon size={14} />}
        />
      </Field>

      <Field label="Hotel Name" htmlFor="hotel-name" error={touched ? nameError : undefined}>
        <TextInput
          id="hotel-name"
          value={form.name}
          onChange={(v) => set('name', v)}
          placeholder="UNPLAN Kagurazaka Boutique Hostel"
          invalid={touched && !!nameError}
        />
      </Field>

      <Field label="Address" htmlFor="hotel-address">
        <TextInput
          id="hotel-address"
          value={form.address}
          onChange={(v) => set('address', v)}
          placeholder="23 Tenjincho, Shinjuku City, Tokyo"
          icon={<MapPinIcon size={14} />}
        />
      </Field>

      <FormRow>
        <Field label="Check-in Date" htmlFor="hotel-in">
          <TextInput
            id="hotel-in"
            type="date"
            value={form.checkIn}
            onChange={(v) => set('checkIn', v)}
            icon={<CalendarIcon size={14} />}
          />
        </Field>
        <Field label="Check-out Date" htmlFor="hotel-out">
          <TextInput
            id="hotel-out"
            type="date"
            value={form.checkOut}
            onChange={(v) => set('checkOut', v)}
            icon={<CalendarIcon size={14} />}
          />
        </Field>
      </FormRow>

      <FormRow columns={3}>
        <Field label="Price / Night" htmlFor="hotel-price">
          <TextInput
            id="hotel-price"
            value={form.pricePerNight}
            onChange={(v) => set('pricePerNight', v)}
            placeholder="48"
            inputMode="decimal"
            icon={<DollarIcon size={14} />}
          />
        </Field>
        <Field label="Beds" htmlFor="hotel-beds">
          <TextInput
            id="hotel-beds"
            value={form.beds}
            onChange={(v) => set('beds', v)}
            placeholder="1"
            inputMode="numeric"
          />
        </Field>
        <Field label="Guests" htmlFor="hotel-guests">
          <TextInput
            id="hotel-guests"
            value={form.guests}
            onChange={(v) => set('guests', v)}
            placeholder="1"
            inputMode="numeric"
          />
        </Field>
      </FormRow>

      <Field label="Notes" htmlFor="hotel-notes">
        <TextArea
          id="hotel-notes"
          value={form.notes}
          onChange={(v) => set('notes', v)}
          placeholder="Cancellation policy, laundry, transfers…"
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
