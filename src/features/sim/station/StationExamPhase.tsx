import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Layers, Lightbulb, ListChecks, MapPin, X } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { speak, uiTick, type DopplerKind, type Listen } from '../../../audio/engine'
import type { Pt } from '../../../anatomy/geometry'
import { Button } from '../../../components/ui/Button'
import { Segmented } from '../../../components/ui/primitives'
import { Sheet } from '../../../components/ui/Sheet'
import { toast, useToasts } from '../../../components/ui/Toast'
import { abdoFindings } from '../../../engine/abdo'
import { protocolFor } from '../../../engine/protocols'
import type { ProtocolStep, StepCtx } from '../../../engine/protocols/abdominal'
import { isClinic } from '../../../engine/setting'
import { stationActions, stationFor, type StationAction, type StationCue } from '../../../engine/stations'
import type { CaseDef, LegSide, Observation, PulseGrade } from '../../../engine/types'
import { useMediaQuery } from '../../../lib/hooks'
import { cn } from '../../../lib/utils'
import { use3dPatients } from '../../../lib/webgl'
import { useEncounter } from '../../../store/encounter'
import { useSettings } from '../../../store/settings'
import { ActionButton, FindingStrip, FindingsLog, GuidePanel } from '../exam/panels'
import type { Effect, EffectKind } from '../exam/Stage'
import { ListenTask, ManoeuvreCaption, PulseTask } from '../exam/tasks'
import { FaceCam } from '../FaceCam'
import { monitorLabel, VitalsMonitor } from '../VitalsMonitor'
import { has3dStation } from './has3d'
import { sceneFor } from './scenes'
import { StationCanvas } from './StationCanvas'
import { BuergerTask, DopplerTask, PulseFeel, TourniquetTask } from './tasks'
import { lastIndex, type CueState, type SceneCtx, type SceneExtra, type Zone } from './types'

// three.js and the 3D patient load only when they're used
const StationStage3D = lazy(() => import('./StationStage3D'))

type STask =
  | { kind: 'pulse'; action: string }
  | { kind: 'script'; action: string; steps: string[]; cue?: StationCue; cueAt: 'start' | 'end' }
  | { kind: 'listen'; action: string; sound: Listen; label: string }
  | { kind: 'doppler'; action: string; mode: DopplerKind; venous: boolean; reflux: boolean; label: string }
  | { kind: 'buerger' }
  | { kind: 'tourniquet' }

const taskAction = (t: STask) => (t.kind === 'buerger' ? 'art.buerger' : t.kind === 'tourniquet' ? 'ven.tourniquet' : t.action)

/** How long each visual cue plays (ms). */
const CUE_MS: Partial<Record<StationCue, number>> = {
  cough: 1500,
  swallow: 1800,
  tongue: 2800,
  tremor: 4200,
  'lid-lag': 3400,
  transilluminate: 4000,
  eyes: 3000,
  pemberton: 3800,
  measure: 3600,
  'deep-ring': 1900,
  reduce: 1300,
  'arms-side': 2600,
  'hands-hips': 2800,
  'arms-up': 3000,
}

/** Spoken instructions and manoeuvres, shown as captions while they happen. */
const SCRIPTS: Record<string, { steps: string[]; cueAt?: 'start' | 'end' }> = {
  'groin.coughLook': { steps: ['“Could you turn your head and cough for me?”'] },
  'groin.coughFeel': { steps: ['Fingers over the swelling…', '“And another cough, please.”'] },
  'groin.reduce': { steps: ['“Can you push the lump back in for me?”', 'The swelling slips back into the abdomen…'] },
  'groin.deepRing': { steps: ['Hernia reduced — two fingers pressing over the deep ring…', '“Now give me a big cough.”'] },
  'groin.release': { steps: ['Releasing the pressure over the deep ring…', '“Cough again, please.”'] },
  'groin.getAbove': { steps: ['Feeling at the neck of the swelling, above the testis…'] },
  'scr.cough': { steps: ['Fingers around the neck of the scrotum…', '“Cough for me, please.”'] },
  'scr.lie': { steps: ['“Could you lie back on the couch now?”'] },
  'scr.transilluminate': { steps: ['Lights dimmed…', 'Pen torch pressed against the side of the swelling…'], cueAt: 'start' },
  'scr.cremasteric': { steps: ['Stroking the upper inner thigh…', 'Watching the testis on that side…'] },
  'lump.measure': { steps: ['Tape measure across the widest diameter…', '…and at right angles to it.'], cueAt: 'start' },
  'lump.transilluminate': { steps: ['Lights dimmed…', 'Pen torch pressed against the side of the lump…'], cueAt: 'start' },
  'lump.fluctuation': { steps: ['Two fingers on opposite sides of the lump…', 'Pressing gently in the middle — do the fingers move apart?', '…and again at right angles.'] },
  'lump.slip': { steps: ['Pressing gently on the edge of the lump…', '…does the edge slip away from under your finger?'] },
  'lump.deep': { steps: ['“Tense the muscle underneath for me…”', 'Trying to move the lump again…'] },
  'thy.swallow': { steps: ['“Take a sip of water and hold it in your mouth…”', '“…now swallow.”'] },
  'thy.tongue': { steps: ['“Stick your tongue out for me, please.”'] },
  'thy.palpate': { steps: ['Standing behind the patient, neck slightly flexed…', 'Fingertips over each lobe and the isthmus…', '“Take another sip… and swallow.”'] },
  'thy.tremor': { steps: ['“Hold your arms straight out in front of you…”', 'A sheet of paper laid across the backs of the hands…', 'Watching for a fine tremor…'], cueAt: 'start' },
  'thy.eyes': { steps: ['Looking from the front…', '…from the side…', '…and from above, standing behind the patient.'], cueAt: 'start' },
  'thy.lidlag': { steps: ['“Keep your head still and follow my finger…”', 'Moving the finger slowly from high to low…', 'Watching the upper lids…'], cueAt: 'start' },
  'thy.eom': { steps: ['“Follow my finger with your eyes — tell me if you see double.”', 'Tracing a large “H”…'] },
  'thy.pemberton': { steps: ['“Raise both arms above your head and keep them there…”', 'Watching the face and neck veins for a minute…'], cueAt: 'start' },
  'thy.proximal': { steps: ['“Cross your arms over your chest and stand up from the chair.”'] },
  'thy.nodes': { steps: ['From behind: submental, submandibular, pre-auricular…', '…along the sternocleidomastoid, posterior triangle, supraclavicular.'] },
  'br.inspectSide': { steps: ['“Sit with your arms relaxed by your sides.”', 'Looking at both breasts from the front…'], cueAt: 'start' },
  'br.inspectHips': { steps: ['“Press your hands firmly into your hips for me.”', 'Watching for tethering as the pectorals tense…'], cueAt: 'start' },
  'br.inspectUp': { steps: ['“Now raise both arms above your head.”', 'Looking under the breasts and at the axillae…'], cueAt: 'start' },
  'br.palpNormal': { steps: ['Patient reclined to 45°, hand behind the head…', 'Flat of the fingers, quadrant by quadrant…', '…including the axillary tail.'] },
  'br.palpAffected': { steps: ['Now the other side, same technique…', 'Quadrant by quadrant, then behind the areola…', '…and the axillary tail.'] },
  'br.fixity': { steps: ['Holding the lump between finger and thumb…', '“Press your hands into your hips…”', 'Does it still move?'], cueAt: 'start' },
  'br.axillaR': { steps: ['Supporting the patient’s right arm at the elbow…', 'Apical, central, anterior, posterior and lateral groups…'] },
  'br.axillaL': { steps: ['Supporting the patient’s left arm at the elbow…', 'Apical, central, anterior, posterior and lateral groups…'] },
  'art.popliteal': { steps: ['Knee flexed to about 30°, thumbs on the tibial tuberosity…', 'Fingertips pressing deep into the popliteal fossa…'] },
  'art.temp': { steps: ['Backs of the hands running down both legs together…', '…comparing one side with the other.'] },
  'art.crt': { steps: ['Pressing on the pulp of the big toe for 5 seconds…', 'Release — counting until the colour returns…'] },
  'art.sensation': { steps: ['Cotton wool, then a 10 g monofilament…', 'Comparing both feet…'] },
  'ven.back': { steps: ['“Could you turn round to face the wall for me?”'] },
  'ven.tap': { steps: ['Fingers of one hand resting over the SFJ…', 'Tapping the varicosity lower down the leg…'] },
  'ven.cough': { steps: ['Fingers over the saphenofemoral junction…', '“Cough for me, please.”'] },
  'ven.oedema': { steps: ['Pressing firmly over the medial malleolus for 10 seconds…'] },
}

/** Pulse-feeling actions and which pulse they are on the leg. */
const LEG_PULSE: Record<string, keyof NonNullable<LegSide['pulses']>> = {
  'art.femoral': 'femoral',
  'art.popliteal': 'popliteal',
  'art.pt': 'pt',
  'art.dp': 'dp',
  'ven.pulses': 'dp',
}

const PREP = ['comm.wash', 'comm.intro', 'comm.identity', 'comm.consent', 'comm.chaperone', 'comm.pain', 'comm.position', 'comm.expose']

let effectSeq = 1
let welcomed = ''
let welcomeTip = ''
/** The opening tip has done its job once you start examining: clear it off the stage. */
const clearWelcome = () => {
  if (welcomeTip) useToasts.getState().dismiss(welcomeTip)
  welcomeTip = ''
}

export default function StationExamPhase({ c, onNext }: { c: CaseDef; onNext?: () => void }) {
  const def = stationFor(c.exam)!
  const A = stationActions(def)
  const s = useEncounter((st) => st.s)!
  const perform = useEncounter((st) => st.perform)
  const setPulseEstimate = useEncounter((st) => st.setPulseEstimate)
  const useHint = useEncounter((st) => st.useHint)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const learn = s.mode === 'learn'
  const acute = !isClinic(c.setting)
  const patients3d = useSettings((st) => st.patients3d)
  const [fail3d, setFail3d] = useState(false)
  const use3d = !fail3d && has3dStation(c.exam) && use3dPatients(patients3d)

  const [view, setView] = useState(def.views[0].id)
  const [cue, setCue] = useState<CueState>({ kind: null, key: 0 })
  const cueKey = useRef(0)
  const [effects, setEffects] = useState<Effect[]>([])
  const [reaction, setReaction] = useState({ wince: 0, key: 0, says: undefined as string | undefined })
  const [wince, setWince] = useState(0)
  const [task, setTask] = useState<STask | null>(null)
  const [extra, setExtraState] = useState<SceneExtra>({})
  const [tab, setTab] = useState<'actions' | 'findings' | 'guide'>(learn ? 'guide' : 'actions')
  const [highlight, setHighlight] = useState<string | null>(null)
  const [latest, setLatest] = useState<{ label: string; obs: Observation; key: number } | null>(null)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [showZones, setShowZones] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [monitorOpen, setMonitorOpen] = useState(false)

  const did = useCallback((id: string) => s.log.some((e) => e.action === id), [s.log])
  const exposed = lastIndex(s.log, ['comm.expose']) > lastIndex(s.log, ['comm.thank'])
  const f = useMemo(() => abdoFindings(c), [c])
  const ctx: StepCtx = useMemo(() => ({ c, f, log: s.log, asked: new Set(s.asked), ordered: new Set(s.ordered) }), [c, f, s.log, s.asked, s.ordered])
  const proto = protocolFor(c.exam)
  const basePain = ((c.vitals.pain ?? 0) / 10) * (s.analgesia ? 0.55 : 1)
  const available = (a: StationAction) => !a.sex || a.sex === c.patient.sex

  /** Update transient scene state, skipping no-op updates (called every animation frame by some tasks). */
  const setExtra = useCallback((patch: Partial<SceneExtra>) => {
    setExtraState((cur) => {
      let changed = false
      for (const k of Object.keys(patch) as (keyof SceneExtra)[]) {
        const a = JSON.stringify(cur[k])
        const b = JSON.stringify(patch[k])
        if (a !== b) changed = true
      }
      return changed ? { ...cur, ...patch } : cur
    })
  }, [])

  useEffect(() => {
    if (s.log.length === 0 && s.mode !== 'osce' && welcomed !== s.attemptId) {
      welcomed = s.attemptId
      welcomeTip = toast({
        tone: 'tip',
        title: def.title,
        body: def.intimate
          ? 'This is an intimate examination: clean your hands, introduce yourself, explain, gain consent and offer a chaperone before you touch.'
          : 'Clean your hands, introduce yourself, confirm identity, explain, gain consent and expose appropriately before you touch.',
        duration: 7000,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!reaction.key || reaction.wince <= 0) return
    setWince(reaction.wince)
    const id = window.setTimeout(() => setWince(0), 1200)
    return () => window.clearTimeout(id)
  }, [reaction.key, reaction.wince])

  const sceneCtx: SceneCtx = { c, def, view, log: s.log, exposed, cue, pain: basePain, wince, learn, compact: !desktop, extra }
  const spec = sceneFor(sceneCtx)

  const addEffect = (kind: EffectKind, at: Pt, label?: string, ms = 1100) => {
    const id = effectSeq++
    setEffects((e) => [...e, { id, kind, at, label }])
    window.setTimeout(() => setEffects((e) => e.filter((x) => x.id !== id)), ms)
  }

  const playCue = (k: StationCue, ms = CUE_MS[k]) => {
    const key = ++cueKey.current
    setCue({ kind: k, key })
    if (ms) window.setTimeout(() => setCue((cur) => (cur.key === key ? { kind: null, key } : cur)), ms)
  }

  const react = (obs: Observation) => {
    if ((obs.reaction ?? 0) > 0 || obs.says) {
      setReaction((r) => ({ wince: obs.reaction ?? 0, key: r.key + 1, says: obs.says }))
      if (obs.says) speak(obs.says, c.patient.sex, c.patient.age)
    }
  }

  const mediaOf = (id: string) => c.keyed?.[id]?.media ?? def.normal[id]?.media

  const run = (action: string): Observation | null => {
    const a = A[action]
    const before = new Set(proto.rules.filter((r) => r.violated(ctx)).map((r) => r.id))
    const obs = perform(action)
    if (!obs) return null
    react(obs)
    if (!action.startsWith('comm.')) setLatest({ label: a?.label ?? action, obs, key: Date.now() })
    else if (obs.says) setLatest({ label: a?.label ?? action, obs: { text: obs.text }, key: Date.now() })
    uiTick('soft')
    if (highlight === action) setHighlight(null)
    if (learn) {
      const nextCtx: StepCtx = { ...ctx, log: [...ctx.log, { action, t: Date.now() }] }
      for (const r of proto.rules.filter((r) => !before.has(r.id) && r.violated(nextCtx))) toast({ tone: 'warning', title: 'Sequence tip', body: r.message, duration: 6000 })
    }
    return obs
  }

  const pulseGrade = (action: string, zoneId?: string): { grade: PulseGrade; at: Pt | null } => {
    const legs = c.visual?.legs
    const key = LEG_PULSE[action]
    const worse = (r?: PulseGrade, l?: PulseGrade) => {
      const rank = { absent: 0, weak: 1, normal: 2, prominent: 3 }
      return rank[r ?? 'normal'] <= rank[l ?? 'normal'] ? 'right' : 'left'
    }
    const side = zoneId?.endsWith('L') ? 'left' : zoneId?.endsWith('R') ? 'right' : worse(legs?.right.pulses?.[key], legs?.left.pulses?.[key])
    const grade = legs?.[side]?.pulses?.[key] ?? 'normal'
    const z = spec.zones.find((z) => z.actions.includes(action) && (zoneId ? z.id === zoneId : z.id.endsWith(side === 'left' ? 'L' : 'R')))
    return { grade, at: z?.at ?? null }
  }

  const onAction = (id: string, at?: Pt, zoneId?: string) => {
    const a = A[id]
    if (!a) return
    clearWelcome()
    // pressing the manoeuvre that is already playing just finishes it; a panel already open for this action stays open
    if (task?.kind === 'script' && task.action === id) return completeScript(task)
    if (task && taskAction(task) === id) return
    endTask()
    if (a.view !== 'any' && a.view !== view && def.views.some((v) => v.id === a.view)) setView(a.view)
    if (a.contact && !exposed) {
      toast({ tone: 'warning', title: 'Not exposed yet', body: 'Explain, gain consent and expose the patient appropriately first (Before you start → Expose).' })
      return
    }
    // interactive tasks
    if (id === 'thy.pulse' || id === 'art.radial') return setTask({ kind: 'pulse', action: id })
    if (id === 'art.buerger') {
      setView('buerger')
      return setTask({ kind: 'buerger' })
    }
    if (id === 'ven.tourniquet') return setTask({ kind: 'tourniquet' })
    if (id === 'ven.doppler') return setTask({ kind: 'doppler', action: id, mode: 'venous', venous: true, reflux: mediaOf(id) === 'doppler:reflux', label: 'Handheld Doppler at the SFJ' })
    if (id === 'complete.abpi') {
      const m = mediaOf(id)?.replace('doppler:', '') as DopplerKind | undefined
      return setTask({ kind: 'doppler', action: id, mode: m && ['triphasic', 'biphasic', 'monophasic', 'absent'].includes(m) ? m : 'triphasic', venous: false, reflux: false, label: 'ABPI — handheld Doppler at the ankle' })
    }
    if (id === 'thy.bruit' || id === 'art.bruit' || id === 'lump.auscultate' || id === 'groin.auscultate') {
      const m = mediaOf(id)
      const sound: Listen = m === 'bruit' ? 'bruit' : m?.startsWith('bowel:') ? (m as Listen) : 'quiet'
      return setTask({ kind: 'listen', action: id, sound, label: a.label })
    }
    // feeling a pulse on the leg
    if (LEG_PULSE[id]) {
      const { grade, at: where } = pulseGrade(id, zoneId)
      const point = at ?? where
      if (point) {
        setExtra({ feel: { at: point, grade, key: Date.now() } })
        window.setTimeout(() => {
          setExtra({ feel: undefined })
          run(id)
        }, 2600)
        return
      }
    }
    const script = SCRIPTS[id]
    if (script) {
      const cueAt = script.cueAt ?? 'end'
      if (a.cue && cueAt === 'start') playCue(a.cue, Math.max(CUE_MS[a.cue] ?? 0, script.steps.length * 1050 + 900))
      if (at) addEffect('press', at, undefined, 1400)
      return setTask({ kind: 'script', action: id, steps: script.steps, cue: a.cue, cueAt })
    }
    if (at && a.contact) addEffect(a.cue === 'press' ? 'deep' : 'press', at)
    const obs = run(id)
    if (obs && a.cue && a.cue !== 'expose' && a.cue !== 'stand' && a.cue !== 'lie') playCue(a.cue)
  }

  const completeScript = (t: Extract<STask, { kind: 'script' }>) => {
    setTask(null)
    run(t.action)
    if (t.cue && t.cueAt === 'end' && t.cue !== 'stand' && t.cue !== 'lie') playCue(t.cue)
  }

  const onScriptDone = useCallback(() => {
    if (task?.kind === 'script') completeScript(task)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task])

  /**
   * A new action never waits on the last one: a manoeuvre still playing
   * completes at once, and a task panel is ended as its close button would
   * (the stethoscope is lifted and counts; an unfinished pulse count,
   * Doppler, Buerger's or tourniquet test is put down).
   */
  const endTask = () => {
    const t = task
    if (!t) return
    if (t.kind === 'script') return completeScript(t)
    setTask(null)
    if (t.kind === 'listen') run(t.action)
    if (t.kind === 'buerger') setExtra({ buerger: undefined })
    if (t.kind === 'tourniquet') setExtra({ veinFill: undefined, tourniquet: false })
  }

  const onZone = (z: Zone, pt: Pt) => {
    const pick = z.actions.find((id) => A[id] && available(A[id]) && !did(id)) ?? z.actions[0]
    onAction(pick, z.at, z.id)
    if (!A[pick]?.contact) addEffect('tap', pt)
  }

  const nextStep = proto.steps.find((st) => {
    if (st.applies && !st.applies(ctx)) return false
    const d = st.done(ctx)
    return (typeof d === 'number' ? d : d ? 1 : 0) < 0.99
  })

  const goStep = (st: ProtocolStep) => {
    const a = st.action ? A[st.action] : undefined
    if (a && a.view !== 'any' && def.views.some((v) => v.id === a.view)) setView(a.view)
    if (st.action) setHighlight(st.action)
    if (!desktop) setTab('actions')
  }

  const hint = () => {
    if (!nextStep) {
      toast({ tone: 'success', title: 'Nothing obvious missing', body: 'Complete the examination and move on.' })
      return
    }
    useHint()
    toast({ tone: 'tip', title: `Hint: ${nextStep.label}`, body: nextStep.why, duration: 7000 })
    goStep(nextStep)
  }

  /* ---------------------------- action groups ---------------------------- */

  const groups = useMemo(() => {
    const out: { title: string; ids: string[] }[] = []
    for (const a of def.actions) {
      if (a.id.startsWith('comm.') || a.group === 'Completion' || !available(a)) continue
      let g = out.find((x) => x.title === a.group)
      if (!g) out.push((g = { title: a.group, ids: [] }))
      g.ids.push(a.id)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def])
  const finishing = ['comm.thank', 'comm.wash', ...def.actions.filter((a) => a.group === 'Completion' && a.id.startsWith('complete.')).map((a) => a.id)]
  const viewOf = (id: string) => A[id]?.view

  const actionsPanel = (
    <div className="space-y-5">
      <Group title="Before you start">
        <div className="grid grid-cols-2 gap-1.5">
          {PREP.map((id) => (
            <ActionButton key={id} id={id} label={A[id]?.label} short={A[id]?.short} compact done={did(id)} highlight={highlight === id} onClick={() => onAction(id)} />
          ))}
        </div>
      </Group>
      {groups.map((g) => {
        const here = g.ids.some((id) => viewOf(id) === view || viewOf(id) === 'any')
        // buttons for another view work all the same (they switch to it), so they look it: name the view instead of fading them
        const other = def.views.length > 1 && !here ? def.views.find((v) => v.id === viewOf(g.ids[0]))?.label : undefined
        return (
          <Group key={g.title} title={g.title} note={other}>
            <div className="grid grid-cols-2 gap-1.5">
              {g.ids.map((id) => (
                <ActionButton key={id} id={id} label={A[id].label} short={A[id].short} compact done={did(id)} highlight={highlight === id} onClick={() => onAction(id)} />
              ))}
            </div>
          </Group>
        )
      })}
      <Group title="Finishing">
        <div className="grid grid-cols-2 gap-1.5">
          {finishing.map((id, i) => (
            <ActionButton
              key={`${id}${i}`}
              id={id}
              label={id === 'comm.wash' ? 'Clean your hands afterwards' : A[id]?.label}
              short={id === 'comm.wash' ? 'Hand hygiene' : A[id]?.short}
              compact
              done={id === 'comm.wash' ? false : did(id)}
              highlight={highlight === id}
              onClick={() => onAction(id)}
            />
          ))}
        </div>
      </Group>
    </div>
  )

  const findings = (
    <FindingsLog
      s={s}
      mode={s.mode}
      revealed={revealed}
      labelFor={(id) => A[id]?.label}
      onReveal={(t) => {
        setRevealed((r) => new Set(r).add(t))
        useHint()
      }}
    />
  )
  const guide = <GuidePanel steps={proto.steps} x={ctx} onGo={goStep} />
  const findingCount = s.log.filter((e) => e.obs && !e.action.startsWith('comm.')).length

  const tabs = (
    <Segmented
      layoutId={desktop ? 'sttab-d' : 'sttab-m'}
      value={tab}
      onChange={setTab}
      size="sm"
      options={[
        { value: 'actions', label: 'Actions' },
        { value: 'findings', label: `Findings${findingCount ? ` · ${findingCount}` : ''}` },
        ...(learn ? [{ value: 'guide' as const, label: 'Guide' }] : []),
      ]}
    />
  )

  const viewSwitcher =
    def.views.length > 1 ? (
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 no-scrollbar">
        {def.views.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={cn(
              'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium ring-1 transition',
              view === v.id ? 'bg-ink text-bg ring-ink' : 'bg-surface-1 text-muted ring-line hover:text-ink',
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
    ) : null

  const feel = extra.feel
  const stage = (
    <div className="relative h-full w-full">
      {use3d ? (
        <Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center bg-stage">
              <div className="flex items-center gap-2.5 rounded-full bg-surface-1/85 px-4 py-2 text-[13px] font-medium text-muted shadow-(--shadow-lift) ring-1 ring-line">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                Bringing the patient in…
              </div>
            </div>
          }
        >
          <StationStage3D
            x={sceneCtx}
            spec={spec}
            effects={effects}
            onZone={onZone}
            onMiss={(pt) => addEffect('tap', pt)}
            showZones={showZones || (learn && !task)}
            highlight={highlight}
            feel={feel ?? null}
            reaction={{ peak: reaction.wince, key: reaction.key, says: reaction.says }}
            compact={!desktop}
            faceLabel={desktop ? 'Watch the face' : undefined}
            onUnavailable={() => setFail3d(true)}
          />
        </Suspense>
      ) : (
        <StationCanvas
          spec={spec}
          effects={effects}
          onZone={onZone}
          onMiss={(pt) => addEffect('tap', pt)}
          showZones={showZones || (learn && !task)}
          highlight={highlight}
          overlay={feel ? <PulseFeel key={feel.key} at={feel.at} grade={feel.grade} hr={c.vitals.hr} scale={spec.effectScale ?? 1} /> : null}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-2.5 sm:p-3">
        <div className="pointer-events-auto">
          {acute &&
            (monitorOpen || desktop ? (
              <div onClick={() => setMonitorOpen((o) => !o)} role="button" tabIndex={0} aria-label="Toggle monitor" className="cursor-pointer">
                <VitalsMonitor v={c.vitals} compact label={monitorLabel(c.setting)} className={cn('w-[230px]', !desktop && 'w-[200px]')} />
              </div>
            ) : (
              <button onClick={() => setMonitorOpen(true)} className="flex items-center gap-2 rounded-xl bg-mon-bg/90 px-2.5 py-1.5 font-mono text-[11.5px] font-semibold tabular ring-1 ring-white/10">
                <span className="text-mon-hr">♥ {c.vitals.hr}</span>
                <span className="text-mon-bp">
                  {c.vitals.sbp}/{c.vitals.dbp}
                </span>
              </button>
            ))}
        </div>
        {!spec.faceVisible && !use3d && (
          <div className="pointer-events-auto">
            <FaceCam a={c.patient.appearance} pain={basePain} wince={reaction.wince} winceKey={reaction.key} says={reaction.says} size={desktop ? 'md' : 'sm'} label={desktop ? 'Watch the face' : undefined} />
          </div>
        )}
      </div>

      <div className="absolute right-2.5 bottom-3 z-20 flex flex-col gap-1.5 sm:right-3">
        {s.mode !== 'osce' && !learn && <UtilButton on={showZones} onClick={() => setShowZones((v) => !v)} label="Landmarks" icon={<MapPin size={16} />} />}
        {c.exam === 'scrotal' && s.mode !== 'osce' && (
          <UtilButton on={!!extra.anatomy} onClick={() => setExtra({ anatomy: !extra.anatomy })} label="Anatomy view" icon={<Layers size={16} />} />
        )}
      </div>

      <AnimatePresence>
        {latest && !task && desktop && (
          <motion.div
            key={latest.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-lg rounded-2xl px-4 py-3 shadow-(--shadow-float) ring-1 ring-line glass"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10.5px] font-semibold tracking-[0.12em] text-faint uppercase">{latest.label}</div>
                <p className="mt-0.5 text-[13.5px] leading-snug text-ink">{latest.obs.text}</p>
                {latest.obs.meaning && learn && <p className="mt-1 text-[12.5px] leading-snug text-violet">{latest.obs.meaning}</p>}
              </div>
              <button onClick={() => setLatest(null)} aria-label="Dismiss" className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-faint hover:bg-surface-2 hover:text-ink">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {task?.kind === 'pulse' && (
          <PulseTask
            key="pulse"
            hr={c.vitals.hr}
            rhythm={c.vitals.rhythm}
            a={c.patient.appearance}
            onClose={() => setTask(null)}
            onSubmit={(bpm) => {
              if (bpm) setPulseEstimate(bpm)
              const t = task
              setTask(null)
              run(t.action)
            }}
          />
        )}
        {task?.kind === 'listen' && (
          <ListenTask
            key="listen"
            kind={task.sound}
            hr={c.vitals.hr}
            label={task.label}
            onStop={() => {
              const t = task
              setTask(null)
              run(t.action)
            }}
          />
        )}
        {task?.kind === 'doppler' && (
          <DopplerTask
            key="doppler"
            kind={task.mode}
            hr={c.vitals.hr}
            label={task.label}
            venous={task.venous}
            reflux={task.reflux}
            onClose={() => setTask(null)}
            onDone={() => {
              const t = task
              setTask(null)
              run(t.action)
            }}
          />
        )}
        {task?.kind === 'buerger' && (
          <BuergerTask
            key="buerger"
            learn={learn}
            angleTarget={Math.min(c.visual?.legs?.right.buergerAngle ?? 999, c.visual?.legs?.left.buergerAngle ?? 999) < 999 ? Math.min(c.visual?.legs?.right.buergerAngle ?? 999, c.visual?.legs?.left.buergerAngle ?? 999) : undefined}
            onState={(b) => setExtra({ buerger: { angle: b.angle, dependent: b.dependent, pallor: Math.round(b.pallor * 50) / 50, rubor: Math.round(b.rubor * 50) / 50 } })}
            onClose={() => {
              setTask(null)
              setExtra({ buerger: undefined })
            }}
            onDone={() => {
              setTask(null)
              run('art.buerger')
            }}
          />
        )}
        {task?.kind === 'tourniquet' && (
          <TourniquetTask
            key="tq"
            controlled={(c.visual?.legs?.right.tourniquet ?? c.visual?.legs?.left.tourniquet ?? 'controlled') === 'controlled'}
            onState={(st) => {
              setExtra({ veinFill: Math.round(st.veinFill * 40) / 40, tourniquet: st.tourniquet })
              setView(st.view)
            }}
            onClose={() => {
              setTask(null)
              setExtra({ veinFill: undefined, tourniquet: false })
            }}
            onDone={() => {
              setTask(null)
              setExtra({ veinFill: undefined, tourniquet: false })
              run('ven.tourniquet')
            }}
          />
        )}
      </AnimatePresence>
      {task?.kind === 'script' && <ManoeuvreCaption key={task.action} steps={task.steps} onDone={onScriptDone} />}
    </div>
  )

  const footer = (
    <div className="flex items-center gap-2">
      {s.mode === 'practice' && (
        <Button size="sm" variant="soft" onClick={hint} leading={<Lightbulb size={15} />}>
          Hint
        </Button>
      )}
      {onNext && (
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onNext} trailing={<ArrowRight size={15} />}>
          Next
        </Button>
      )}
    </div>
  )

  if (desktop) {
    return (
      <div className="flex h-full min-h-0">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">{stage}</div>
          {viewSwitcher && <div className="border-t border-line">{viewSwitcher}</div>}
        </div>
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-line xl:w-[420px]">
          <div className="border-b border-line p-3">{tabs}</div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">{tab === 'actions' ? actionsPanel : tab === 'findings' ? findings : guide}</div>
          <div className="border-t border-line p-3">{footer}</div>
        </aside>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative h-[52%] min-h-[290px] shrink-0">{stage}</div>
      {viewSwitcher && <div className="shrink-0 border-t border-line bg-bg">{viewSwitcher}</div>}
      <FindingStrip latest={latest} learn={learn} onOpen={() => setTab('findings')} />
      <div className="flex min-h-0 flex-1 flex-col border-t border-line bg-bg">
        <div className="flex items-center gap-2 px-3 pt-2.5">
          <div className="flex-1">{tabs}</div>
          <Button size="icon-sm" variant="ghost" onClick={() => setSheetOpen(true)} aria-label="Full checklist">
            <ListChecks size={16} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">{tab === 'actions' ? actionsPanel : tab === 'findings' ? findings : guide}</div>
        <div className="border-t border-line px-3 py-2 safe-bottom">{footer}</div>
      </div>
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={learn ? 'Macleod’s sequence' : 'Findings so far'}>
        {learn ? guide : findings}
      </Sheet>
    </div>
  )
}

function Group({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">
        {title}
        {note && <span className="text-[10.5px] font-medium tracking-normal normal-case">· {note} view</span>}
      </div>
      {children}
    </div>
  )
}

function UtilButton({ on, onClick, label, icon }: { on: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={on}
      className={cn('grid h-10 w-10 place-items-center rounded-xl shadow-(--shadow-lift) ring-1 transition', on ? 'bg-accent text-accent-fg ring-accent' : 'text-muted ring-line glass hover:text-ink')}
    >
      {icon}
    </button>
  )
}
