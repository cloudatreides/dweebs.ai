export default function AuraIcon({ size = 16, color = '#A78BFA', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer glow ring */}
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1" opacity="0.25" />
      {/* Middle ring */}
      <circle cx="12" cy="12" r="7" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* Inner core */}
      <circle cx="12" cy="12" r="4" fill={color} opacity="0.9" />
      {/* Top energy spike */}
      <path d="M12 2 L13 6 L12 5 L11 6 Z" fill={color} opacity="0.7" />
      {/* Bottom energy spike */}
      <path d="M12 22 L13 18 L12 19 L11 18 Z" fill={color} opacity="0.7" />
      {/* Right energy spike */}
      <path d="M22 12 L18 13 L19 12 L18 11 Z" fill={color} opacity="0.7" />
      {/* Left energy spike */}
      <path d="M2 12 L6 13 L5 12 L6 11 Z" fill={color} opacity="0.7" />
    </svg>
  )
}

export function AuraBadge({ amount, size = 'sm' }) {
  const sizes = {
    sm: { icon: 14, text: 'text-[11px]', px: 'px-2 py-0.5', gap: 'gap-1' },
    md: { icon: 16, text: 'text-xs', px: 'px-2.5 py-1', gap: 'gap-1.5' },
    lg: { icon: 20, text: 'text-sm font-semibold', px: 'px-3 py-1.5', gap: 'gap-2' },
  }
  const s = sizes[size] || sizes.sm

  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.px} rounded-full`}
      style={{ background: '#7C3AED18', border: '1px solid #7C3AED33' }}
    >
      <AuraIcon size={s.icon} />
      <span className={`${s.text} font-medium`} style={{ color: '#A78BFA' }}>
        {typeof amount === 'number' ? amount.toLocaleString() : amount}
      </span>
    </span>
  )
}
