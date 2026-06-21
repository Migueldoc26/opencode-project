export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="20,2 37,11 37,29 20,38 3,29 3,11" fill="none" stroke="#dc2626" strokeWidth="2" />
      <polygon points="20,8 31,14 31,26 20,32 9,26 9,14" fill="#dc2626" opacity="0.15" stroke="#dc2626" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="4" fill="#dc2626" />
      <line x1="20" y1="8" x2="20" y2="16" stroke="#dc2626" strokeWidth="1.5" />
      <line x1="20" y1="24" x2="20" y2="32" stroke="#dc2626" strokeWidth="1.5" />
      <line x1="9" y1="20" x2="16" y2="20" stroke="#dc2626" strokeWidth="1.5" />
      <line x1="24" y1="20" x2="31" y2="20" stroke="#dc2626" strokeWidth="1.5" />
    </svg>
  )
}
