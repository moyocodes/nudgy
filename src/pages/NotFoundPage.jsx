import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="text-center">
      <p className="font-display text-2xl">Nothing to poke here.</p>
      <Link to="/" className="mt-2 inline-block underline">Back to the dump</Link>
    </section>
  )
}
