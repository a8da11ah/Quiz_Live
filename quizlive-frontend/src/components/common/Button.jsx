import { forwardRef } from 'react'

const variants = {
  primary:   'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/40',
  secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700',
  danger:    'bg-red-600 hover:bg-red-500 text-white',
  ghost:     'hover:bg-white/10 text-gray-300 hover:text-white',
  success:   'bg-emerald-600 hover:bg-emerald-500 text-white',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg font-semibold',
}

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  loading,
  icon: Icon,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {children}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
