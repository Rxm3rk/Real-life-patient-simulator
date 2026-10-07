import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  Ear,
  Eye,
  Footprints,
  Hand,
  HandMetal,
  Lightbulb,
  ListChecks,
  MapPin,
  Grid3x3,
  ScanFace,
  Shirt,
  Stethoscope,
  Target,
  Waves,
  BedDouble,
  Activity,
  X,
  Box,
} from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playPercussion, speak, uiTick, type Listen, type PercNote } from '../../../audio/engine'
import { bodyDims, CM, landmarks, regionAt, type RegionId } from '../../../anatomy/bodyModel'
import { EyeCloseup, MouthCloseup } from '../../../anatomy/FaceCloseups'
import { Face } from '../../../anatomy/Face'
import { lerpPt, type Pt } from '../../../anatomy/geometry'
import { HandsIllustration, SchamrothView, type HandView } from '../../../anatomy/Hands'
import type { Exposure } from '../../../anatomy/types'
import { Button } from '../../../components/ui/Button'
import { Segmented } from '../../../components/ui/primitives'
import { Sheet } from '../../../components/ui/Sheet'
import { toast, useToasts } from '../../../components/ui/Toast'
import { abdoFindings } from '../../../engine/abdo'
import { ACTION_BY_ID, type ViewId } from '../../../engine/abdoActions'
import { protocolFor } from '../../../engine/protocols'
import type { ProtocolStep, StepCtx } from '../../../engine/protocols/abdominal'
import { isClinic } from '../../../engine/setting'
import type { CaseDef, Observation } from '../../../engine/types'
import { useMediaQuery } from '../../../lib/hooks'
import { cn } from '../../../lib/utils'
import { exam3dAvailable, exam3dFailed } from '../../../lib/exam3d'
import { useEncounter } from '../../../store/encounter'
import { useSettings } from '../../../store/settings'
import { FaceCam } from '../FaceCam'
import { monitorLabel, VitalsMonitor } from '../VitalsMonitor'
import type { Shot } from './camera'
import { ActionButton, FindingStrip, FINISH_IDS, FindingsLog, GuidePanel, PREP_IDS, RegionPad, VIEW_ACTIONS } from './panels'
import type { PatientStageApi, StageHit } from './PatientStage3D'
import { nearest, Stage, type Effect, type EffectKind } from './Stage'
import { CrtTask, ListenTask, ManoeuvreCaption, PulseTask } from './tasks'

// three.js and the 3D patient load only when they're used
const PatientStage3D = lazy(() => import('./PatientStage3D').then((m) => ({ default: m.PatientStage3D })))

type Tool = 'look' | 'light' | 'deep' | 'percTender' | 'percuss' | 'listen'

const VIEWS: { id: ViewId; label: string; icon: typeof Eye }[] = [
  { id: 'bed', label: 'Bedside', icon: BedDouble },
  { id: 'hands', label: 'Hands', icon: Hand },
  { id: 'face', label: 'Face', icon: ScanFace },
  { id: 'neck', label: 'Neck', icon: MapPin },
  { id: 'chest', label: 'Chest', icon: Shirt },
  { id: 'abdomen', label: 'Abdomen', icon: Target },
  { id: 'groin', label: 'Groin', icon: Activity },
  { id: 'legs', label: 'Legs', icon: Footprints },
]

const TOOLS: { id: Tool; label: string; icon: typeof Eye; hint: string }[] = [
  { id: 'look', label: 'Look', icon: Eye, hint: 'Tap to inspect the abdomen' },
  { id: 'light', label: 'Light', icon: Hand, hint: 'Tap a region to palpate lightly' },
  { id: 'deep', label: 'Deep', icon: HandMetal, hint: 'Tap a region to palpate deeply' },
  { id: 'percTender', label: 'Peritonism', icon: Waves, hint: 'Tap gently to test for percussion tenderness' },
  { id: 'percuss', label: 'Percuss', icon: Waves, hint: 'Tap to percuss — listen to the note' },
  { id: 'listen', label: 'Listen', icon: Stethoscope, hint: 'Tap to place the stethoscope (umbilicus for bowel sounds, above it for the aorta)' },
]

type Task =
  | { kind: 'pulse' }
  | { kind: 'crt' }
  | { kind: 'listen'; action: string; sound: Listen; label: string; at: Pt }
  | { kind: 'liver' }
  | { kind: 'script'; steps: string[]; action: string; detail?: string; at?: Pt[] }

const taskAction = (t: Task) => (t.kind === 'pulse' ? 'hands.pulse' : t.kind === 'crt' ? 'hands.crt' : t.kind === 'liver' ? 'abdo.liver' : t.action)

let effectSeq = 1
let welcomed = ''
let welcomeTip = ''
/** The opening tip has done its job once you start examining: clear it off the stage. */
const clearWelcome = () => {
  if (welcomeTip) useToasts.getState().dismiss(welcomeTip)
  welcomeTip = ''
}

export default function ExamPhase({ c, onNext }: { c: CaseDef; onNext?: () => void }) {
  const s = useEncounter((st) => st.s)!
  const perform = useEncounter((st) => st.perform)
  const setPulseEstimate = useEncounter((st) => st.setPulseEstimate)
  const useHint = useEncounter((st) => st.useHint)
  const showRegionsPref = useSettings((st) => st.showRegions)
  const exam3d = useSettings((st) => st.exam3d)
  const setSettings = useSettings((st) => st.set)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [fail3d, setFail3d] = useState(false)
  // the illustrated patient unless the student chose 3D (heavy on phones and older laptops)
  const use3d = !fail3d && exam3d && exam3dAvailable()
  const stageApi = useRef<PatientStageApi | null>(null)

  const [view, setView] = useState<ViewId>('bed')
  const [tool, setTool] = useState<Tool>('light')
  const [effects, setEffects] = useState<Effect[]>([])
  const [reaction, setReaction] = useState({ wince: 0, key: 0, says: undefined as string | undefined })
  const [herniaPhase, setHerniaPhase] = useState<'rest' | 'cough' | 'standing'>('rest')
  const [task, setTask] = useState<Task | null>(null)
  const [tab, setTab] = useState<'actions' | 'findings' | 'guide'>(s.mode === 'learn' ? 'guide' : 'actions')
  const [highlight, setHighlight] = useState<string | null>(null)
  const [latest, setLatest] = useState<{ label: string; obs: Observation; key: number } | null>(null)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [handView, setHandView] = useState<HandView | 'profile'>('dorsal')
  const [blanch, setBlanch] = useState(0)
  const [flap, setFlap] = useState(0)
  const [closeup, setCloseup] = useState<'eye' | 'mouth' | null>(null)
  const [showLandmarks, setShowLandmarks] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [monitorOpen, setMonitorOpen] = useState(false)

  const f = useMemo(() => abdoFindings(c), [c])
  const a = c.patient.appearance
  const d = useMemo(() => bodyDims(a), [a])
  const lm = useMemo(() => landmarks(a, d), [a, d])
  const proto = protocolFor(c.exam)
  const did = useCallback((id: string) => s.log.some((e) => e.action === id), [s.log])
  const exposedAbdomen = did('comm.expose') && s.exposure !== 'gowned'
  const exposedGroin = did('groin.expose') && s.exposure !== 'gowned'

  const exposure: Exposure = view === 'legs' ? 'legs' : view === 'groin' && exposedGroin ? 'groin' : exposedAbdomen || exposedGroin ? 'abdomen' : 'gowned'
  const shot: Shot = view === 'hands' || view === 'face' ? 'bed' : (view as Shot)
  const basePain = ((c.vitals.pain ?? 0) / 10) * (s.analgesia ? 0.55 : 1)
  const learn = s.mode === 'learn'
  const showRegions = learn || (s.mode === 'practice' && showRegionsPref)

  const regionState = useMemo(() => {
    const st: Partial<Record<RegionId, 'light' | 'deep'>> = {}
    for (const e of s.log) {
      if (!e.region) continue
      if (e.action === 'abdo.deep') st[e.region] = 'deep'
      else if (e.action === 'abdo.light' && !st[e.region]) st[e.region] = 'light'
    }
    return st
  }, [s.log])

  const ctx: StepCtx = useMemo(() => ({ c, f, log: s.log, asked: new Set(s.asked), ordered: new Set(s.ordered) }), [c, f, s.log, s.asked, s.ordered])

  // Welcome nudge (once per attempt)
  useEffect(() => {
    if (s.log.length === 0 && s.mode !== 'osce' && welcomed !== s.attemptId) {
      welcomed = s.attemptId
      welcomeTip = toast({ tone: 'tip', title: 'Before you touch the patient', body: 'Clean your hands, introduce yourself, confirm identity, explain and gain consent, offer a chaperone and ask about pain.', duration: 7000 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addEffect = (kind: EffectKind, at: Pt, label?: string, ms = 1100) => {
    const id = effectSeq++
    setEffects((e) => [...e, { id, kind, at, label }])
    window.setTimeout(() => setEffects((e) => e.filter((x) => x.id !== id)), ms)
  }

  const react = (obs: Observation) => {
    if ((obs.reaction ?? 0) > 0 || obs.says) {
      setReaction((r) => ({ wince: obs.reaction ?? 0, key: r.key + 1, says: obs.says }))
      if (obs.says) speak(obs.says, c.patient.sex, c.patient.age)
    }
  }

  const violationsBefore = useRef<Set<string>>(new Set())
  const listenSec = useRef(0)

  const run = (action: string, opts: { region?: RegionId; detail?: string; seconds?: number; at?: Pt } = {}): Observation | null => {
    const def = ACTION_BY_ID[action]
    // prerequisites
    if (def?.view === 'abdomen' && def.contact && !exposedAbdomen) {
      toast({ tone: 'warning', title: 'The abdomen is still covered', body: 'Explain, gain consent and expose the patient first (Before you start → Expose).' })
      return null
    }
    if (def?.view === 'groin' && action !== 'groin.expose' && action !== 'groin.umbilical' && !exposedGroin) {
      toast({ tone: 'warning', title: 'Expose the groin first', body: 'Offer a chaperone, explain, and expose both groins while keeping the genitalia covered.' })
      return null
    }
    const before = new Set(proto.rules.filter((r) => r.violated(ctx)).map((r) => r.id))
    violationsBefore.current = before
    const obs = perform(action, { region: opts.region, detail: opts.detail, seconds: opts.seconds })
    if (!obs) return null
    react(obs)
    if (obs.media?.startsWith('perc:')) playPercussion(obs.media.slice(5) as PercNote)
    if (!action.startsWith('comm.')) {
      const label = opts.region ? `${def?.short ?? def?.label} · ${opts.region}` : def?.label ?? action
      setLatest({ label, obs, key: Date.now() })
    } else if (obs.says) {
      setLatest({ label: def?.label ?? action, obs: { text: obs.text }, key: Date.now() })
    }
    uiTick('soft')
    if (highlight === action) setHighlight(null)
    // Learn mode: instant feedback on sequence errors
    if (learn) {
      const nextCtx: StepCtx = { ...ctx, log: [...ctx.log, { action, t: Date.now(), region: opts.region }] }
      const newly = proto.rules.filter((r) => !before.has(r.id) && r.violated(nextCtx))
      for (const r of newly) toast({ tone: 'warning', title: 'Sequence tip', body: r.message, duration: 6000 })
    }
    if (action === 'abdo.cough' || action === 'groin.cough') {
      setHerniaPhase('cough')
      window.setTimeout(() => setHerniaPhase('rest'), 1400)
    }
    if (action === 'hands.inspect') setHandView('dorsal')
    if (action === 'hands.clubbing') setHandView('profile')
    if (action === 'face.eyes') setCloseup('eye')
    if (action === 'face.mouth') setCloseup('mouth')
    return obs
  }

  /* ---------------------------- stage taps ---------------------------- */

  const onPoint = (pt: Pt, hit?: StageHit | null, useTool: Tool = tool) => {
    clearWelcome()
    endTask()
    if (view === 'bed') {
      const chart = Math.hypot(pt[0] - 118, pt[1] - 842) < 50
      if (chart) {
        addEffect('tap', pt)
        run('gen.obs')
      } else if (!did('gen.endOfBed')) run('gen.endOfBed')
      else addEffect('tap', pt)
      return
    }
    if (view === 'abdomen') {
      // the 3D stage knows the region under your finger on the patient's own body
      const r = hit ? hit.region : regionAt(pt, lm, d)
      if (useTool === 'look') {
        run('abdo.inspect')
        return
      }
      if (!r) {
        addEffect('tap', pt)
        return
      }
      if (!exposedAbdomen) {
        run('abdo.light', { region: r })
        return
      }
      if (useTool === 'light' || useTool === 'deep') {
        addEffect(useTool, pt)
        const obs = run(useTool === 'light' ? 'abdo.light' : 'abdo.deep', { region: r, at: pt })
        if (obs && (obs.reaction ?? 0) >= 0.3 && learn) addEffect('tender', r === 'LIF' && useTool === 'deep' && f.abdomen.rovsing ? lm.mcburney : pt)
      } else if (useTool === 'percTender') {
        addEffect('press', pt)
        run('abdo.percTender', { region: r, at: pt })
      } else if (useTool === 'percuss') {
        const note = f.abdomen.regions[r].note
        addEffect('percuss', pt, learn ? note : undefined, 1400)
        run('abdo.percuss', { region: r, at: pt })
      } else if (useTool === 'listen') {
        startListen(pt)
      }
      return
    }
    if (view === 'groin') {
      if (!exposedGroin) {
        run('groin.inguinalR')
        return
      }
      const zone = nearest(
        pt,
        [
          ['groin.inguinalR', lerpPt(lm.deepRingR, lm.superficialRingR, 0.5)],
          ['groin.inguinalL', lerpPt(lm.deepRingL, lm.superficialRingL, 0.5)],
          ['groin.femoralR', lm.femoralCanalR],
          ['groin.femoralL', lm.femoralCanalL],
          ['groin.umbilical', lm.umbilicus],
          ['groin.femoralPulses', lm.midInguinalR],
        ],
        26,
      )
      addEffect('press', pt)
      if (zone) run(zone)
      return
    }
    if (view === 'neck') {
      addEffect('press', pt)
      run('neck.nodes')
      return
    }
    if (view === 'chest') {
      run('chest.inspect')
      return
    }
    if (view === 'legs') {
      if (pt[1] > 520 && pt[1] < 760) {
        addEffect('press', pt, undefined, 2200)
        run('legs.oedema')
      }
    }
  }

  const startListen = (pt: Pt) => {
    if (!exposedAbdomen) {
      run('abdo.bowel')
      return
    }
    const target = nearest(
      pt,
      [
        ['aortic', lm.aorta],
        ['renalR', [lm.umbilicus[0] - 11, lm.umbilicus[1] - 11]],
        ['renalL', [lm.umbilicus[0] + 11, lm.umbilicus[1] - 11]],
      ],
      9,
    )
    if (target === 'aortic') setTask({ kind: 'listen', action: 'abdo.bruitAortic', sound: f.abdomen.bruits.aortic ? 'bruit' : 'quiet', label: 'Listening for an aortic bruit', at: pt })
    else if (target === 'renalR' || target === 'renalL')
      setTask({ kind: 'listen', action: 'abdo.bruitRenal', sound: f.abdomen.bruits.renalR || f.abdomen.bruits.renalL ? 'bruit' : 'quiet', label: 'Listening for renal bruits', at: pt })
    else setTask({ kind: 'listen', action: 'abdo.bowel', sound: `bowel:${f.abdomen.bowelSounds}` as Listen, label: 'Listening for bowel sounds', at: pt })
  }

  /* ---------------------------- panel actions ---------------------------- */

  const onAction = (id: string) => {
    const def = ACTION_BY_ID[id]
    if (!def) return
    clearWelcome()
    // pressing the manoeuvre that is already playing just finishes it; a panel already open for this action stays open
    if (task?.kind === 'script' && task.action === id) return completeScript(task)
    if (task && taskAction(task) === id) return
    endTask()
    if (def.view !== 'any' && def.view !== view) setView(def.view)
    // Tasks that need interaction
    if (id === 'hands.pulse') return setTask({ kind: 'pulse' })
    if (id === 'hands.crt') {
      setHandView('dorsal')
      return setTask({ kind: 'crt' })
    }
    if (id === 'hands.flap') {
      setHandView('outstretched')
      setTask({ kind: 'script', steps: ['“Hold your arms out straight…”', '“…and cock your wrists back, fingers apart.”', 'Watching for 30 seconds…'], action: 'hands.flap' })
      return
    }
    if (id === 'abdo.bowel') return exposedAbdomen ? setTask({ kind: 'listen', action: id, sound: `bowel:${f.abdomen.bowelSounds}` as Listen, label: 'Listening for bowel sounds', at: [lm.umbilicus[0] - 8, lm.umbilicus[1] + 2] }) : run(id)
    if (id === 'abdo.bruitAortic') return exposedAbdomen ? setTask({ kind: 'listen', action: id, sound: f.abdomen.bruits.aortic ? 'bruit' : 'quiet', label: 'Listening for an aortic bruit', at: lm.aorta }) : run(id)
    if (id === 'abdo.bruitRenal')
      return exposedAbdomen ? setTask({ kind: 'listen', action: id, sound: f.abdomen.bruits.renalR || f.abdomen.bruits.renalL ? 'bruit' : 'quiet', label: 'Listening for renal bruits', at: [lm.umbilicus[0] - 11, lm.umbilicus[1] - 11] }) : run(id)
    if (id === 'abdo.liver') {
      if (!exposedAbdomen) return run(id)
      setView('abdomen')
      return setTask({ kind: 'liver' })
    }
    const scripted = SCRIPTS(lm)[id]
    if (scripted && (view === 'abdomen' || def.view === 'abdomen') && exposedAbdomen) {
      setTask({ kind: 'script', steps: scripted.steps, action: id, at: scripted.at })
      return
    }
    run(id)
  }

  const completeScript = (t: Extract<Task, { kind: 'script' }>) => {
    setTask(null)
    if (t.at) t.at.forEach((p, i) => window.setTimeout(() => addEffect(t.action === 'abdo.liverSpan' || t.action === 'abdo.shifting' ? 'percuss' : 'press', p), i * 120))
    if (t.action === 'abdo.liverSpan' || t.action === 'abdo.shifting') {
      ;['resonant', 'resonant', 'dull'].forEach((n, i) => window.setTimeout(() => playPercussion(n as PercNote), i * 260))
    }
    run(t.action, { detail: t.detail })
    if (t.action === 'hands.flap') setFlap(0)
  }

  const onScriptDone = useCallback(() => {
    if (task?.kind === 'script') completeScript(task)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task])

  /**
   * A new action never waits on the last one: a manoeuvre still playing
   * completes at once, and a task panel is ended as its close button would
   * (the stethoscope is lifted and the listening so far counts; an unfinished
   * pulse count, capillary refill or liver edge is put down).
   */
  const endTask = () => {
    const t = task
    if (!t) return
    if (t.kind === 'script') return completeScript(t)
    setTask(null)
    if (t.kind === 'crt') setBlanch(0)
    if (t.kind === 'listen') run(t.action, { seconds: listenSec.current })
    listenSec.current = 0
  }

  // asterixis animation during the flap test
  useEffect(() => {
    if (!(task?.kind === 'script' && task.action === 'hands.flap')) return
    if (!f.hands.asterixis) return
    let alive = true
    const loop = () => {
      if (!alive) return
      setFlap(0.9)
      window.setTimeout(() => alive && setFlap(0), 160)
      window.setTimeout(loop, 500 + Math.random() * 900)
    }
    loop()
    return () => {
      alive = false
    }
  }, [task, f.hands.asterixis])

  const nextStep = proto.steps.find((st) => (!st.applies || st.applies(ctx)) && (() => {
    const dd = st.done(ctx)
    return (typeof dd === 'number' ? dd : dd ? 1 : 0) < 0.99
  })())

  const goStep = (st: ProtocolStep) => {
    if (st.view) setView(st.view)
    if (st.action) setHighlight(st.action)
    if (st.action === 'abdo.light') setTool('light')
    if (st.action === 'abdo.deep') setTool('deep')
    if (st.action === 'abdo.percTender') setTool('percTender')
    if (st.action === 'abdo.percuss') setTool('percuss')
    if (!desktop) setTab('actions')
  }

  const hint = () => {
    if (!nextStep) {
      toast({ tone: 'success', title: 'Nothing obvious missing', body: 'Complete the examination and move on to your plan.' })
      return
    }
    useHint()
    toast({ tone: 'tip', title: `Hint: ${nextStep.label}`, body: nextStep.why, duration: 7000 })
    goStep(nextStep)
  }

  /* ---------------------------- render ---------------------------- */

  const stageCursor = view === 'abdomen' ? (tool === 'listen' ? 'cell' : 'pointer') : view === 'bed' ? 'zoom-in' : 'pointer'
  const listenAt = task?.kind === 'listen' ? task.at : null

  const stage3d = use3d && (
    <Suspense fallback={<StageLoading />}>
      <PatientStage3D
        c={c}
        view={view}
        exposure={exposure}
        pain={basePain}
        reaction={{ peak: reaction.wince, key: reaction.key, says: reaction.says }}
        herniaPhase={herniaPhase}
        effects={listenAt ? [...effects, { id: -1, kind: 'listen', at: listenAt }] : effects}
        showRegions={showRegions && view === 'abdomen'}
        showLandmarks={showLandmarks}
        regionState={learn ? regionState : undefined}
        onPoint={view === 'hands' ? () => handView === 'dorsal' && run('hands.temp') : view === 'face' ? undefined : onPoint}
        cursor={view === 'face' ? 'grab' : stageCursor}
        compact={!desktop}
        faceInset={view !== 'face' && view !== 'hands'}
        faceLabel={desktop ? 'Watch the face' : undefined}
        handView={handView === 'profile' ? 'dorsal' : handView}
        flap={flap}
        mouthOpen={view === 'face' && closeup === 'mouth' ? 0.85 : 0}
        tongueOut={view === 'face' && closeup === 'mouth' ? 0.35 : 0}
        lookAt={view === 'face' && closeup === 'eye' ? 'up' : 'camera'}
        onApi={(api) => (stageApi.current = api)}
        onUnavailable={(reason) => {
          exam3dFailed(reason === 'slow' ? 'slow' : /lost/i.test(reason) ? 'lost' : 'error')
          setFail3d(true)
        }}
      >
        {view === 'hands' && <HandViewPicker handView={handView} setHandView={setHandView} />}
        {view === 'hands' && handView === 'profile' && (
          <div className="absolute inset-x-3 top-3 z-20 mx-auto max-w-[420px] overflow-hidden rounded-3xl bg-surface-1/95 shadow-(--shadow-float) ring-1 ring-line lg:top-4">
            <div className="px-4 pt-3 text-[13px] font-semibold text-ink">Schamroth’s window test</div>
            <svg viewBox="0 60 400 170" className="w-full p-2">
              <SchamrothView a={a} clubbed={f.hands.clubbing} koilonychia={f.hands.koilonychia} />
            </svg>
          </div>
        )}
        {view === 'face' && <FaceCloseupCard c={c} f={f} closeup={closeup} onClose={() => setCloseup(null)} />}
      </PatientStage3D>
    </Suspense>
  )

  const stage = (
    <div className="relative h-full w-full">
      {stage3d ? (
        stage3d
      ) : view === 'hands' ? (
        <HandsStage c={c} f={f} handView={handView} setHandView={setHandView} blanch={blanch} flap={flap} onTapHand={() => run('hands.temp')} />
      ) : view === 'face' ? (
        <FaceStage c={c} pain={basePain} wince={reaction.wince} winceKey={reaction.key} closeup={closeup} f={f} onClose={() => setCloseup(null)} mouthOpen={closeup === 'mouth'} />
      ) : (
        <Stage
          c={c}
          shot={shot}
          exposure={exposure}
          pose={{ exposure, pain: basePain, wince: 0, lookAt: 'up' }}
          herniaPhase={herniaPhase}
          effects={listenAt ? [...effects, { id: -1, kind: 'listen', at: listenAt }] : effects}
          showRegions={showRegions && view === 'abdomen'}
          showLandmarks={showLandmarks}
          regionState={learn ? regionState : undefined}
          onPoint={onPoint}
          cursor={stageCursor}
          compact={!desktop}
        />
      )}

      {/* overlays: vitals & face */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-2.5 sm:p-3">
        {isClinic(c.setting) ? (
          <div className="pointer-events-auto rounded-xl bg-surface-1/90 px-2.5 py-1.5 font-mono text-[11.5px] font-semibold text-ink tabular ring-1 ring-line" title="Observations taken at check-in">
            <span className="mr-1.5 font-sans text-[10px] font-semibold tracking-[0.12em] text-faint uppercase">Obs</span>
            HR {c.vitals.hr} · BP {c.vitals.sbp}/{c.vitals.dbp} · SpO₂ {c.vitals.spo2}%
          </div>
        ) : (
          <div className="pointer-events-auto cursor-pointer" onClick={() => setMonitorOpen((o) => !o)} role="button" tabIndex={0} aria-label="Toggle monitor">
            {monitorOpen || desktop ? (
              <VitalsMonitor v={c.vitals} compact label={monitorLabel(c.setting)} className={cn('w-[230px]', !desktop && 'w-[200px]')} />
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-mon-bg/90 px-2.5 py-1.5 font-mono text-[11.5px] font-semibold tabular ring-1 ring-white/10">
                <span className="text-mon-hr">♥ {c.vitals.hr}</span>
                <span className="text-mon-bp">{c.vitals.sbp}/{c.vitals.dbp}</span>
                <span className="text-mon-spo2">{c.vitals.spo2}%</span>
              </div>
            )}
          </div>
        )}
        {view !== 'face' && !use3d && (
          <div className="pointer-events-auto">
            <FaceCam a={a} pain={basePain} wince={reaction.wince} winceKey={reaction.key} says={reaction.says} size={desktop ? 'md' : 'sm'} label={desktop ? 'Watch the face' : undefined} />
          </div>
        )}
      </div>

      {/* tool dock */}
      {view === 'abdomen' && (!task || task.kind === 'script') && (
        <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center px-2">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1 shadow-(--shadow-float) ring-1 ring-line no-scrollbar glass">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.hint}
                className={cn(
                  'flex h-12 min-w-[60px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-semibold transition',
                  tool === t.id ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                <t.icon size={17} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* stage utilities */}
      <div className="absolute right-2.5 bottom-20 z-20 flex flex-col gap-1.5 sm:right-3">
        {exam3dAvailable() && (
          <UtilButton
            on={use3d}
            onClick={() => {
              setFail3d(false)
              setSettings({ exam3d: !use3d })
            }}
            label={use3d ? 'Use the illustrated patient' : 'Try the 3D patient (heavier on the device)'}
            icon={<Box size={16} />}
          />
        )}
        {view === 'abdomen' && s.mode === 'practice' && (
          <UtilButton on={showRegionsPref} onClick={() => setSettings({ showRegions: !showRegionsPref })} label="Regions" icon={<Grid3x3 size={16} />} />
        )}
        {(view === 'abdomen' || view === 'groin') && s.mode !== 'osce' && <UtilButton on={showLandmarks} onClick={() => setShowLandmarks((v) => !v)} label="Landmarks" icon={<MapPin size={16} />} />}
      </div>

      {/* Latest finding card */}
      <AnimatePresence>
        {latest && !task && desktop && (
          <motion.div
            key={latest.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn('absolute inset-x-3 z-20 mx-auto max-w-lg rounded-2xl px-4 py-3 shadow-(--shadow-float) ring-1 ring-line glass', view === 'abdomen' ? 'bottom-[76px]' : 'bottom-3')}
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

      {/* Tasks */}
      <AnimatePresence>
        {task?.kind === 'pulse' && (
          <PulseTask
            key="pulse"
            hr={c.vitals.hr}
            rhythm={c.vitals.rhythm}
            a={a}
            onClose={() => setTask(null)}
            onSubmit={(bpm) => {
              if (bpm) setPulseEstimate(bpm)
              setTask(null)
              run('hands.pulse')
            }}
          />
        )}
        {task?.kind === 'crt' && (
          <CrtTask
            key="crt"
            crt={f.hands.crt}
            onBlanch={setBlanch}
            onClose={() => {
              setTask(null)
              setBlanch(0)
            }}
            onSubmit={() => {
              setTask(null)
              setBlanch(0)
              run('hands.crt')
            }}
          />
        )}
        {task?.kind === 'listen' && (
          <ListenTask
            key="listen"
            kind={task.sound}
            hr={c.vitals.hr}
            label={task.label}
            onTick={(sec) => {
              listenSec.current = sec
            }}
            onStop={(sec) => {
              const t = task
              setTask(null)
              listenSec.current = 0
              run(t.action, { seconds: sec })
            }}
          />
        )}
      </AnimatePresence>
      {task?.kind === 'script' && <ManoeuvreCaption key={task.action} steps={task.steps} onDone={onScriptDone} />}
      {task?.kind === 'liver' && (
        <LiverTask
          toScene={(x, y, el) => (use3d ? (stageApi.current?.toBody(x, y) ?? null) : svgPoint(el, x, y))}
          lm={lm}
          edgeY={lm.liverEdgeY + f.abdomen.liver.edgeCm * CM}
          onDone={(detail) => {
            setTask(null)
            run('abdo.liver', { detail })
          }}
          onCancel={() => setTask(null)}
          addEffect={addEffect}
        />
      )}
    </div>
  )

  const padTool: Tool = tool === 'look' || tool === 'listen' ? 'light' : tool
  const actionsPanel = (
    <div className="space-y-5">
      <Group title="Before you start">
        <div className="grid grid-cols-2 gap-1.5">
          {PREP_IDS.map((id) => (
            <ActionButton key={id} id={id} compact done={did(id)} highlight={highlight === id} onClick={() => onAction(id)} />
          ))}
        </div>
      </Group>
      {VIEW_ACTIONS[view].map((g) => (
        <Group key={g.title} title={g.title}>
          <div className="grid grid-cols-2 gap-1.5">
            {g.ids.map((id) => (
              <ActionButton key={id} id={id} compact done={did(id)} highlight={highlight === id} onClick={() => onAction(id)} />
            ))}
          </div>
        </Group>
      ))}
      {view === 'abdomen' && (
        <Group title={`Palpate by region — ${TOOLS.find((t) => t.id === padTool)?.label}`}>
          <RegionPad
            state={regionState}
            onPick={(r) => {
              // the pad always examines: from Look or Listen it takes up light palpation
              if (padTool !== tool) setTool(padTool)
              onPoint(regionCentreSafe(r, lm), null, padTool)
            }}
          />
        </Group>
      )}
      <Group title="Finishing">
        <div className="grid grid-cols-2 gap-1.5">
          {FINISH_IDS.filter((id) => id !== 'complete.pregnancy' || c.patient.sex === 'female').map((id, i) => (
            <ActionButton key={`${id}${i}`} id={id} compact done={id === 'comm.wash' ? false : did(id)} highlight={highlight === id} onClick={() => onAction(id)} />
          ))}
        </div>
      </Group>
    </div>
  )

  const findings = <FindingsLog s={s} mode={s.mode} revealed={revealed} onReveal={(t) => { setRevealed((r) => new Set(r).add(t)); useHint() }} />
  const guide = <GuidePanel steps={proto.steps} x={ctx} onGo={goStep} />

  const tabs = (
    <Segmented
      layoutId={desktop ? 'examtab-d' : 'examtab-m'}
      value={tab}
      onChange={setTab}
      size="sm"
      options={[
        { value: 'actions', label: 'Actions' },
        { value: 'findings', label: `Findings${s.log.filter((e) => e.obs && !e.action.startsWith('comm.')).length ? ` · ${s.log.filter((e) => e.obs && !e.action.startsWith('comm.')).length}` : ''}` },
        ...(learn ? [{ value: 'guide' as const, label: 'Guide' }] : []),
      ]}
    />
  )

  const viewSwitcher = (
    <div className="flex gap-1.5 overflow-x-auto px-3 py-2 no-scrollbar">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => {
            setView(v.id)
            setCloseup(null)
          }}
          className={cn(
            'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium ring-1 transition',
            view === v.id ? 'bg-ink text-bg ring-ink' : 'bg-surface-1 text-muted ring-line hover:text-ink',
          )}
        >
          <v.icon size={14} />
          {v.label}
        </button>
      ))}
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
          Investigations
        </Button>
      )}
    </div>
  )

  if (desktop) {
    return (
      <div className="flex h-full min-h-0">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">{stage}</div>
          <div className="border-t border-line">{viewSwitcher}</div>
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
      <div className="relative h-[54%] min-h-[300px] shrink-0">{stage}</div>
      <div className="shrink-0 border-t border-line bg-bg">{viewSwitcher}</div>
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

function regionCentreSafe(r: RegionId, lm: ReturnType<typeof landmarks>): Pt {
  const xs = { R: (lm.mclR - 58) / 2 - 2, L: (lm.mclL + 58) / 2 + 2 }
  const ys = { U: 272, M: (lm.subcostalY + lm.transtubercularY) / 2, B: 350 }
  const map: Record<RegionId, Pt> = {
    RUQ: [xs.R + 6, ys.U + 4],
    EPI: [0, ys.U - 6],
    LUQ: [xs.L - 6, ys.U + 4],
    RF: [xs.R, ys.M],
    UMB: [0, ys.M + 6],
    LF: [xs.L, ys.M],
    RIF: [xs.R + 8, ys.B - 6],
    SP: [0, ys.B + 8],
    LIF: [xs.L - 8, ys.B - 6],
  }
  return map[r]
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-faint uppercase">{title}</div>
      {children}
    </div>
  )
}

function UtilButton({ on, onClick, label, icon }: { on: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-pressed={on}
      className={cn('grid h-10 w-10 place-items-center rounded-xl shadow-(--shadow-lift) ring-1 transition', on ? 'bg-accent text-accent-fg ring-accent' : 'text-muted ring-line glass hover:text-ink')}
    >
      {icon}
    </button>
  )
}

/* Scripted manoeuvres: captions and effect points */
function SCRIPTS(lm: ReturnType<typeof landmarks>): Record<string, { steps: string[]; at?: Pt[] }> {
  return {
    'abdo.murphy': { steps: ['Fingers at the tip of the right 9th costal cartilage…', '“Take a deep breath in for me…”'], at: [lm.murphy] },
    'abdo.murphyLeft': { steps: ['Same manoeuvre on the left for comparison…', '“And another deep breath…”'], at: [[-lm.murphy[0], lm.murphy[1]]] },
    'abdo.spleen': { steps: ['Start in the right iliac fossa…', '“Breathe in…” — moving diagonally towards the left costal margin…', '…with each breath.'], at: [lerpPt(lm.mcburney, [58, 282], 0), lerpPt(lm.mcburney, [58, 282], 0.5), [58, 282]] },
    'abdo.kidneys': { steps: ['Left hand in the right loin, right hand anterior…', 'Push up firmly — “Breathe in”…', 'Now the left side…'], at: [[-44, 300], [44, 300]] },
    'abdo.aorta': { steps: ['Hands either side of the midline above the umbilicus…', 'Feeling: are your fingers pushed up — or apart?'], at: [[lm.aorta[0] - 12, lm.aorta[1]], [lm.aorta[0] + 12, lm.aorta[1]]] },
    'abdo.bladder': { steps: ['Palpating from the umbilicus down towards the pubis…', 'Percussing for suprapubic dullness…'], at: [[0, 330], [0, 360]] },
    'abdo.liverSpan': { steps: ['Percussing down the mid-clavicular line from the chest…', '…and up from the abdomen to find the lower border.'], at: [[lm.mclR, 215], [lm.mclR, 235], [lm.mclR, 268]] },
    'abdo.shifting': { steps: ['Percussing from the umbilicus out to the flank…', 'Finger stays on the point of dullness — “Roll towards me please…”', 'Waiting 30 seconds… percussing again.'], at: [[-20, 310], [-40, 312], [-58, 314]] },
    'abdo.thrill': { steps: ['Patient’s hand edge pressed along the midline…', 'Flicking one flank, feeling on the other…'], at: [[-60, 310], [60, 310]] },
    'abdo.rovsing': { steps: ['Deep pressure in the left iliac fossa…', 'Watching the face…'], at: [[-lm.mcburney[0], lm.mcburney[1]]] },
    'abdo.psoas': { steps: ['Patient on their left side…', 'Extending the right hip against resistance…'] },
    'abdo.obturator': { steps: ['Right hip and knee flexed to 90°…', 'Internally rotating the hip…'] },
    'abdo.carnett': { steps: ['Finger on the tender spot…', '“Lift your head and shoulders off the bed…”'] },
    'abdo.succussion': { steps: ['Stethoscope over the epigastrium…', 'Gently rocking the patient side to side…'] },
  }
}

/* ---------------------------- 3D helpers ---------------------------- */

function StageLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-stage">
      <div className="flex items-center gap-2.5 rounded-full bg-surface-1/85 px-4 py-2 text-[13px] font-medium text-muted shadow-(--shadow-lift) ring-1 ring-line">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        Bringing the patient in…
      </div>
    </div>
  )
}

function HandViewPicker({ handView, setHandView }: { handView: HandView | 'profile'; setHandView: (v: HandView | 'profile') => void }) {
  return (
    <div className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
      <Segmented
        layoutId="handview3d"
        size="sm"
        value={handView}
        onChange={setHandView}
        className="shadow-(--shadow-lift)"
        options={[
          { value: 'dorsal', label: 'Backs' },
          { value: 'palms', label: 'Palms' },
          { value: 'profile', label: 'Profile' },
          { value: 'outstretched', label: 'Arms out' },
        ]}
      />
    </div>
  )
}

function FaceCloseupCard({ c, f, closeup, onClose }: { c: CaseDef; f: ReturnType<typeof abdoFindings>; closeup: 'eye' | 'mouth' | null; onClose: () => void }) {
  const a = c.patient.appearance
  return (
    <AnimatePresence>
      {closeup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="absolute inset-x-3 top-14 z-30 mx-auto max-w-[320px] overflow-hidden rounded-3xl bg-surface-1 shadow-(--shadow-float) ring-1 ring-line lg:inset-x-auto lg:top-4 lg:right-4"
        >
          <div className="flex items-center justify-between px-4 pt-3">
            <div className="text-[13px] font-semibold text-ink">{closeup === 'eye' ? 'Lower lid gently everted' : '“Open your mouth, please”'}</div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Close">
              <X size={15} />
            </button>
          </div>
          <svg viewBox={closeup === 'eye' ? '0 0 300 180' : '0 0 300 200'} className="w-full p-3">
            {closeup === 'eye' ? (
              <EyeCloseup a={a} sclera={f.face.sclera} conjunctiva={f.face.conjunctiva} id="eyec3" />
            ) : (
              <MouthCloseup a={a} mucosa={f.face.mucosa} tongue={f.face.tongue} angular={f.face.angularCheilitis} ulcers={f.face.ulcers} id="mouthc3" />
            )}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------------------- Hands stage ---------------------------- */

function HandsStage({
  c,
  f,
  handView,
  setHandView,
  blanch,
  flap,
  onTapHand,
}: {
  c: CaseDef
  f: ReturnType<typeof abdoFindings>
  handView: HandView | 'profile'
  setHandView: (v: HandView | 'profile') => void
  blanch: number
  flap: number
  onTapHand: () => void
}) {
  const a = c.patient.appearance
  const cannula = a.lines?.cannula?.startsWith('left') ? 'left' : a.lines?.cannula?.startsWith('right') ? 'right' : undefined
  return (
    <div className="absolute inset-0 flex flex-col bg-stage">
      <div className="relative min-h-0 flex-1 text-ink" onPointerDown={handView === 'dorsal' ? onTapHand : undefined}>
        <svg viewBox={handView === 'profile' ? '0 60 400 170' : '0 30 400 300'} className="h-full w-full touch-none-select">
          {handView === 'profile' ? (
            <SchamrothView a={a} clubbed={f.hands.clubbing} koilonychia={f.hands.koilonychia} />
          ) : (
            <HandsIllustration
              a={a}
              id="hx"
              view={handView}
              flapPhase={flap}
              signs={{
                clubbing: f.hands.clubbing,
                leukonychia: f.hands.leukonychia,
                koilonychia: f.hands.koilonychia,
                palmarErythema: f.hands.palmarErythema,
                dupuytren: f.hands.dupuytren,
                tarStaining: f.hands.tarStaining,
                blanch,
                cannula,
                scratches: a.excoriations,
              }}
            />
          )}
        </svg>
      </div>
      <div className="absolute top-3 left-1/2 z-30 -translate-x-1/2 max-lg:top-auto max-lg:bottom-3">
        <Segmented
          layoutId="handview"
          size="sm"
          value={handView}
          onChange={setHandView}
          className="shadow-(--shadow-lift)"
          options={[
            { value: 'dorsal', label: 'Backs' },
            { value: 'palms', label: 'Palms' },
            { value: 'profile', label: 'Profile' },
            { value: 'outstretched', label: 'Arms out' },
          ]}
        />
      </div>
    </div>
  )
}

/* ---------------------------- Face stage ---------------------------- */

function FaceStage({
  c,
  pain,
  wince,
  winceKey,
  closeup,
  f,
  onClose,
  mouthOpen,
}: {
  c: CaseDef
  pain: number
  wince: number
  winceKey: number
  closeup: 'eye' | 'mouth' | null
  f: ReturnType<typeof abdoFindings>
  onClose: () => void
  mouthOpen: boolean
}) {
  const a = c.patient.appearance
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!winceKey || wince <= 0) return
    setW(wince)
    const id = window.setTimeout(() => setW(0), 1200)
    return () => window.clearTimeout(id)
  }, [winceKey, wince])
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-stage-2 to-stage">
      <svg viewBox="-75 -30 150 175" className="h-full w-full">
        <ellipse cx="0" cy="40" rx="95" ry="72" fill="#eef2f5" opacity="0.08" />
        <Face a={a} pose={{ pain, wince: w, mouthOpen: mouthOpen ? 0.9 : 0, lookAt: closeup === 'eye' ? 'up' : 'examiner' }} id="facestage" bust />
      </svg>
      <AnimatePresence>
        {closeup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute inset-x-3 top-14 z-30 mx-auto max-w-[320px] overflow-hidden rounded-3xl bg-surface-1 shadow-(--shadow-float) ring-1 ring-line lg:inset-x-auto lg:top-4 lg:right-4"
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <Ear size={15} className="hidden" />
                {closeup === 'eye' ? 'Lower lid gently everted' : '“Open your mouth, please”'}
              </div>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Close">
                <X size={15} />
              </button>
            </div>
            <svg viewBox={closeup === 'eye' ? '0 0 300 180' : '0 0 300 200'} className="w-full p-3">
              {closeup === 'eye' ? (
                <EyeCloseup a={a} sclera={f.face.sclera} conjunctiva={f.face.conjunctiva} id="eyec" />
              ) : (
                <MouthCloseup a={a} mucosa={f.face.mucosa} tongue={f.face.tongue} angular={f.face.angularCheilitis} ulcers={f.face.ulcers} id="mouthc" />
              )}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------------------------- Liver palpation ---------------------------- */

/** Scene point under a screen position on the 2D stage's SVG. */
function svgPoint(from: HTMLElement, clientX: number, clientY: number): Pt | null {
  const svg = (from.parentElement?.querySelector('svg') ?? null) as SVGSVGElement | null
  const ctm = svg?.getScreenCTM()
  if (!svg || !ctm) return null
  const p = svg.createSVGPoint()
  p.x = clientX
  p.y = clientY
  const q = p.matrixTransform(ctm.inverse())
  return [q.x, q.y]
}

function LiverTask({
  toScene,
  lm,
  edgeY,
  onDone,
  onCancel,
  addEffect,
}: {
  toScene: (clientX: number, clientY: number, el: HTMLElement) => Pt | null
  lm: ReturnType<typeof landmarks>
  edgeY: number
  onDone: (detail: 'low' | 'high') => void
  onCancel: () => void
  addEffect: (k: EffectKind, at: Pt, label?: string, ms?: number) => void
}) {
  const [step, setStep] = useState<'choose' | 'moving'>('choose')
  const [caption, setCaption] = useState('Where will you start? Tap the abdomen.')
  return (
    <>
      <div className="pointer-events-none absolute top-3 left-1/2 z-30 w-max max-w-[92%] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-center text-[13px] font-medium text-white">
        {caption}
      </div>
      {step === 'choose' && (
        <div
          className="absolute inset-0 z-20 cursor-crosshair"
          onPointerDown={(e) => {
            const pt = toScene(e.clientX, e.clientY, e.currentTarget)
            if (!pt) return
            const q = { x: pt[0], y: pt[1] }
            const low = q.y > Math.max(edgeY + 8, 318) && q.x < 20
            setStep('moving')
            const start: Pt = [q.x, q.y]
            const end: Pt = [lm.mclR, lm.costalMarginR[3][1] + 4]
            const n = 4
            for (let i = 0; i <= n; i++) {
              const pt = lerpPt(start, end, i / n)
              window.setTimeout(() => {
                addEffect('light', pt, undefined, 900)
                setCaption(i === 0 ? '“Breathe in…”' : i < n ? 'Moving up 1–2 cm with each breath…' : 'Reaching the costal margin…')
              }, i * 650)
            }
            window.setTimeout(() => onDone(low ? 'low' : 'high'), (n + 1) * 650)
          }}
        />
      )}
      {step === 'choose' && (
        <div className="absolute inset-x-0 bottom-3 z-30 flex justify-center">
          <Button size="sm" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </>
  )
}
