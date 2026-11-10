import { useState } from 'react'
import { daysBetween } from '../../core/dates'
import type { Trip } from '../../core/types/trip'
import { useTrip } from '../../state/useTrip'
import { GhostButton, PrimaryButton } from '../components/Buttons'
import { ErrorBanner } from '../components/Feedback'
import { Field, FormRow, TextInput } from '../components/Form'
import { BackLink, Panel, ScreenHead, Section, TopBar, TripsFooter } from '../components/Layout'
import { CalendarIcon, DollarIcon, MapPinIcon, SaveIcon, UndoIcon, UsersIcon } from '../components/icons'

type FormState = {
  name: string
  city: string
  travelers: string
  startDate: string
  endDate: string
  budget: string
}

const BLANK: FormState = { name: '', city: '', travelers: '', startDate: '', endDate: '', budget: '' }

function fromTrip(trip: Trip): FormState {
  return {
    name: trip.name,
    city: trip.cities.join(', '),
    travelers: trip.travelers.join(', '),
    startDate: trip.startDate,
    endDate: trip.endDate,
    budget: trip.budget ? String(trip.budget) : '',
  }
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function TripFormScreen({ trip }: { trip?: Trip }) {
  const { state, actions } = useTrip()
  const [form, setForm] = useState<FormState>(trip ? fromTrip(trip) : BLANK)
  const [touched, setTouched] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const errors = {
    name: form.name.trim() ? undefined : 'Give the trip a name.',
    startDate: form.startDate ? undefined : 'Pick a start date.',
    endDate: !form.endDate
      ? 'Pick an end date.'
      : form.startDate && daysBetween(form.startDate, form.endDate) < 0
        ? 'The end date is before the start date.'
        : undefined,
    budget:
      form.budget && !Number.isFinite(Number(form.budget.replace(/[^0-9.]/g, '')))
        ? 'Budget must be a number.'
        : undefined,
  }
  const valid = !errors.name && !errors.startDate && !errors.endDate && !errors.budget

  const submit = () => {
    setTouched(true)
    if (!valid) return
    const input = {
      name: form.name.trim(),
      cities: splitList(form.city),
      startDate: form.startDate,
      endDate: form.endDate,
      travelers: splitList(form.travelers),
      budget: Number(form.budget.replace(/[^0-9.]/g, '')) || 0,
      currency: trip?.currency ?? 'USD',
    }
    if (trip) void actions.updateTrip(trip.id, input)
    else void actions.createTrip(input)
  }

  const show = (message?: string) => (touched ? message : undefined)

  return (
    <Panel
      top={<TopBar left={<BackLink label="Back to Trips" onClick={actions.goTrips} />} />}
      footer={<TripsFooter />}
    >
      <ScreenHead
        title={trip ? 'Edit Trip' : 'New Trip'}
        subtitle="Add your trip details and edit later in the Google Sheets"
      />

      <Section>
        {state.error ? (
          <ErrorBanner error={state.error} onDismiss={actions.dismissError} onSignIn={() => void actions.signIn()} />
        ) : null}

        <Field label="Trip Name" htmlFor="trip-name" error={show(errors.name)}>
          <TextInput
            id="trip-name"
            value={form.name}
            onChange={(v) => set('name', v)}
            placeholder="Spring Break"
            invalid={!!show(errors.name)}
            autoFocus={!trip}
          />
        </Field>

        <Field label="City" htmlFor="trip-city" hint="Separate several cities with commas.">
          <TextInput
            id="trip-city"
            value={form.city}
            onChange={(v) => set('city', v)}
            placeholder="Kyoto, Japan"
            icon={<MapPinIcon size={14} />}
          />
        </Field>

        <Field
          label="Travelers (optional)"
          htmlFor="trip-travelers"
          hint="Names you can assign packing items and notes to."
        >
          <TextInput
            id="trip-travelers"
            value={form.travelers}
            onChange={(v) => set('travelers', v)}
            placeholder="Alexis, Sam"
            icon={<UsersIcon size={14} />}
          />
        </Field>

        <FormRow>
          <Field label="Start Date" htmlFor="trip-start" error={show(errors.startDate)}>
            <TextInput
              id="trip-start"
              type="date"
              value={form.startDate}
              onChange={(v) => set('startDate', v)}
              invalid={!!show(errors.startDate)}
              icon={<CalendarIcon size={14} />}
            />
          </Field>
          <Field label="End Date" htmlFor="trip-end" error={show(errors.endDate)}>
            <TextInput
              id="trip-end"
              type="date"
              value={form.endDate}
              onChange={(v) => set('endDate', v)}
              invalid={!!show(errors.endDate)}
              icon={<CalendarIcon size={14} />}
            />
          </Field>
        </FormRow>

        <Field
          label="Estimated Budget"
          htmlFor="trip-budget"
          hint="You can change this later in the sheet — Trallo reads it back from there."
          error={show(errors.budget)}
        >
          <TextInput
            id="trip-budget"
            value={form.budget}
            onChange={(v) => set('budget', v)}
            placeholder="4000"
            inputMode="decimal"
            icon={<DollarIcon size={14} />}
            invalid={!!show(errors.budget)}
          />
        </Field>

        <div className="buttonstack">
          <PrimaryButton block icon={<SaveIcon size={15} />} onClick={submit} disabled={state.busy}>
            {state.busy
              ? trip
                ? 'Saving…'
                : 'Creating your sheet…'
              : trip
                ? 'Save Changes'
                : 'Create Trallo Sheets'}
          </PrimaryButton>
          <GhostButton
            block
            icon={<UndoIcon size={15} />}
            disabled={state.busy}
            onClick={() => {
              if (trip) actions.goTrips()
              else {
                setForm(BLANK)
                setTouched(false)
              }
            }}
          >
            {trip ? 'Cancel' : 'Clear Form'}
          </GhostButton>
        </div>
      </Section>
    </Panel>
  )
}
