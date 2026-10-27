// Streams the mic to /api/asr (server relays to Muse Voice Transcribe).
// Calls onPartial(text) while a phrase is in progress and onFinal(text) when it completes.
export async function startTranscribing({ onPartial, onFinal, onError, onEnd }) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } })
  const ctx = new AudioContext({ sampleRate: 16000 })
  await ctx.audioWorklet.addModule('/pcm-worklet.js')
  const source = ctx.createMediaStreamSource(stream)
  const worklet = new AudioWorkletNode(ctx, 'pcm-worklet')
  source.connect(worklet)

  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}/api/asr`)
  ws.binaryType = 'arraybuffer'

  worklet.port.onmessage = (e) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(e.data)
  }

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.type === 'transcript') onPartial(msg.transcript)
    else if (msg.type === 'speechComplete') onFinal(msg.transcript)
    else if (msg.type === 'error') onError?.(msg.message)
  }

  let stopped = false
  function cleanup() {
    if (stopped) return
    stopped = true
    worklet.port.onmessage = null
    source.disconnect()
    stream.getTracks().forEach((t) => t.stop())
    ctx.close()
    onEnd?.()
  }
  ws.onclose = cleanup
  ws.onerror = () => onError?.('Lost connection to the transcriber')

  return function stop() {
    // Give the server a moment to finish the last phrase before closing.
    worklet.port.onmessage = null
    setTimeout(() => ws.close(), 800)
  }
}
