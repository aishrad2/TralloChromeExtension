import { useState } from 'react'
import { formatDateTime } from '../../core/dates'
import { money, parseAmount } from '../../core/format'
import type { FlightItem, Layover } from '../../core/types/items'
import { useTrip } from '../../state/useTrip'
import { GhostButton, LinkButton, PrimaryButton, IconButton } from '../components/Buttons'
import { Badge } from '../components/Cards'
import { Field, FormRow, TextArea, TextInput } from '../components/Form'
import { SavedList, SavedRow } from '../components/SavedList'
import { ClockIcon, CloseIcon, DollarIcon, LinkIcon, PlusIcon, SaveIcon, UndoIcon } from '../components/icons'
import { useCurrentTabUrl, useDirtyForm } from '../hooks'
import { ModuleShell, UseCurrentUrl } from './ModuleShell'

type FlightForm = {
  link: string
  airlineFlight: string
  cost: string
  departAirport: string
  arriveAirport: string
  layovers: Layover[]
  departTime: string
  arriveTime: string
  notes: string
}

const BLANK: FlightForm = {
  link: '',
  airlineFlight: '',
  cost: '',
  departAirport: '',
  arriveAirport: '',
  layovers: [],
  departTime: '',
  arriveTime: '',
  notes: '',
}

function fromItem(item: FlightItem): FlightForm {
  return {
    link: item.link ?? '',
    airlineFlight: item.airlineFlight ?? '',
    cost: item.cost === undefined ? '' : String(item.cost),
    departAirport: item.departAirport ?? '',
    arriveAirport: item.arriveAirport ?? '',
    layovers: item.layovers ?? [],
    departTime: item.departTime ?? '',
    arriveTime: item.arriveTime ?? '',
    notes: item.notes ?? '',
  }
}

export function FlightsScreen() {
  const { state, actions, items, activeTrip } = useTrip()
  const [editingId, setEditingId] = useState<string>()
  const [baseline, setBaseline] = useState<FlightForm>(BLANK)
  const [form, setForm] = useState<FlightForm>(BLANK)
  const [touched, setTouched] = useState(false)
  const currentUrl = useCurrentTabUrl()

  useDirtyForm('Flights', form, baseline)

  const set = <K extends keyof FlightForm>(key: K, value: FlightForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const reset = () => {
    setForm(BLANK)
    setBaseline(BLANK)
    setEditingId(undefined)
    setTouched(false)
  }

  const startEdit = (item: FlightItem) => {
    const next = fromItem(item)
    setForm(next)
    setBaseline(next)
    setEditingId(item.rowId)
    setTouched(false)
  }

  const nameError = form.airlineFlight.trim() ? undefined : 'Add the airline and flight number.'

  const save = () => {
    setTouched(true)
    if (nameError) return
    const payload = {
      tab: 'Flights' as const,
      link: form.link.trim() || undefined,
      airlineFlight: form.airlineFlight.trim(),
      cost: parseAmount(form.cost),
      departAirport: form.departAirport.trim() || undefined,
      arriveAirport: form.arriveAirport.trim() || undefined,
      layovers: form.layovers.filter((l) => l.airport.trim()),
      departTime: form.departTime || undefined,
      arriveTime: form.arriveTime || undefined,
      notes: form.notes.trim() || undefined,
    }
    const done = editingId
      ? actions.updateItem('Flights', editingId, payload)
      : actions.addItem(payload)
    void done.then(reset)
  }

  const updateLayover = (index: number, patch: Partial<Layover>) =>
    set(
      'layovers',
      form.layovers.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    )

  return (
    <ModuleShell
      title="Flights"
      below={
        <SavedList label="Saved flights" count={items.Flights.length} empty="No flights saved yet.">
          {items.Flights.map((flight) => (
            <SavedRow
              key={flight.rowId}
              title={flight.airlineFlight || 'Untitled flight'}
              badges={[
                flight.cost !== undefined ? money(flight.cost, activeTrip?.currency) : '',
                flight.layovers.length === 0 ? 'Nonstop' : `${flight.layovers.length} stop`,
              ].filter(Boolean)}
              lines={[
                [flight.departAirport, flight.arriveAirport].filter(Boolean).join(' → '),
                [formatDateTime(flight.departTime), formatDateTime(flight.arriveTime)]
                  .filter(Boolean)
                  .join('  →  '),
                flight.notes,
              ]}
              link={flight.link}
              onEdit={() => startEdit(flight)}
              onDelete={() => void actions.deleteItem('Flights', flight.rowId)}
            />
          ))}
        </SavedList>
      }
    >
      {editingId ? (
        <Badge tone="green">Editing a saved flight</Badge>
      ) : null}

      <Field
        label="URL"
        htmlFor="flight-url"
        action={
          currentUrl.available ? (
            <UseCurrentUrl onPick={() => void currentUrl.fetch().then((u) => u && set('link', u))} />
          ) : undefined
        }
      >
        <TextInput
          id="flight-url"
          type="url"
          value={form.link}
          onChange={(v) => set('link', v)}
          placeholder="https://www.google.com/travel/flights…"
          icon={<LinkIcon size={14} />}
        />
      </Field>

      <FormRow>
        <Field
          label="Airline & Flight #"
          htmlFor="flight-number"
          error={touched ? nameError : undefined}
        >
          <TextInput
            id="flight-number"
            value={form.airlineFlight}
            onChange={(v) => set('airlineFlight', v)}
            placeholder="ANA NH 007"
            invalid={touched && !!nameError}
          />
        </Field>
        <Field label="Cost ($)" htmlFor="flight-cost">
          <TextInput
            id="flight-cost"
            value={form.cost}
            onChange={(v) => set('cost', v)}
            placeholder="1284"
            inputMode="decimal"
            icon={<DollarIcon size={14} />}
          />
        </Field>
      </FormRow>

      <FormRow>
        <Field label="Departing Airport" htmlFor="flight-from">
          <TextInput
            id="flight-from"
            value={form.departAirport}
            onChange={(v) => set('departAirport', v)}
            placeholder="SFO – San Francisco"
          />
        </Field>
        <Field label="Arriving Airport" htmlFor="flight-to">
          <TextInput
            id="flight-to"
            value={form.arriveAirport}
            onChange={(v) => set('arriveAirport', v)}
            placeholder="HND – Tokyo Haneda"
          />
        </Field>
      </FormRow>

      <Field
        label="Layovers"
        action={
          <LinkButton
            onClick={() => set('layovers', [...form.layovers, { airport: '' }])}
          >
            + Add Layover
          </LinkButton>
        }
      >
        {form.layovers.length === 0 ? (
          <div className="nonstop">
            <div className="nonstop__top">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ClockIcon size={14} />
                Direct flight (no layover)
              </span>
              <Badge tone="green">NONSTOP</Badge>
            </div>
            <span className="nonstop__hint">
              Use “+ Add Layover” above if this connects through another hub.
            </span>
          </div>
        ) : (
          <div className="savedlist">
            {form.layovers.map((layover, i) => (
              <div className="layover" key={i}>
                <TextInput
                  value={layover.airport}
                  onChange={(v) => updateLayover(i, { airport: v })}
                  placeholder="NRT"
                />
                <TextInput
                  value={layover.arriveTime ?? ''}
                  onChange={(v) => updateLayover(i, { arriveTime: v })}
                  placeholder="Arrive 10:30"
                />
                <TextInput
                  value={layover.departTime ?? ''}
                  onChange={(v) => updateLayover(i, { departTime: v })}
                  placeholder="Depart 12:45"
                />
                <IconButton
                  label={`Remove layover ${i + 1}`}
                  danger
                  onClick={() => set('layovers', form.layovers.filter((_, j) => j !== i))}
                >
                  <CloseIcon size={14} />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </Field>

      <Field
        label="Departure Date & Time (Local)"
        htmlFor="flight-depart"
        hint="Local time at the departing airport."
      >
        <TextInput
          id="flight-depart"
          type="datetime-local"
          value={form.departTime}
          onChange={(v) => set('departTime', v)}
        />
      </Field>

      <Field
        label="Arrival Date & Time (Local)"
        htmlFor="flight-arrive"
        hint="Local time at the arriving airport."
      >
        <TextInput
          id="flight-arrive"
          type="datetime-local"
          value={form.arriveTime}
          onChange={(v) => set('arriveTime', v)}
        />
      </Field>

      <Field label="Notes" htmlFor="flight-notes">
        <TextArea
          id="flight-notes"
          value={form.notes}
          onChange={(v) => set('notes', v)}
          placeholder="Transfers, baggage, seat choices…"
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

      {!editingId ? (
        <p className="field__hint" style={{ textAlign: 'center' }}>
          <PlusIcon size={11} /> Saved flights land in the Flights tab of your trip sheet.
        </p>
      ) : null}
    </ModuleShell>
  )
}
