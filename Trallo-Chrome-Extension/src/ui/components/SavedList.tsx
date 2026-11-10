import type { ReactNode } from 'react'
import { openUrl } from '../../platform/browser'
import { IconButton } from './Buttons'
import { Badge, EmptyState } from './Cards'
import { ExternalLinkIcon, PencilIcon, TrashIcon } from './icons'

export function SavedList({
  label,
  count,
  empty,
  children,
}: {
  label: string
  count: number
  empty: string
  children: ReactNode
}) {
  return (
    <div className="section" style={{ paddingTop: 0 }}>
      <p className="section__label">
        {label}
        {count > 0 ? ` · ${count}` : ''}
      </p>
      {count === 0 ? <EmptyState>{empty}</EmptyState> : <div className="savedlist">{children}</div>}
    </div>
  )
}

export function SavedRow({
  title,
  badges,
  lines,
  link,
  onEdit,
  onDelete,
  trailing,
}: {
  title: string
  badges?: string[]
  lines: (string | undefined)[]
  link?: string
  onEdit?: () => void
  onDelete?: () => void
  trailing?: ReactNode
}) {
  return (
    <div className="savedrow">
      {trailing}
      <div className="savedrow__main">
        <span className="savedrow__title">
          {title}
          {badges?.filter(Boolean).map((b) => (
            <Badge key={b} tone="soft">
              {b}
            </Badge>
          ))}
        </span>
        {lines.filter(Boolean).map((line, i) => (
          <span key={i} className="savedrow__line">
            {line}
          </span>
        ))}
      </div>
      <span className="savedrow__actions">
        {link ? (
          <IconButton label="Open link" onClick={() => void openUrl(link)}>
            <ExternalLinkIcon size={14} />
          </IconButton>
        ) : null}
        {onEdit ? (
          <IconButton label="Edit" onClick={onEdit}>
            <PencilIcon size={14} />
          </IconButton>
        ) : null}
        {onDelete ? (
          <IconButton label="Delete" danger onClick={onDelete}>
            <TrashIcon size={14} />
          </IconButton>
        ) : null}
      </span>
    </div>
  )
}
