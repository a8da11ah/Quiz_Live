import { forwardRef } from 'react'

const Input = forwardRef(({
  label,
  error,
  hint,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`
          w-full rounded-lg border bg-gray-900 px-3 py-2 text-white placeholder-gray-500
          focus:outline-none focus:ring-2 transition-colors
          ${error
            ? 'border-red-500 focus:ring-red-500/40'
            : 'border-gray-700 focus:border-brand-500 focus:ring-brand-500/30'
          }
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
