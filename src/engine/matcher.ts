import { INTENTS, type Intent } from '../content/intents'

/**
 * Offline natural-language matcher for history taking. Students can type or
 * speak questions in their own words; we map them to intents using TF-IDF
 * cosine similarity over example phrasings, a clinical synonym table, simple
 * stemming and typo tolerance. Compound questions ("any nausea or vomiting?")
 * are split and answered together.
 */

const CONTRACTIONS: [RegExp, string][] = [
  [/\bwhat's\b/g, 'what is'],
  [/\bwhere's\b/g, 'where is'],
  [/\bhow's\b/g, 'how is'],
  [/\bi'm\b/g, 'i am'],
  [/\byou're\b/g, 'you are'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bhaven't\b/g, 'have not'],
  [/\bhasn't\b/g, 'has not'],
  [/\bcan't\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\bisn't\b/g, 'is not'],
  [/\bi've\b/g, 'i have'],
  [/\byou've\b/g, 'you have'],
  [/\bi'll\b/g, 'i will'],
  [/\blet's\b/g, 'let us'],
]

/** Clinical & lay synonyms → canonical tokens. Order matters (multi-word first). */
const SYNONYMS: [RegExp, string][] = [
  [/\bthrow(?:ing|n)? up\b|\bthrew up\b|\bbeen sick\b|\bbrought (?:anything|something) up\b|\bpuk(?:e|ed|ing)\b|\bemesis\b/g, 'vomit'],
  [/\bfeel(?:ing)? sick\b|\bqueasy\b|\bnauseous\b|\bnauseated\b/g, 'nausea'],
  [/\bnumber two\b|\bbowel movements?\b|\bpoo(?:p|ed)?\b|\bpoos\b|\bstools?\b|\bfaeces\b|\bfeces\b|\bmotions?\b/g, 'stool'],
  [/\bpass(?:ing)? water\b|\bpee(?:ing)?\b|\bwee(?:ing)?\b|\burinat(?:e|ing|ion)\b|\bmicturition\b/g, 'urine'],
  [/\bpass(?:ing|ed)? (?:gas|wind)\b|\bfart(?:s|ing|ed)?\b|\bflatus\b|\bwind\b/g, 'flatus'],
  [/\btummy\b|\bbelly\b|\babdominal\b|\babdo\b/g, 'abdomen'],
  [/\bhurt(?:s|ing)?\b|\bsore(?:ness)?\b|\baching\b|\bache\b|\bpainful\b|\bdiscomfort\b/g, 'pain'],
  [/\btemperature\b|\bfeverish\b|\bfebrile\b|\bpyrexia\b|\bhot and cold\b/g, 'fever'],
  [/\bshivers?\b|\bshivering\b|\bchills\b|\bshaking episodes?\b/g, 'rigors'],
  [/\bdiarrhea\b|\bdiarrhoea\b|\bdiarhoea\b|\bdiarrhoa\b|\bloose stool\b|\brunny stool\b/g, 'diarrhoea'],
  [/\bcolor\b/g, 'colour'],
  [/\bhemorrhoids?\b|\bhaemorrhoids?\b|\bpiles\b/g, 'haemorrhoids'],
  [/\bperiod(?:s)?\b|\bmenstrua(?:l|tion)\b|\bmenses\b/g, 'period'],
  [/\bmeds\b|\bmedicines?\b|\bmedications?\b|\btablets\b/g, 'medication'],
  [/\bcigarettes?\b|\bcigs\b|\btobacco\b|\bsmoker\b|\bsmoking\b/g, 'smoke'],
  [/\bbooze\b|\bdrinking\b|\bunits\b|\bbeer\b|\bwine\b|\bspirits\b/g, 'alcohol'],
  [/\bjob\b|\bwork(?:ing)?\b|\bfor a living\b|\boccupation\b|\bemployed\b/g, 'work'],
  [/\bop(?:s)?\b|\boperations?\b|\bsurgery\b|\bsurgeries\b|\boperated\b/g, 'operation'],
  [/\bbreathless(?:ness)?\b|\bshort of breath\b|\bshortness of breath\b|\bsob\b|\bdyspnoea\b/g, 'breathless'],
  [/\bweight\b|\bkilos?\b|\bpounds\b|\bclothes (?:are )?looser\b/g, 'weight'],
  [/\bjaundiced?\b|\byellow(?:ing|ish)?\b|\bicter(?:ic|us)\b/g, 'yellow'],
  [/\bscale of (?:1|one|0|zero) to (?:10|ten)\b|\bout of (?:10|ten)\b/g, 'score ten'],
  [/\bblood thinners?\b|\banticoagula\w*\b|\bwarfarin\b|\bapixaban\b|\brivaroxaban\b|\bedoxaban\b|\bdabigatran\b/g, 'anticoagulant'],
  [/\bibuprofen\b|\bnaproxen\b|\bdiclofenac\b|\bnsaids?\b|\banti ?inflammator\w*\b/g, 'nsaid'],
  [/\bhrt\b|\bhormone replacement\b/g, 'hrt'],
  [/\bbreast ?feed(?:ing)?\b|\bbreastfed\b/g, 'breastfeed'],
  [/\bsexually active\b|\bsexual partners?\b|\bsex\b/g, 'sexual'],
  [/\bdoc\b/g, 'doctor'],
  [/\bstart(?:ed|s)?\b|\bbegan\b|\bbegin\b|\bcame on\b|\bcome on\b/g, 'start'],
]

const STOP = new Set(
  'a an the is are am was were be been being to of in on at for with and or but if so it its this that these those i me my we us our you your yours he she they them his her their do does did have has had any some can could would will shall should may might must just really please okay ok also very quite there here about into from by as up down out over again then than too'.split(
    ' ',
  ),
)

function stem(w: string): string {
  if (w.length <= 4) return w
  for (const suf of ['ingly', 'ings', 'ing', 'edly', 'ed', 'ies', 'es', 's', 'ly']) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) {
      const base = w.slice(0, -suf.length)
      return suf === 'ies' ? `${base}y` : base
    }
  }
  return w
}

export function normalize(text: string): string {
  let s = ` ${text.toLowerCase().replace(/[’`]/g, "'")} `
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep)
  s = s.replace(/[^a-z0-9' ]+/g, ' ').replace(/'/g, '')
  for (const [re, rep] of SYNONYMS) s = s.replace(re, rep)
  return s.replace(/\s+/g, ' ').trim()
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => w && !STOP.has(w))
    .map(stem)
}

function features(tokens: string[]): Map<string, number> {
  const f = new Map<string, number>()
  for (const t of tokens) f.set(t, (f.get(t) ?? 0) + 1)
  for (let i = 0; i < tokens.length - 1; i++) {
    const b = `${tokens[i]}_${tokens[i + 1]}`
    f.set(b, (f.get(b) ?? 0) + 1)
  }
  return f
}

interface IndexedExample {
  intent: Intent
  vec: Map<string, number>
  norm: number
}

let index: { examples: IndexedExample[]; idf: Map<string, number>; vocab: Set<string> } | null = null

function buildIndex() {
  const docs: { intent: Intent; f: Map<string, number> }[] = []
  for (const intent of INTENTS) {
    for (const ex of [intent.q, ...intent.ex]) docs.push({ intent, f: features(tokenize(ex)) })
  }
  const df = new Map<string, number>()
  for (const d of docs) for (const k of d.f.keys()) df.set(k, (df.get(k) ?? 0) + 1)
  const N = docs.length
  const idf = new Map<string, number>()
  for (const [k, v] of df) idf.set(k, Math.log(1 + N / v) * (k.includes('_') ? 1.25 : 1))
  const examples = docs.map((d) => {
    const vec = new Map<string, number>()
    let norm = 0
    for (const [k, tf] of d.f) {
      const w = (1 + Math.log(tf)) * (idf.get(k) ?? 0)
      vec.set(k, w)
      norm += w * w
    }
    return { intent: d.intent, vec, norm: Math.sqrt(norm) || 1 }
  })
  const vocab = new Set<string>([...df.keys()].filter((k) => !k.includes('_')))
  index = { examples, idf, vocab }
  return index
}

function editDistance1(a: string, b: string): boolean {
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

function correctTypos(tokens: string[], vocab: Set<string>): string[] {
  return tokens.map((t) => {
    if (vocab.has(t) || t.length < 5) return t
    for (const v of vocab) if (v.length >= 4 && editDistance1(t, v)) return v
    return t
  })
}

export interface MatchResult {
  id: string
  score: number
}

function scoreQuery(text: string): MatchResult[] {
  const idx = index ?? buildIndex()
  const toks = correctTypos(tokenize(text), idx.vocab)
  if (!toks.length) return []
  const f = features(toks)
  const q = new Map<string, number>()
  let qn = 0
  for (const [k, tf] of f) {
    const w = (1 + Math.log(tf)) * (idx.idf.get(k) ?? 0.6)
    q.set(k, w)
    qn += w * w
  }
  qn = Math.sqrt(qn) || 1
  const best = new Map<string, number>()
  for (const ex of idx.examples) {
    let dot = 0
    for (const [k, w] of q) {
      const e = ex.vec.get(k)
      if (e) dot += w * e
    }
    const s = dot / (qn * ex.norm)
    if (s > (best.get(ex.intent.id) ?? 0)) best.set(ex.intent.id, s)
  }
  return [...best.entries()].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score)
}

export interface Interpretation {
  /** Intents to answer (possibly several for compound questions) */
  matched: string[]
  /** Close alternatives to offer when unsure */
  suggestions: string[]
  confidence: number
}

const ACCEPT = 0.42
const CLEAR_MARGIN = 0.05

function best(text: string): { top?: MatchResult; alts: MatchResult[]; confident: boolean } {
  const ranked = scoreQuery(text)
  const top = ranked[0]
  if (!top) return { alts: [], confident: false }
  const second = ranked[1]?.score ?? 0
  const confident = top.score >= ACCEPT && (top.score - second >= CLEAR_MARGIN || top.score >= 0.62)
  return { top, alts: ranked.slice(0, 4), confident }
}

export function interpret(text: string): Interpretation {
  const clean = text.trim()
  if (!clean) return { matched: [], suggestions: [], confidence: 0 }

  // Split into sentences, then split compound yes/no questions on "or"/"and"/commas.
  const sentences = clean.split(/(?<=[.?!])\s+|\n+/).filter((s) => s.trim())
  const matched: string[] = []
  let conf = 0
  let suggestions: string[] = []

  for (const sentence of sentences) {
    const whole = best(sentence)
    const parts = sentence
      .split(/,|\bor\b|\band\b|\/|;/i)
      .map((p) => p.trim())
      .filter((p) => tokenize(p).length > 0)

    let partMatches: string[] = []
    if (parts.length > 1) {
      for (const p of parts) {
        const r = best(p)
        if (r.top && r.confident && r.top.score >= 0.5) partMatches.push(r.top.id)
      }
      partMatches = [...new Set(partMatches)]
    }

    if (partMatches.length > 1) {
      matched.push(...partMatches)
      conf = Math.max(conf, 0.7)
    } else if (whole.top && whole.confident) {
      matched.push(whole.top.id)
      conf = Math.max(conf, whole.top.score)
    } else if (partMatches.length === 1) {
      matched.push(partMatches[0])
      conf = Math.max(conf, 0.55)
    } else if (whole.alts.length) {
      suggestions = whole.alts.filter((a) => a.score >= 0.18).map((a) => a.id)
    }
  }

  const uniq = [...new Set(matched)]
  return { matched: uniq, suggestions: uniq.length ? [] : suggestions.slice(0, 3), confidence: conf }
}

/** Live suggestions while typing. */
export function suggest(text: string, n = 4): string[] {
  if (tokenize(text).length === 0) return []
  return scoreQuery(text)
    .filter((r) => r.score > 0.16)
    .slice(0, n)
    .map((r) => r.id)
}
