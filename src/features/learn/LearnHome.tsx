import { ArrowRight, BookOpenText, CalendarCheck, ChevronRight, Layers, ListOrdered, Microscope, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { SCAR_INFO } from '../../anatomy/Scars'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { ProgressBar } from '../../components/ui/primitives'
import { SCHEDULE, TOPIC_BY_ID } from '../../content/curriculum'
import { dueCount, todayCardIds, topicCardIds } from '../../content/quiz'
import { Link } from '../../lib/router'
import { deckStats } from '../../lib/srs'
import { cn, plural } from '../../lib/utils'
import { useProgress } from '../../store/progress'
import { useStudy } from '../../store/study'
import { ROUTINES, routineSteps } from './routines'
import { SIGNS } from './signs'

/** Everything for studying in one place: quiz, session guides, examination routines, atlases. */
export default function LearnHome() {
  const drills = useProgress((s) => s.drills)
  const { cards, day } = useStudy()
  const due = dueCount(cards)
  const today = deckStats(todayCardIds(day), cards)

  return (
    <Page wide>
      <PageHeader eyebrow="Learn" title="Study, then test yourself" subtitle="Read a session guide, quiz yourself on it, learn the examination routine — then go and see the patient." />

      {/* Quiz */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-[1.3fr_1fr]">
        <Link to="/quiz" className="group flex items-center gap-4 rounded-3xl bg-surface-1 p-5 ring-1 ring-line shadow-(--shadow-soft) transition hover:ring-accent/40 sm:p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-fg">
            <Sparkles size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold text-ink">Quiz</div>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted">Ward-round and viva questions as flashcards. What you miss comes back sooner.</p>
            <div className="mt-2.5 flex items-center gap-2">
              <ProgressBar value={today.total ? today.known / today.total : 0} height={4} className="max-w-[160px]" />
              <span className="shrink-0 text-[12px] text-muted tabular">
                Day {day}: {today.known}/{today.total}
              </span>
            </div>
          </div>
          <ChevronRight size={20} className="shrink-0 text-faint transition group-hover:translate-x-0.5" />
        </Link>
        <Link
          to={due ? '/quiz?deck=due' : '/quiz?deck=today'}
          className={cn('group flex items-center gap-4 rounded-3xl p-5 ring-1 transition sm:p-6', due ? 'bg-warning/10 ring-warning/30 hover:ring-warning/60' : 'bg-surface-1 ring-line hover:ring-accent/40')}
        >
          <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', due ? 'bg-warning/15 text-warning' : 'bg-accent-soft text-accent')}>
            <CalendarCheck size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold text-ink">{due ? `${plural(due, 'review')} due` : `Quiz Day ${day}`}</div>
            <p className="mt-0.5 text-[13px] text-muted">{due ? 'Clear these first.' : 'Nothing due — learn today’s questions.'}</p>
          </div>
          <ArrowRight size={18} className="shrink-0 text-faint transition group-hover:translate-x-0.5" />
        </Link>
      </section>

      {/* Session guides */}
      <Heading icon={<BookOpenText size={14} />}>Session guides</Heading>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SCHEDULE.map((s) => {
          const t = TOPIC_BY_ID[s.topic]
          const st = deckStats(topicCardIds(t.id), cards)
          return (
            <Link key={t.id} to={`/topic/${t.id}`} className="group flex items-center gap-3 rounded-2xl bg-surface-1 p-3.5 ring-1 ring-line transition hover:ring-accent/40">
              <span className="w-11 shrink-0 text-center text-[10.5px] leading-tight font-semibold text-faint uppercase">
                Day
                <br />
                <span className="text-[16px] text-ink">{s.day}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-ink">{t.title}</div>
                <div className="mt-1 flex items-center gap-2">
                  <ProgressBar value={st.total ? st.known / st.total : 0} height={4} className="max-w-[110px]" tone={st.known === st.total ? 'success' : 'accent'} />
                  <span className="text-[11.5px] text-muted tabular">
                    {st.known}/{st.total} Qs
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-faint" />
            </Link>
          )
        })}
      </div>

      {/* Routines */}
      <Heading icon={<ListOrdered size={14} />}>Examination routines</Heading>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ROUTINES.map((r, i) => {
          const d = drills[`drill:${r.kind}`]
          const mastery = d ? d.correct / Math.max(1, d.seen) : 0
          const Icon = r.icon
          return (
            <motion.div key={r.kind} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Link to={`/learn/routine/${r.kind}`} className="group flex h-full gap-3.5 rounded-2xl bg-surface-1 p-4 ring-1 ring-line transition hover:ring-accent/40">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[14.5px] font-semibold text-ink">{r.title}</div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{r.blurb}</p>
                  <div className="mt-2.5 flex items-center gap-2 text-[11px] text-faint">
                    <span className="shrink-0">
                      {routineSteps(r.kind).length} steps · ~{r.minutes} min
                    </span>
                    <ProgressBar value={mastery} className="max-w-[90px]" height={4} tone={mastery >= 0.8 ? 'success' : 'accent'} />
                    <span className="font-mono tabular">{d ? `${Math.round(mastery * 100)}%` : ''}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Train */}
      <Heading icon={<Layers size={14} />}>Practise the details</Heading>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TrainCard to="/learn/drill" icon={<ListOrdered size={20} />} tone="accent" title="Sequence drills" body="Put the examination steps in Macleod’s order against the clock." cta="Start a drill" />
        <TrainCard to="/learn/signs" icon={<Microscope size={20} />} tone="info" title="Signs atlas" body={`${SIGNS.length} clinical signs — what they look like, what they mean, how to elicit them.`} cta="Browse signs" />
        <TrainCard to="/learn/scars" icon={<Layers size={20} />} tone="violet" title="Scar atlas" body={`${Object.keys(SCAR_INFO).length} surgical incisions on a 3D torso — name the scar, name the operation.`} cta="Open the atlas" />
      </div>
    </Page>
  )
}

function Heading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="mt-9 mb-3 flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.14em] text-faint uppercase">
      {icon} {children}
    </h2>
  )
}

function TrainCard({ to, icon, title, body, cta, tone }: { to: string; icon: ReactNode; title: string; body: string; cta: string; tone: 'accent' | 'info' | 'violet' }) {
  const toneCls = { accent: 'bg-accent-soft text-accent', info: 'bg-info/12 text-info', violet: 'bg-violet/12 text-violet' }[tone]
  return (
    <Link to={to} className="group flex flex-col rounded-2xl bg-surface-1 p-5 ring-1 ring-line transition hover:ring-accent/40">
      <span className={cn('grid h-11 w-11 place-items-center rounded-xl', toneCls)}>{icon}</span>
      <div className="mt-4 text-[16px] font-semibold text-ink">{title}</div>
      <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{body}</p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
        {cta} <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
