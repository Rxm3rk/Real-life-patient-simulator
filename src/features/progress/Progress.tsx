import { CalendarCheck, ChevronRight, LineChart, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarList, ScoreLine } from '../../components/charts'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Badge, EmptyState, ProgressBar } from '../../components/ui/primitives'
import { Sheet } from '../../components/ui/Sheet'
import { CASE_META } from '../../content/cases'
import { TOPICS } from '../../content/curriculum'
import { dueCount, GENERAL_IDS, topicCardIds } from '../../content/quiz'
import { deckStats } from '../../lib/srs'
import { useStudy } from '../../store/study'
import { Link, navigate } from '../../lib/router'
import { MODES } from '../../lib/modes'
import { cn, formatDuration, timeAgo } from '../../lib/utils'
import { useProgress } from '../../store/progress'

export default function Progress() {
  const attempts = useProgress((s) => s.attempts)
  const clear = useProgress((s) => s.clear)
  const [confirm, setConfirm] = useState(false)

  const data = useMemo(() => {
    const chrono = attempts.slice().reverse()
    const recent = chrono.slice(-20)
    const n = attempts.length
    const avg = n ? attempts.reduce((a, x) => a + x.pct, 0) / n : 0
    const best = n ? Math.max(...attempts.map((a) => a.pct)) : 0
    const dxRate = n ? attempts.filter((a) => a.diagnosisCorrect).length / n : 0
    const time = attempts.reduce((a, x) => a + x.durationSec, 0)
    const dom = new Map<string, { label: string; sum: number; n: number }>()
    for (const a of attempts)
      for (const d of a.domains) {
        const e = dom.get(d.id) ?? { label: d.label, sum: 0, n: 0 }
        e.sum += d.pct
        e.n++
        dom.set(d.id, e)
      }
    const missed = new Map<string, { label: string; n: number }>()
    for (const a of attempts)
      for (const m of a.missedSteps) {
        const e = missed.get(m.id) ?? { label: m.label, n: 0 }
        e.n++
        missed.set(m.id, e)
      }
    const missedTop = [...missed.values()].sort((a, b) => b.n - a.n).slice(0, 8)
    return {
      points: recent.map((a) => ({ x: a.at, y: a.pct, label: CASE_META[a.caseId]?.presenting ?? a.caseId, sub: `${a.grade} · ${new Date(a.at).toLocaleDateString()}` })),
      n,
      avg,
      best,
      dxRate,
      time,
      domains: [...dom.values()].map((d) => ({ label: d.label, value: d.sum / d.n })),
      missedTop,
      missedMax: Math.max(1, ...missedTop.map((m) => m.n)),
    }
  }, [attempts])

  if (!attempts.length) {
    return (
      <Page wide>
        <PageHeader eyebrow="Your training log" title="Progress" subtitle="Stored privately on this device." />
        <QuestionBank />
        <h2 className="mt-8 mb-3 text-[17px] font-semibold text-ink">Patients</h2>
        <EmptyState
          icon={<LineChart size={28} />}
          title="No patients seen yet"
          body="See a patient and your marked attempts, trends and most-missed steps appear here."
          action={
            <Button variant="primary" onClick={() => navigate('/ward')}>
              See a patient
            </Button>
          }
        />
      </Page>
    )
  }

  return (
    <Page wide>
      <PageHeader
        eyebrow="Your training log"
        title="Progress"
        subtitle="Stored privately on this device."
        actions={
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} leading={<Trash2 size={15} />}>
            Clear
          </Button>
        }
      />

      <QuestionBank />

      <h2 className="mt-8 mb-3 text-[17px] font-semibold text-ink">Patients</h2>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Stations" value={String(data.n)} />
        <Tile label="Average score" value={`${Math.round(data.avg * 100)}%`} />
        <Tile label="Best score" value={`${Math.round(data.best * 100)}%`} />
        <Tile label="Correct diagnoses" value={`${Math.round(data.dxRate * 100)}%`} />
        <Tile label="Time practised" value={formatDuration(data.time)} />
      </section>

      <section className="mt-6 rounded-3xl bg-surface-1 p-5 ring-1 ring-line sm:p-6">
        <h2 className="text-[16px] font-semibold text-ink">Score over your last {data.points.length} stations</h2>
        <p className="mt-0.5 text-[13px] text-muted">Hover or use the arrow keys to see each attempt.</p>
        <div className="mt-4">
          <ScoreLine points={data.points} />
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line sm:p-6">
          <h2 className="text-[16px] font-semibold text-ink">Average by domain</h2>
          <p className="mt-0.5 mb-4 text-[13px] text-muted">Where you gain and lose marks.</p>
          <BarList items={data.domains} />
        </section>
        <section className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line sm:p-6">
          <h2 className="text-[16px] font-semibold text-ink">Most-missed steps</h2>
          <p className="mt-0.5 mb-4 text-[13px] text-muted">Times missed across all stations.</p>
          <BarList items={data.missedTop.map((m) => ({ label: m.label, value: m.n }))} max={data.missedMax} format={(v) => `×${v}`} />
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-line">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[16px] font-semibold text-ink">All attempts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13.5px]">
            <thead>
              <tr className="text-[11px] tracking-[0.1em] text-faint uppercase">
                <th className="px-5 py-2.5 font-semibold">Patient</th>
                <th className="px-3 py-2.5 font-semibold">Mode</th>
                <th className="px-3 py-2.5 font-semibold">When</th>
                <th className="px-3 py-2.5 text-right font-semibold">Score</th>
                <th className="px-5 py-2.5 font-semibold">Grade</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.attemptId} className="border-t border-line hover:bg-surface-2/50">
                  <td className="px-5 py-2.5">
                    <Link to={`/debrief/${a.attemptId}`} className="font-medium text-ink hover:text-accent">
                      {CASE_META[a.caseId]?.presenting ?? a.caseId}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted">{MODES[a.mode].label}</td>
                  <td className="px-3 py-2.5 text-muted">{timeAgo(a.at)}</td>
                  <td className={cn('px-3 py-2.5 text-right font-mono font-semibold tabular', a.pct >= 0.72 ? 'text-success' : a.pct >= 0.55 ? 'text-warning' : 'text-danger')}>{Math.round(a.pct * 100)}%</td>
                  <td className="px-5 py-2.5">
                    <Badge tone={a.grade === 'Fail' ? 'danger' : a.grade === 'Borderline' ? 'warning' : 'success'}>{a.grade}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Clear all progress?"
        description="This permanently deletes every attempt stored on this device."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                clear()
                setConfirm(false)
              }}
            >
              Delete everything
            </Button>
          </div>
        }
      >
        <div />
      </Sheet>
    </Page>
  )
}

/** The question bank: how much of it you know, and what is due. */
function QuestionBank() {
  const cards = useStudy((s) => s.cards)
  const ids = [...TOPICS.flatMap((t) => topicCardIds(t.id)), ...GENERAL_IDS]
  const all = deckStats(ids, cards)
  const due = dueCount(cards)
  return (
    <section className="rounded-3xl bg-surface-1 p-5 ring-1 ring-line sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
            <Sparkles size={17} className="text-accent" /> Questions
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">The ward-round questions from the twelve session guides.</p>
        </div>
        <Button variant={due ? 'primary' : 'secondary'} size="sm" onClick={() => navigate(due ? '/quiz?deck=due' : '/quiz')} leading={<CalendarCheck size={15} />}>
          {due ? `Review ${due} due` : 'Quiz'}
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Tile label="Known" value={`${all.known}/${all.total}`} />
        <Tile label="Mastered" value={String(all.mastered)} hint="known 3+ times, spaced out" />
        <Tile label="Due now" value={String(due)} />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2.5 md:grid-cols-2">
        {TOPICS.map((t) => {
          const st = deckStats(topicCardIds(t.id), cards)
          return (
            <Link key={t.id} to={`/quiz?deck=topic:${t.id}`} className="group flex items-center gap-3">
              <span className="w-44 shrink-0 truncate text-[13px] text-ink group-hover:text-accent sm:w-52">{t.title}</span>
              <ProgressBar value={st.total ? st.known / st.total : 0} height={6} tone={st.known === st.total ? 'success' : 'accent'} />
              <span className="w-12 shrink-0 text-right font-mono text-[12px] text-muted tabular">
                {st.known}/{st.total}
              </span>
              <ChevronRight size={14} className="shrink-0 text-faint" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-surface-1 px-4 py-3.5 ring-1 ring-line">
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className="mt-1 text-[24px] leading-none font-semibold tracking-tight text-ink tabular">{value}</div>
      {hint && <div className="mt-1 hidden text-[11px] text-faint sm:block">{hint}</div>}
    </div>
  )
}
