import { QRCodeSVG } from 'qrcode.react'

export default function QRCode({ value, size = 200, className = '' }) {
  if (!value) return null
  return (
    <div className={`bg-white p-3 rounded-xl inline-block ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        includeMargin={false}
      />
    </div>
  )
}
