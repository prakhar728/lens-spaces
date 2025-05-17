export function LensSpacesLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="10" fill="#8B5CF6" fillOpacity="0.2" />
      <circle cx="12" cy="12" r="6" fill="#8B5CF6" />
      <circle cx="12" cy="12" r="3" fill="white" />
    </svg>
  )
}
