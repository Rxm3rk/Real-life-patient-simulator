import { ArrowRight, BookOpenText, Brain, Layers, ListOrdered, Microscope, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { ProgressBar } from '../../components/ui/primitives'
import { SCAR_INFO } from '../../anatomy/Scars'
import { Link } from '../../lib/router'
import { cn } from '../../lib/utils'
import { useProgress } from '../../store/progress'
import { ROUTINES, routineSteps } from './routines'
import { SIGNS } from './signs'

export default function LearnHome() {
  const drills = useProgress((s) => s.drills)
  return (
    <Page wide>
      <PageHeader
        eyebrow="Learn"
        title="Learn the routines. Then own them."
        subtitle="Every examination follows the sequence in Macleod’s Clinical Examination. Study a routine, drill its order until it’s automatic, then perform it on a patient."
      />

      <section>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">
          <BookOpenText size={14} /> Examination routines
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ROUTINES.map((r, i) => {
            const d = drills[`drill:${r.kind}`]
            const mastery = d ? d.correct / Math.max(1, d.seen) : 0
            const Icon = r.icon
            return (
              <motion.div key={r.kind} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Link
                  to={`/learn/routine/${r.kind}`}
                  className="group flex h-full flex-col rounded-2xl bg-surface-1 p-4 ring-1 ring-line shadow-(--shadow-soft) transition hover:ring-accent/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                      <Icon size={19} />
                    </span>
                    <span className="text-[11.5px] font-medium text-faint">
                      {routineSteps(r.kind).length} steps · ~{r.minutes} min
                    </span>
                  </div>
                  <div className="mt-3 text-[15px] font-semibold text-ink">{r.title}</div>
                  <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-muted">{r.blurb}</p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-faint">
                      <span>Sequence mastery</span>
                      <span className="font-mono tabular">{d ? `${Math.round(mastery * 100)}%` : '—'}</span>
                    </div>
                    <ProgressBar value={mastery} className="mt-1" height={4} tone={mastery >= 0.8 ? 'success' : 'accent'} />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">
          <Sparkles size={14} /> Train
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <TrainCard to="/learn/drill" icon={<ListOrdered size={20} />} tone="accent" title="Sequence drills" body="Tap the steps in Macleod’s order against the clock. Mistakes are the lesson." cta="Start a drill" />
          <TrainCard to="/learn/signs" icon={<Microscope size={20} />} tone="info" title="Signs atlas" body={`${SIGNS.length} clinical signs drawn from real anatomy — what they look like, what they mean, how to elicit them.`} cta="Browse signs" />
          <TrainCard to="/learn/scars" icon={<Layers size={20} />} tone="violet" title="Scar atlas" body={`${Object.keys(SCAR_INFO).length} surgical incisions on a real torso — name the scar, name the operation.`} cta="Open the atlas" />
          <TrainCard to="/learn/viva" icon={<Brain size={20} />} tone="warning" title="Viva flashcards" body="Every examiner question from every case, with model answers and spaced repetition." cta="Quiz me" />
        </div>
      </section>
    </Page>
  )
}

function TrainCard({ to, icon, title, body, cta, tone }: { to: string; icon: React.ReactNode; title: string; body: string; cta: string; tone: 'accent' | 'info' | 'violet' | 'warning' }) {
  const toneCls = { accent: 'bg-accent-soft text-accent', info: 'bg-info/12 text-info', violet: 'bg-violet/12 text-violet', warning: 'bg-warning/12 text-warning' }[tone]
  return (
    <Link to={to} className="group flex flex-col rounded-2xl bg-surface-1 p-5 ring-1 ring-line shadow-(--shadow-soft) transition hover:ring-accent/40">
      <span className={cn('grid h-11 w-11 place-items-center rounded-xl', toneCls)}>{icon}</span>
      <div className="mt-4 text-[16px] font-semibold text-ink">{title}</div>
      <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{body}</p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
        {cta} <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
