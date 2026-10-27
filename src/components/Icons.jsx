// Small stroke icons so the UI doesn't lean on emoji. They inherit currentColor.
function Icon({ size = 20, children, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {children}
    </svg>
  )
}

export const HomeIcon = (p) => <Icon {...p}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></Icon>
export const BellIcon = (p) => <Icon {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></Icon>
export const TrophyIcon = (p) => <Icon {...p}><path d="M8 4h8v6a4 4 0 0 1-8 0z" /><path d="M8 6H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3M8.5 20h7M10 17h4v3h-4z" /></Icon>
export const UserIcon = (p) => <Icon {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1-3.5 3.8-5 7-5s6 1.5 7 5" /></Icon>
export const MicIcon = (p) => <Icon {...p}><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v3.5" /></Icon>
export const CameraIcon = (p) => <Icon {...p}><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><circle cx="12" cy="13" r="3.5" /></Icon>
export const CheckIcon = (p) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>
export const StarIcon = (p) => <Icon {...p}><path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" /></Icon>
export const FlameIcon = (p) => <Icon {...p}><path d="M12 21c3.6 0 6-2.4 6-5.8 0-3.7-3-6-4-9.2-2.2 1.4-3.3 3.4-3.3 5.4-1.2-.6-1.9-1.7-2.1-2.9C7.2 10 6 12.2 6 15.2 6 18.6 8.4 21 12 21z" /></Icon>
export const ArrowIcon = (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
export const ChevronIcon = (p) => <Icon {...p}><path d="m7 10 5 5 5-5" /></Icon>
export const SparkIcon = (p) => <Icon {...p}><path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2z" /></Icon>
export const PencilIcon = (p) => <Icon {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></Icon>
export const TrashIcon = (p) => <Icon {...p}><path d="M5 7h14M10 7V5h4v2M7 7l1 12.5a1 1 0 0 0 1 .5h6a1 1 0 0 0 1-.5L17 7" /><path d="M10.5 11v5M13.5 11v5" /></Icon>
