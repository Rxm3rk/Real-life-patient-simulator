import { useCallback, useEffect, useRef, useState } from 'react'

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

function getRecognition(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Push-to-talk speech recognition (Chrome, Edge, Safari). */
export function useSpeechRecognition(onFinal: (text: string) => void) {
  const Rec = getRecognition()
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<RecognitionLike | null>(null)
  const finalRef = useRef(onFinal)
  finalRef.current = onFinal

  const start = useCallback(() => {
    if (!Rec) return
    try {
      const r = new Rec()
      r.lang = 'en-GB'
      r.continuous = false
      r.interimResults = true
      r.onresult = (e) => {
        let text = ''
        let final = false
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript
          if (e.results[i].isFinal) final = true
        }
        setInterim(text)
        if (final) {
          finalRef.current(text.trim())
          setInterim('')
        }
      }
      r.onerror = (e) => setError(e.error)
      r.onend = () => setListening(false)
      recRef.current = r
      setError(null)
      setListening(true)
      r.start()
    } catch {
      setListening(false)
    }
  }, [Rec])

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  useEffect(() => () => recRef.current?.abort(), [])

  return { supported: !!Rec, listening, interim, error, start, stop }
}
