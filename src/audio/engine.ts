import { useSettings } from '../store/settings'

/**
 * Everything audible in the simulator is synthesised with the Web Audio API —
 * no audio files. Percussion notes, bowel sounds, bruits and monitor beeps are
 * modelled on their real acoustic character.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    try {
      ctx = new AC()
    } catch {
      return null
    }
    master = ctx.createGain()
    master.gain.value = useSettings.getState().volume
    master.connect(ctx.destination)
    useSettings.subscribe((st) => {
      if (master) master.gain.value = st.volume
    })
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function unlockAudio() {
  ac()
}

const enabled = () => useSettings.getState().sound

function noise(c: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf
  const len = c.sampleRate * 2
  const b = c.createBuffer(1, len, c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  noiseBuf = b
  return b
}

function env(_c: AudioContext, g: GainNode, t: number, attack: number, peak: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

/* ------------------------------ Percussion ------------------------------ */

export type PercNote = 'resonant' | 'tympanic' | 'dull' | 'stony' | 'hyperresonant'

export function playPercussion(note: PercNote) {
  if (!enabled()) return
  const c = ac()
  if (!c || !master) return
  const t = c.currentTime + 0.01
  const out = c.createGain()
  out.connect(master)

  // finger strike transient
  const click = c.createBufferSource()
  click.buffer = noise(c)
  const hp = c.createBiquadFilter()
  hp.type = 'bandpass'
  hp.frequency.value = 2400
  hp.Q.value = 0.8
  const cg = c.createGain()
  env(c, cg, t, 0.001, 0.25, 0.018)
  click.connect(hp).connect(cg).connect(out)
  click.start(t, Math.random())
  click.stop(t + 0.05)

  const spec = {
    tympanic: { f: 230, decay: 0.32, q: 9, body: 0.55, noise: 0.18, lp: 1400 },
    resonant: { f: 120, decay: 0.28, q: 4, body: 0.5, noise: 0.35, lp: 700 },
    hyperresonant: { f: 95, decay: 0.42, q: 5, body: 0.6, noise: 0.3, lp: 600 },
    dull: { f: 170, decay: 0.07, q: 1.5, body: 0.35, noise: 0.25, lp: 520 },
    stony: { f: 200, decay: 0.035, q: 1, body: 0.25, noise: 0.2, lp: 450 },
  }[note]

  // resonant body — a damped oscillator through a band-pass
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(spec.f * 1.08, t)
  osc.frequency.exponentialRampToValueAtTime(spec.f, t + 0.04)
  const og = c.createGain()
  env(c, og, t, 0.003, spec.body, spec.decay)
  osc.connect(og).connect(out)
  osc.start(t)
  osc.stop(t + spec.decay + 0.1)

  if (note === 'tympanic') {
    const h = c.createOscillator()
    h.type = 'sine'
    h.frequency.value = spec.f * 2.02
    const hg = c.createGain()
    env(c, hg, t, 0.003, spec.body * 0.25, spec.decay * 0.7)
    h.connect(hg).connect(out)
    h.start(t)
    h.stop(t + spec.decay)
  }

  // filtered noise gives the "thud" texture
  const n = c.createBufferSource()
  n.buffer = noise(c)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = spec.f
  bp.Q.value = spec.q
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = spec.lp
  const ng = c.createGain()
  env(c, ng, t, 0.002, spec.noise * 3, spec.decay * 0.9)
  n.connect(bp).connect(lp).connect(ng).connect(out)
  n.start(t, Math.random())
  n.stop(t + spec.decay + 0.1)
}

/* ------------------------------ Stethoscope ------------------------------ */

export type Listen = 'bowel:normal' | 'bowel:hyperactive' | 'bowel:tinkling' | 'bowel:reduced' | 'bowel:absent' | 'bruit' | 'quiet'

interface LoopHandle {
  stop: () => void
}

/** Continuous stethoscope soundscape until stop() is called. */
export function startListening(kind: Listen, hr = 80): LoopHandle {
  const c = ac()
  if (!c || !master || !enabled()) return { stop: () => {} }
  const out = c.createGain()
  out.gain.value = 0.9
  out.connect(master)

  // stethoscope "room tone": low rumble of skin contact and blood flow
  const bed = c.createBufferSource()
  bed.buffer = noise(c)
  bed.loop = true
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 180
  const bg = c.createGain()
  bg.gain.value = 0.05
  bed.connect(lp).connect(bg).connect(out)
  bed.start()

  let alive = true
  const timers: number[] = []
  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => alive && fn(), ms)
    timers.push(id)
  }

  const gurgle = (loud: number, pitch: number, len: number) => {
    const t = c.currentTime + 0.02
    const bursts = Math.max(3, Math.round(len * 14))
    for (let i = 0; i < bursts; i++) {
      const st = t + (i / bursts) * len + Math.random() * 0.03
      const s = c.createBufferSource()
      s.buffer = noise(c)
      const f = c.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = pitch * (0.7 + Math.random() * 0.8)
      f.Q.value = 6 + Math.random() * 6
      const g = c.createGain()
      env(c, g, st, 0.01, loud * (0.4 + Math.random() * 0.6), 0.05 + Math.random() * 0.08)
      s.connect(f).connect(g).connect(out)
      s.start(st, Math.random())
      s.stop(st + 0.2)
    }
  }
  const tinkle = () => {
    const t = c.currentTime + 0.02
    const n = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) {
      const st = t + i * (0.07 + Math.random() * 0.08)
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = 1100 + Math.random() * 1300
      const g = c.createGain()
      env(c, g, st, 0.002, 0.12, 0.09)
      o.connect(g).connect(out)
      o.start(st)
      o.stop(st + 0.15)
    }
  }
  const heart = () => {
    // faint transmitted heart sounds
    const t = c.currentTime + 0.02
    for (const [dt, f, a] of [
      [0, 55, 0.18],
      [0.32, 70, 0.13],
    ] as const) {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const g = c.createGain()
      env(c, g, t + dt, 0.005, a, 0.09)
      o.connect(g).connect(out)
      o.start(t + dt)
      o.stop(t + dt + 0.15)
    }
  }
  const whoosh = () => {
    const t = c.currentTime + 0.02
    const s = c.createBufferSource()
    s.buffer = noise(c)
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 380
    f.Q.value = 1.2
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.09)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34)
    s.connect(f).connect(g).connect(out)
    s.start(t, Math.random())
    s.stop(t + 0.4)
  }

  const beat = 60000 / Math.max(40, hr)
  const loopHeart = () => {
    if (kind === 'bruit') whoosh()
    else heart()
    schedule(loopHeart, beat)
  }
  if (kind === 'bruit' || kind === 'quiet' || kind === 'bowel:absent') loopHeart()

  const loopBowel = () => {
    if (kind === 'bowel:normal') {
      gurgle(0.5, 380, 0.4 + Math.random() * 0.8)
      schedule(loopBowel, 2500 + Math.random() * 6000)
    } else if (kind === 'bowel:hyperactive') {
      gurgle(0.8, 300, 1 + Math.random() * 1.6)
      schedule(loopBowel, 700 + Math.random() * 1400)
    } else if (kind === 'bowel:tinkling') {
      if (Math.random() < 0.35) gurgle(0.9, 260, 1.2)
      else tinkle()
      schedule(loopBowel, 1400 + Math.random() * 2600)
    } else if (kind === 'bowel:reduced') {
      gurgle(0.25, 420, 0.3)
      schedule(loopBowel, 9000 + Math.random() * 9000)
    }
  }
  if (kind.startsWith('bowel:') && kind !== 'bowel:absent') schedule(loopBowel, 600)

  return {
    stop: () => {
      alive = false
      timers.forEach((id) => window.clearTimeout(id))
      const t = c.currentTime
      out.gain.setTargetAtTime(0.0001, t, 0.05)
      window.setTimeout(() => {
        try {
          bed.stop()
          out.disconnect()
        } catch {
          /* already stopped */
        }
      }, 300)
    },
  }
}

/* ------------------------------ Monitor ------------------------------ */

/** Bedside monitor QRS beep — pitch drops as saturation falls, like real monitors. */
export function monitorBeep(spo2: number) {
  if (!enabled()) return
  const c = ac()
  if (!c || !master) return
  const t = c.currentTime + 0.005
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.value = 880 - Math.max(0, 100 - spo2) * 18
  const g = c.createGain()
  env(c, g, t, 0.004, 0.08, 0.09)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.12)
}

export function uiTick(kind: 'soft' | 'success' | 'warn' = 'soft') {
  if (!enabled()) return
  const c = ac()
  if (!c || !master) return
  const t = c.currentTime + 0.005
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.value = kind === 'success' ? 988 : kind === 'warn' ? 330 : 660
  const g = c.createGain()
  env(c, g, t, 0.004, 0.05, kind === 'success' ? 0.25 : 0.08)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.3)
  if (kind === 'success') {
    const o2 = c.createOscillator()
    o2.frequency.value = 1318
    const g2 = c.createGain()
    env(c, g2, t + 0.09, 0.004, 0.05, 0.3)
    o2.connect(g2).connect(master)
    o2.start(t + 0.09)
    o2.stop(t + 0.5)
  }
}

/* ------------------------------ Voice ------------------------------ */

let voices: SpeechSynthesisVoice[] = []
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const load = () => (voices = window.speechSynthesis.getVoices())
  load()
  window.speechSynthesis.addEventListener?.('voiceschanged', load)
}

export function speak(text: string, sex: 'male' | 'female', age: number) {
  if (!useSettings.getState().patientVoice || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text.replace(/[—–]/g, ', '))
    const en = voices.filter((v) => v.lang.startsWith('en'))
    const gb = en.filter((v) => v.lang === 'en-GB')
    const pool = gb.length ? gb : en
    const femaleNames = /female|woman|samantha|victoria|karen|serena|moira|fiona|kate|susan|zira|hazel|libby|sonia|emma|amy/i
    const maleNames = /male|daniel|george|arthur|oliver|alex|fred|thomas|david|mark|ryan|guy|james/i
    const match = pool.find((v) => (sex === 'female' ? femaleNames.test(v.name) : maleNames.test(v.name) && !femaleNames.test(v.name)))
    if (match) u.voice = match
    else if (pool[0]) u.voice = pool[0]
    u.pitch = sex === 'female' ? 1.1 : 0.85
    u.rate = age > 70 ? 0.88 : age > 50 ? 0.95 : 1
    u.volume = Math.min(1, useSettings.getState().volume + 0.1)
    window.speechSynthesis.speak(u)
  } catch {
    /* speech unavailable */
  }
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* ignore */
  }
}
