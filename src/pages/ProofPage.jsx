import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore, PROOF_BONUS } from '../lib/store.jsx'
import { Button, Card, ProofBadge } from '../components/ui.jsx'
import { CameraIcon } from '../components/Icons.jsx'

// Prototype photo proof: shows the flow and a fake outline. SAM 3.1 comes later.
export default function ProofPage() {
  const { id } = useParams()
  const { name, tasks, completeTask, updateTask } = useStore()
  const navigate = useNavigate()
  const task = tasks.find((t) => t.id === id)
  // Coming back to a task that already has a photo shows it, rather than an empty uploader.
  const [photo, setPhoto] = useState(task?.photo ?? null)
  const [state, setState] = useState(task?.photo ? 'found' : 'idle') // idle | checking | found

  if (!task) return <p className="text-center">That task wandered off. <Link to="/" className="underline">Home</Link></p>
  const claimed = task.done && task.proof

  // Keep a small JPEG of the photo on the task, so the card (and the poke break) can show it
  // even if the user never finishes the proof.
  function saveThumb(url) {
    const img = new Image()
    img.onload = () => {
      const scale = 240 / Math.max(img.width, img.height)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      updateTask(task.id, { photo: c.toDataURL('image/jpeg', 0.7) })
    }
    img.src = url
  }

  function pick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhoto(url)
    saveThumb(url)
    setState('checking')
    setTimeout(() => setState('found'), 1200)
  }

  function accept() {
    completeTask(task.id, { proof: true })
    navigate('/')
  }

  function skip() {
    completeTask(task.id)
    navigate('/')
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <header>
        <p className="text-sm text-ink/50">{task.title}</p>
        <h1 className="mt-1 font-display text-[1.75rem] leading-tight">Pics or it didn't happen, <em>{name || 'friend'}</em>.</h1>
      </header>

      <Card className="flex flex-col items-center gap-4">
        {photo ? (
          <div className="relative w-full overflow-hidden rounded-2xl">
            <img src={photo} alt="Your proof" className="w-full" />
            {state === 'found' && <ProofBadge complete={claimed} className="absolute left-3 top-3" />}
            {state === 'found' && !claimed && (
              <label className="absolute bottom-3 right-3 cursor-pointer rounded-full bg-surface/90 px-3 py-1.5 text-xs font-semibold shadow-card backdrop-blur">
                Retake
                <input type="file" accept="image/*" capture="environment" onChange={pick} className="sr-only" />
              </label>
            )}
            {state === 'found' && (
              <div className="pointer-events-none absolute inset-[18%] rounded-[40%] border-4 border-dashed border-success bg-success/15" />
            )}
            {state === 'checking' && (
              <div className="absolute inset-0 grid place-items-center bg-ink/40 font-display text-xl text-on-primary">
                Squinting at it…
              </div>
            )}
          </div>
        ) : (
          <label className="grid aspect-square w-full cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-ink/15 bg-bg text-center">
            <span>
              <CameraIcon size={36} className="mx-auto text-primary" />
              <span className="mt-2 block font-display text-xl">Snap proof</span>
              <span className="block text-sm text-ink/50">+{PROOF_BONUS} bonus points</span>
            </span>
            <input type="file" accept="image/*" capture="environment" onChange={pick} className="sr-only" />
          </label>
        )}

        {state === 'found' && (
          <p className="pop-in text-center font-display text-lg">
            {claimed ? `Proof accepted. +${PROOF_BONUS} banked.` : 'Found it. Fridge is no longer a museum of condiments.'}
          </p>
        )}
      </Card>

      {claimed ? (
        <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
      ) : state === 'found' ? (
        <Button onClick={accept}>Claim +{PROOF_BONUS} bonus</Button>
      ) : (
        <Button variant="ghost" onClick={skip}>Skip proof (no bonus)</Button>
      )}
    </div>
  )
}
