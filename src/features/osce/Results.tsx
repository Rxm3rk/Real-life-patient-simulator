import { ArrowLeft, ChevronRight, Link2, RotateCcw, Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Badge, ProgressBar, ProgressRing } from '../../components/ui/primitives'
import { CASE_META } from '../../content/cases'
import { challengeLink } from '../../lib/deeplink'
import { Link, navigate } from '../../lib/router'
import { shareLink } from '../../lib/share'
import { useCaseDefs } from '../../lib/useCases'
import { formatDuration } from '../../lib/utils'
import { passed, useOsce } from '../../store/osce'
import { useProgress } from '../../store/progress'
import { EXAM_LABEL } from '../ward/Ward'

export default function Results({ id }: { id: string }) {
  const circuit = useOsce((s) => s.history.find((h) => h.id === id))
  const create = useOsce((s) => s.create)
  const attempts = useProgress((s) => s.attempts)
  const defs = useCaseDefs(circuit?.stations.map((s) => s.caseId) ?? [])

  if (!circuit) return <Page>Circuit not found.</Page>

  const done = circuit.stations.filter((s) => s.pct !== undefined)
  const avg = done.length ? done.reduce((a, s) => a + (s.pct ?? 0), 0) / done.length : 0
  const pass = circuit.stations.filter((s) => passed(s.grade)).length
  const need = Math.ceil(circuit.stations.length * 0.6)
  const overall = pass >= need && avg >= 0.6

  const share = () =>
    shareLink({
      title: 'Bedside OSCE challenge',
      text: `I passed ${pass}/${circuit.stations.length} stations (${Math.round(avg * 100)}%) on a Bedside surgical OSCE circuit. Your turn:`,
      url: challengeLink(
        circuit.stations.map((s) => s.caseId),
        circuit.seconds,
      ),
      copyText: true,
      copied: 'Challenge copied',
      copiedBody: 'Send it to your friends — same stations, same marking.',
    })

  return (
    <Page>
      <button onClick={() => navigate('/osce')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> OSCE
      </button>
      <PageHeader eyebrow="Circuit results" title={overall ? 'You passed the circuit' : 'Not quite this time'} subtitle={`${circuit.stations.length} stations · ${Math.round(circuit.seconds / 60)} min each`} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-3xl bg-surface-1 p-5 ring-1 ring-line sm:col-span-1">
          <ProgressRing value={avg} size={84} stroke={8} color={overall ? 'var(--success)' : 'var(--warning)'}>
            <span className="font-mono text-lg font-semibold text-ink tabular">{Math.round(avg * 100)}%</span>
          </ProgressRing>
          <div>
            <div className="text-[12px] font-semibold tracking-wider text-faint uppercase">Average</div>
            <div className="text-[14px] text-muted">across stations</div>
          </div>
        </div>
        <div className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line">
          <div className="text-[12px] font-semibold tracking-wider text-faint uppercase">Stations passed</div>
          <div className="mt-1 font-mono text-3xl font-semibold text-ink tabular">
            {pass}
            <span className="text-lg text-faint">/{circuit.stations.length}</span>
          </div>
          <div className="mt-1 text-[12.5px] text-muted">Pass mark: {need} stations and ≥ 60% overall</div>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-3xl bg-surface-1 p-5 ring-1 ring-line">
          <Button onClick={share} leading={<Link2 size={16} />}>
            Challenge friends
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              create(
                circuit.stations.map((s) => s.caseId),
                circuit.seconds,
                circuit.type,
              )
              navigate('/osce/run')
            }}
            leading={<RotateCcw size={16} />}
          >
            Retake this circuit
          </Button>
        </div>
      </motion.div>

      <div className="mt-8 space-y-2.5">
        {circuit.stations.map((s, i) => {
          const meta = CASE_META[s.caseId]
          const d = defs[s.caseId]
          const rec = attempts.find((a) => a.attemptId === s.attemptId)
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link
                to={s.attemptId && rec ? `/debrief/${s.attemptId}` : `/case/${s.caseId}`}
                className="group flex items-center gap-4 rounded-2xl bg-surface-1 p-4 ring-1 ring-line transition hover:ring-accent/40"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 font-mono text-[15px] font-semibold text-ink">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[14.5px] font-semibold text-ink">{d?.title ?? meta.presenting}</span>
                    <Badge>{EXAM_LABEL[meta.exam]}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <ProgressBar value={s.pct ?? 0} tone={passed(s.grade) ? 'success' : s.pct === undefined ? 'info' : 'danger'} className="max-w-[220px]" />
                    <span className="font-mono text-[12.5px] text-muted tabular">{s.pct === undefined ? 'not attempted' : `${Math.round(s.pct * 100)}%`}</span>
                    {rec && <span className="hidden text-[12px] text-faint sm:inline">{formatDuration(rec.durationSec)}</span>}
                  </div>
                </div>
                {s.grade && <Badge tone={passed(s.grade) ? 'success' : 'danger'}>{s.grade}</Badge>}
                <ChevronRight size={18} className="shrink-0 text-faint transition group-hover:text-ink" />
              </Link>
            </motion.div>
          )
        })}
      </div>
      {overall && (
        <div className="mt-6 flex items-center gap-2 text-[13px] text-success">
          <Trophy size={16} /> Consistent passes across different systems is exactly what examiners look for.
        </div>
      )}
    </Page>
  )
}
