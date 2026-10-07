import acuteAbdomen from './topics/acute-abdomen'
import bariatric from './topics/bariatric'
import breast from './topics/breast'
import complicatedHernia from './topics/complicated-hernia'
import distension from './topics/distension'
import dysphagia from './topics/dysphagia'
import epigastric from './topics/epigastric'
import giBleeding from './topics/gi-bleeding'
import jaundice from './topics/jaundice'
import neckLump from './topics/neck-lump'
import perianal from './topics/perianal'
import periop from './topics/periop'
import { SCHEDULE } from './schedule'
import type { Topic, TopicId } from './types'

export { GENERAL_QA } from './general'
export { DAYS, SCHEDULE, sessionOf, sessionsOn } from './schedule'
export type { Bullet, QA, Section, Session, Topic, TopicId } from './types'

const ALL: Record<TopicId, Topic> = {
  bariatric,
  'complicated-hernia': complicatedHernia,
  'acute-abdomen': acuteAbdomen,
  distension,
  breast,
  dysphagia,
  jaundice,
  'gi-bleeding': giBleeding,
  periop,
  epigastric,
  'neck-lump': neckLump,
  perianal,
}

/** Topics in schedule order. */
export const TOPICS: Topic[] = SCHEDULE.map((s) => ALL[s.topic])
export const TOPIC_BY_ID = ALL

/** The schedule topics a case belongs to. */
export function topicsForCase(caseId: string): Topic[] {
  return TOPICS.filter((t) => t.cases.includes(caseId))
}
