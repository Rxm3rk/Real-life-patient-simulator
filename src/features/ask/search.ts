/**
 * Instant, offline search over the curriculum: every ward-round question and
 * answer, every point of every topic guide, and the cases. Built for a doctor
 * asking a question on a ward round — it forgives British/American spelling,
 * abbreviations (GORD, UGIB, DRE, Mx), plurals and the odd typo, and ranks the
 * answers people are most likely to want first.
 */

import type { Bullet, QA, Topic, TopicId } from '../../content/curriculum'

export type DocKind = 'qa' | 'point' | 'case'

export interface Doc {
  id: string
  kind: DocKind
  /** Question, section title or case title */
  title: string
  /** Answer, point or case summary (light markup allowed) */
  body: string
  topic?: TopicId
  section?: string
  sectionTitle?: string
  caseId?: string
  keywords?: string[]
}

export interface Hit {
  doc: Doc
  score: number
  /** Stemmed tokens that matched, for highlighting */
  terms: Set<string>
}

/* ---------------------------------------------------------------- text */

const STOP = new Set(
  'a an the of and or in on at to for by with from is are was were be been what which who whom how why when where do does did you your i me my it its this that these those than then there can could should would will shall may might must about into over under describe name list define tell explain give please'.split(
    ' ',
  ),
)

/** Lower-case, strip accents and markup, and fold British spellings onto American so either finds both. */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\*\*/g, '')
    .replace(/[’'`]/g, '')
    .replace(/β/g, 'beta')
    .replace(/α/g, 'alpha')
    .replace(/ae/g, 'e')
    .replace(/oe/g, 'e')
    .replace(/(tum|col|behavi|od|hum|fav|lab)our/g, '$1or')
    .replace(/is(e|ed|es|ing|ation|ations)\b/g, 'iz$1')
}

/** A light stemmer: plurals and common endings, so “hernias” finds “hernia” and “bleeding” finds “bleed”. */
export function stem(t: string): string {
  if (t.length <= 3) return t
  if (t.endsWith('ies') && t.length > 4) return `${t.slice(0, -3)}y`
  if (t.endsWith('ing') && t.length > 5) return trimE(t.slice(0, -3))
  if (t.endsWith('ed') && t.length > 4 && !t.endsWith('eed')) return trimE(t.slice(0, -2))
  if (t.endsWith('es') && t.length > 4 && /(ch|sh|ss|x|z)es$/.test(t)) return t.slice(0, -2)
  if (t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is')) return stem(t.slice(0, -1))
  // strangulation / strangulated / strangulate → strangulat
  if (t.endsWith('tion') && t.length > 6) return t.slice(0, -3)
  return trimE(t)
}

const trimE = (t: string) => (t.length > 4 && t.endsWith('e') && !t.endsWith('ee') ? t.slice(0, -1) : t)

export function tokens(s: string): string[] {
  return normalise(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t))
    .map(stem)
}

/** Abbreviations and synonyms: a query word also matches any of these (each a phrase that must all appear). */
const SYNONYMS: Record<string, string[]> = {
  gord: ['gerd', 'reflux'],
  gerd: ['gord', 'reflux'],
  ugib: ['upper gi bleed', 'haematemesis', 'melaena'],
  lgib: ['lower gi bleed', 'rectal bleed'],
  gib: ['gi bleed'],
  sbo: ['small bowel obstruction'],
  lbo: ['large bowel obstruction'],
  aaa: ['aortic aneurysm'],
  pud: ['peptic ulcer'],
  du: ['duodenal ulcer'],
  gu: ['gastric ulcer'],
  hp: ['pylori'],
  hpylori: ['pylori'],
  ca: ['cancer', 'carcinoma'],
  cancer: ['carcinoma', 'malignancy', 'tumor'],
  tumor: ['cancer', 'carcinoma'],
  dre: ['rectal examination', 'pr'],
  pr: ['rectal', 'dre'],
  lap: ['laparoscopic'],
  chole: ['cholecystectomy'],
  cholecystectomy: ['chole'],
  ogd: ['endoscopy', 'gastroscopy'],
  endoscopy: ['ogd'],
  cxr: ['chest x ray', 'chest xray'],
  axr: ['abdominal x ray', 'abdominal xray'],
  xray: ['x ray', 'radiograph'],
  ct: ['computed tomography'],
  us: ['ultrasound'],
  uss: ['ultrasound'],
  usg: ['ultrasound'],
  fna: ['fine needle', 'cytology'],
  fnac: ['fine needle', 'cytology'],
  nbm: ['nil by mouth', 'fasting'],
  abx: ['antibiotic'],
  mx: ['management', 'treatment', 'treat'],
  tx: ['treatment', 'treat', 'management'],
  rx: ['treatment', 'treat'],
  treatment: ['management', 'treat'],
  management: ['treatment', 'manage'],
  dx: ['diagnosis', 'diagnose'],
  ddx: ['differential'],
  ix: ['investigation', 'investigate', 'test'],
  investigation: ['test', 'imaging'],
  hx: ['history'],
  ex: ['examination', 'examine'],
  exam: ['examination', 'examine'],
  examination: ['examine', 'exam'],
  sx: ['symptom', 'sign'],
  cause: ['etiology', 'causes', 'due'],
  etiology: ['cause'],
  complication: ['complicat'],
  sign: ['signs', 'feature'],
  feature: ['sign', 'present'],
  mi: ['myocardial infarction'],
  dka: ['diabetic ketoacidosis'],
  vte: ['dvt', 'thromboembolism', 'pe'],
  dvt: ['vte', 'thrombosis'],
  pe: ['pulmonary embolism'],
  bmi: ['body mass index'],
  rif: ['right iliac fossa'],
  lif: ['left iliac fossa'],
  ruq: ['right upper quadrant', 'right hypochondrium'],
  luq: ['left upper quadrant', 'left hypochondrium'],
  rhc: ['right hypochondrium', 'right upper quadrant'],
  epigastrium: ['epigastric'],
  epigastric: ['epigastrium'],
  piles: ['haemorrhoid'],
  haemorrhoid: ['pile'],
  hemorrhoid: ['pile'],
  lump: ['mass', 'swelling'],
  mass: ['lump', 'swelling'],
  swelling: ['lump', 'mass'],
  jaundice: ['icter', 'bilirubin'],
  ercp: ['endoscopic retrograde'],
  mrcp: ['magnetic resonance cholangio'],
  whipple: ['pancreaticoduodenectomy'],
  nissen: ['fundoplication'],
  rygb: ['roux', 'gastric bypass'],
  bypass: ['rygb'],
  sleeve: ['sleeve gastrectomy'],
  news: ['early warning'],
  asa: ['american society'],
  sepsis: ['septic'],
  op: ['operation', 'operative', 'surgery'],
  postop: ['post operative', 'postoperative'],
  preop: ['pre operative', 'preoperative'],
  periop: ['peri operative', 'perioperative'],
  thyroid: ['thyroid'],
  tft: ['thyroid function'],
  lft: ['liver function'],
  fbc: ['blood count'],
  ue: ['urea', 'electrolyte'],
  crp: ['c reactive'],
}

/** The synonym table keyed by normalised, stemmed words (as queries are). */
const SYN = new Map<string, string[]>()
for (const [k, v] of Object.entries(SYNONYMS)) {
  const key = tokens(k)[0] ?? k
  SYN.set(key, [...(SYN.get(key) ?? []), ...v])
}

/* --------------------------------------------------------------- index */

interface Posting {
  doc: number
  /** 3 title, 2.5 keyword, 1 body */
  w: number
}

export interface SearchIndex {
  docs: Doc[]
  vocab: string[]
  postings: Map<string, Posting[]>
  idf: Map<string, number>
  /** Normalised titles, for phrase bonuses */
  titles: string[]
}

const flat = (b: Bullet): string[] => (typeof b === 'string' ? [b] : [b.t, ...b.sub])

/** One document per question, per topic point (and table row) and per key point. */
export function topicDocs(t: Topic): Doc[] {
  const out: Doc[] = []
  t.qa.forEach((qa: QA, i) => out.push({ id: `${t.id}:qa:${i}`, kind: 'qa', title: qa.q, body: qa.a, keywords: qa.k, topic: t.id }))
  t.keyPoints.forEach((p, i) => out.push({ id: `${t.id}:key:${i}`, kind: 'point', title: 'Key points', body: p, topic: t.id, section: 'key', sectionTitle: 'Key points' }))
  for (const s of t.sections) {
    let n = 0
    for (const b of s.items ?? []) for (const p of flat(b)) out.push({ id: `${t.id}:${s.id}:${n++}`, kind: 'point', title: s.title, body: p, topic: t.id, section: s.id, sectionTitle: s.title })
    for (const row of s.table?.rows ?? [])
      out.push({
        id: `${t.id}:${s.id}:row${n++}`,
        kind: 'point',
        title: s.title,
        body: row.map((c, i) => (i === 0 ? `**${c}**` : c)).join(' — '),
        topic: t.id,
        section: s.id,
        sectionTitle: s.title,
      })
    if (s.note) out.push({ id: `${t.id}:${s.id}:note`, kind: 'point', title: s.title, body: s.note, topic: t.id, section: s.id, sectionTitle: s.title })
  }
  return out
}

export function buildIndex(docs: Doc[]): SearchIndex {
  const postings = new Map<string, Posting[]>()
  const add = (tok: string, doc: number, w: number) => {
    let list = postings.get(tok)
    if (!list) postings.set(tok, (list = []))
    const last = list[list.length - 1]
    if (last && last.doc === doc) last.w = Math.max(last.w, w)
    else list.push({ doc, w })
  }
  docs.forEach((d, i) => {
    for (const t of tokens(d.title)) add(t, i, d.kind === 'qa' ? 3 : 1.6)
    for (const k of d.keywords ?? []) for (const t of tokens(k)) add(t, i, 2.5)
    for (const t of tokens(d.body)) add(t, i, d.kind === 'qa' ? 1 : 2)
    if (d.sectionTitle) for (const t of tokens(d.sectionTitle)) add(t, i, 0.8)
  })
  const N = docs.length
  const idf = new Map<string, number>()
  for (const [t, list] of postings) idf.set(t, Math.log(1 + N / list.length))
  return { docs, vocab: [...postings.keys()].sort(), postings, idf, titles: docs.map((d) => normalise(d.title)) }
}

/* --------------------------------------------------------------- query */

function editDistanceAtMost1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else {
      i++
      j++
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

/** Vocabulary tokens matching one query token, with how well they match (1 exact, 0.85 prefix, 0.6 one typo). */
function expand(idx: SearchIndex, q: string, last: boolean): Map<string, number> {
  const out = new Map<string, number>()
  if (idx.postings.has(q)) out.set(q, 1)
  // prefix: always for the word being typed; otherwise for longer words
  if (q.length >= 3 && (last || q.length >= 4)) {
    let lo = 0
    let hi = idx.vocab.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (idx.vocab[mid] < q) lo = mid + 1
      else hi = mid
    }
    for (let k = lo; k < idx.vocab.length && idx.vocab[k].startsWith(q); k++) if (!out.has(idx.vocab[k])) out.set(idx.vocab[k], 0.85)
  }
  if (q.length >= 5 && out.size === 0) for (const v of idx.vocab) if (v[0] === q[0] && editDistanceAtMost1(q, v)) out.set(v, 0.6)
  return out
}

export interface SearchOptions {
  limit?: number
  topics?: Set<TopicId>
  kinds?: Set<DocKind>
}

export function search(idx: SearchIndex, query: string, opts: SearchOptions = {}): Hit[] {
  const qs = tokens(query)
  if (!qs.length) return []
  const scores = new Map<number, { s: number; covered: number; terms: Set<string> }>()
  qs.forEach((q, qi) => {
    const last = qi === qs.length - 1
    // the word itself, then its synonyms (worth a little less)
    const alts: { toks: string[]; f: number }[] = [{ toks: [q], f: 1 }]
    for (const phrase of SYN.get(q) ?? []) {
      const toks = tokens(phrase)
      if (toks.length) alts.push({ toks, f: 0.8 })
    }
    const best = new Map<number, { w: number; terms: string[] }>()
    for (const alt of alts) {
      // every word of a synonym phrase must match the same document
      let docW: Map<number, { w: number; terms: string[] }> | null = null
      for (const t of alt.toks) {
        const m = new Map<number, { w: number; terms: string[] }>()
        for (const [v, quality] of expand(idx, t, last && alt.toks.length === 1)) {
          const idf = idx.idf.get(v) ?? 1
          for (const p of idx.postings.get(v)!) {
            const w = quality * p.w * idf * alt.f
            const cur = m.get(p.doc)
            if (!cur || w > cur.w) m.set(p.doc, { w, terms: [v] })
          }
        }
        if (!docW) docW = m
        else {
          const next = new Map<number, { w: number; terms: string[] }>()
          for (const [d, a] of docW) {
            const b = m.get(d)
            if (b) next.set(d, { w: (a.w + b.w) / 2, terms: [...a.terms, ...b.terms] })
          }
          docW = next
        }
      }
      for (const [d, v] of docW ?? []) {
        const cur = best.get(d)
        if (!cur || v.w > cur.w) best.set(d, v)
      }
    }
    for (const [d, v] of best) {
      const cur = scores.get(d) ?? { s: 0, covered: 0, terms: new Set<string>() }
      cur.s += v.w
      cur.covered++
      v.terms.forEach((t) => cur.terms.add(t))
      scores.set(d, cur)
    }
  })

  const phrase = normalise(query).trim()
  const hits: Hit[] = []
  for (const [d, v] of scores) {
    const doc = idx.docs[d]
    if (opts.topics && (!doc.topic || !opts.topics.has(doc.topic))) continue
    if (opts.kinds && !opts.kinds.has(doc.kind)) continue
    const coverage = v.covered / qs.length
    let s = v.s * coverage * coverage
    if (phrase.length > 3 && idx.titles[d].includes(phrase)) s *= 1.6
    if (doc.kind === 'qa') s *= 1.15
    hits.push({ doc, score: s, terms: v.terms })
  }
  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, opts.limit ?? 40)
}
