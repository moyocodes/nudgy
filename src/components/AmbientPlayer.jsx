import { useEffect } from 'react'
import { useStore } from '../lib/store.jsx'
import { playAmbient, resumeAmbient, setAmbientVolume, stopAmbient } from '../lib/ambient.js'
import { updateMusicVolume } from '../lib/music.js'
import { AMBIENT_LEVEL, setVolumeLevel } from '../lib/volume.js'

// Keeps the chosen background sound playing on every page, and applies the one volume to all sounds. Renders nothing.
export default function AmbientPlayer() {
  const { ambient, volume } = useStore()
  setVolumeLevel(volume)

  useEffect(() => {
    if (!ambient) return stopAmbient()
    playAmbient(ambient, AMBIENT_LEVEL * volume)
    // Sound can't start until the user taps once after a reload; pick it up then.
    const wake = () => resumeAmbient()
    window.addEventListener('pointerdown', wake)
    return () => {
      window.removeEventListener('pointerdown', wake)
      stopAmbient()
    }
  }, [ambient]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setAmbientVolume(AMBIENT_LEVEL * volume)
    updateMusicVolume()
  }, [volume])

  return null
}
