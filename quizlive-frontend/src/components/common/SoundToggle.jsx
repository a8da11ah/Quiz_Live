import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { isSoundOn, toggleSound } from '../../lib/sounds.js'

export default function SoundToggle({ className = '' }) {
  const [on, setOn] = useState(isSoundOn())

  return (
    <button
      type="button"
      onClick={() => setOn(toggleSound())}
      title={on ? 'Sound on' : 'Sound off'}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg
                  bg-gray-800/60 hover:bg-gray-700 border border-gray-700
                  text-gray-300 hover:text-white transition-colors ${className}`}
    >
      {on ? <Volume2 size={14} /> : <VolumeX size={14} />}
    </button>
  )
}
