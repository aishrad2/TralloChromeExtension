/** Inline SVGs — nothing is fetched from a CDN or an icon font. */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const PlaneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 12 3 20l3-8-3-8 18 8Z" />
    <path d="M6 12h9" />
  </Icon>
)

export const HotelIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 21h18" />
    <path d="M5 21V4h10v17" />
    <path d="M15 10h4v11" />
    <path d="M8 8h1.5M8 12h1.5M8 16h1.5M11.5 8H13M11.5 12H13M11.5 16H13" />
  </Icon>
)

export const CompassIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.6 8.4 13.6 13.6 8.4 15.6l2-5.2Z" />
  </Icon>
)

export const BagIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M3 12h18" />
  </Icon>
)

export const WalletIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M2.5 10h19" />
    <path d="M17 15h2" />
  </Icon>
)

export const NoteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17Z" />
    <path d="m14.5 6.5 3 3" />
  </Icon>
)

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
)

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </Icon>
)

export const ShareIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="m8.2 10.8 7.6-4.3M8.2 13.2l7.6 4.3" />
  </Icon>
)

export const RefreshIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 4v5h-5" />
  </Icon>
)

export const ExternalLinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icon>
)

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="m6 7 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
  </Icon>
)

export const PencilIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17Z" />
    <path d="m14.5 6.5 3 3" />
  </Icon>
)

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const SaveIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    <path d="M8 3v6h7" />
    <path d="M8 21v-6h8v6" />
  </Icon>
)

export const UndoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 2.6-6.4" />
    <path d="M3 4v5h5" />
  </Icon>
)

export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
  </Icon>
)

export const MapPinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Icon>
)

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
)

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Icon>
)

export const DollarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v18" />
    <path d="M16.5 7.5c0-1.9-2-3-4.5-3S7.5 5.8 7.5 7.7c0 4.3 9 2.3 9 6.6 0 2-2 3.2-4.5 3.2s-4.5-1.2-4.5-3.2" />
  </Icon>
)

export const TagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 11V4a1 1 0 0 1 1-1h7l9 9-8 8-9-9Z" />
    <circle cx="7.5" cy="7.5" r="1.3" />
  </Icon>
)

export const SheetIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 9v12" />
  </Icon>
)

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <path d="M16 11.5a3 3 0 0 0 0-6" />
    <path d="M17.5 20c0-2.6-1-4.3-2.5-5.2" />
  </Icon>
)

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Icon>
)

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 13 4 4 10-10" />
  </Icon>
)

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6 18 18M18 6 6 18" />
  </Icon>
)

export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="5" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    <circle cx="12" cy="19" r="1.3" fill="currentColor" />
  </Icon>
)

export const MapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </Icon>
)

/** Google's mark, drawn inline so the sign-in button needs no remote asset. */
export function GoogleMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.5z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8 41 15.4 46 24 46z"
      />
      <path fill="#FBBC05" d="M11.8 28.2a13.2 13.2 0 0 1 0-8.4v-5.7H4.5a22 22 0 0 0 0 19.8l7.3-5.7z" />
      <path
        fill="#EA4335"
        d="M24 10.5c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 3.9 30 2 24 2 15.4 2 8 7 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9.3 12.2-9.3z"
      />
    </svg>
  )
}
