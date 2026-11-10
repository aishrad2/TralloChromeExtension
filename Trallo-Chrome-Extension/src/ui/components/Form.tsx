import { useId, type ChangeEvent, type ReactNode } from 'react'

type FieldProps = {
  label: string
  htmlFor?: string
  action?: ReactNode
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ label, htmlFor, action, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      <div className="field__head">
        <label className="field__label" htmlFor={htmlFor}>
          {label}
        </label>
        {action}
      </div>
      {children}
      {error ? <p className="field__error">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  )
}

export function FormRow({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 }) {
  return <div className={columns === 3 ? 'formrow formrow--three' : 'formrow'}>{children}</div>
}

type ControlProps = {
  icon?: ReactNode
  invalid?: boolean
  select?: boolean
  children: ReactNode
}

function Control({ icon, invalid, select, children }: ControlProps) {
  const className = ['control', invalid && 'control--invalid', select && 'control--select']
    .filter(Boolean)
    .join(' ')
  return (
    <div className={className}>
      {icon ? <span className="control__icon">{icon}</span> : null}
      {children}
    </div>
  )
}

type TextInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: ReactNode
  invalid?: boolean
  type?: 'text' | 'url' | 'email' | 'date' | 'datetime-local' | 'number'
  inputMode?: 'text' | 'numeric' | 'decimal'
  min?: number
  step?: number
  autoFocus?: boolean
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  icon,
  invalid,
  type = 'text',
  inputMode,
  min,
  step,
  autoFocus,
}: TextInputProps) {
  return (
    <Control icon={icon} invalid={invalid}>
      <input
        id={id}
        type={type}
        value={value}
        inputMode={inputMode}
        min={min}
        step={step}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </Control>
  )
}

export function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <Control>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      />
    </Control>
  )
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  icon,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder?: string
  icon?: ReactNode
}) {
  return (
    <Control icon={icon} select>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Control>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  const id = useId()
  return (
    <label className="checkrow" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
