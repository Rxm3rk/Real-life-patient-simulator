/**
 * The rotation curriculum: the Group C clinical sessions, one topic guide per
 * session (what to ask, how to examine — after Macleod’s — what to request and
 * what to do), the cases that belong to it, and a bank of ward-round questions.
 *
 * Text uses a light markup rendered by `Rich`: **bold** for the lead of a point.
 */

export type TopicId =
  | 'bariatric'
  | 'complicated-hernia'
  | 'acute-abdomen'
  | 'distension'
  | 'breast'
  | 'dysphagia'
  | 'jaundice'
  | 'gi-bleeding'
  | 'periop'
  | 'epigastric'
  | 'neck-lump'
  | 'perianal'

/** A point, optionally with sub-points. */
export type Bullet = string | { t: string; sub: string[] }

export interface Section {
  id: string
  title: string
  /** One or two sentences before the points */
  intro?: string
  /** 'steps' numbers the points (an examination sequence) */
  kind?: 'list' | 'steps'
  items?: Bullet[]
  table?: { head: string[]; rows: string[][] }
  /** Shown after the points, e.g. a mnemonic */
  note?: string
  /** Where it comes from, e.g. “Macleod’s 14e · Ch 6 · pp 104–110” */
  source?: string
}

export interface QA {
  q: string
  a: string
  /** Extra words people might search with (abbreviations, synonyms) */
  k?: string[]
}

export interface Topic {
  id: TopicId
  title: string
  /** Short name for chips */
  short: string
  /** One paragraph: what the session is about */
  blurb: string
  /** The five or six things to know walking into the session */
  keyPoints: string[]
  sections: Section[]
  /** Cases on the ward that belong to this topic */
  cases: string[]
  qa: QA[]
}

export interface Session {
  day: number
  slot: 'am' | 'pm'
  time: string
  topic: TopicId
}
