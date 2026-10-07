import { Fragment, type ReactNode } from 'react'
import { normalise, stem } from '../features/ask/search'

/**
 * Renders curriculum text: **bold** leads, and (optionally) highlights the words
 * a search matched — compared after the same normalising and stemming the
 * search uses, so “haemorrhage” lights up for “hemorrhage”.
 */
export function Rich({ text, terms }: { text: string; terms?: Set<string> }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null
        const bold = p.startsWith('**') && p.endsWith('**')
        const body = bold ? p.slice(2, -2) : p
        const content = terms && terms.size ? highlight(body, terms) : body
        return bold ? (
          <strong key={i} className="font-semibold text-ink">
            {content}
          </strong>
        ) : (
          <Fragment key={i}>{content}</Fragment>
        )
      })}
    </>
  )
}

function highlight(text: string, terms: Set<string>): ReactNode {
  const words = text.split(/([A-Za-zÀ-ÿ0-9’'-]+)/g)
  return words.map((w, i) => {
    if (i % 2 === 0 || !w) return w
    const t = stem(normalise(w).replace(/[^a-z0-9]/g, ''))
    if (!t) return w
    let hit = terms.has(t)
    if (!hit) for (const x of terms) if (x.length >= 4 && t.startsWith(x)) hit = true
    return hit ? (
      <mark key={i} className="rounded-[3px] bg-accent/20 px-0.5 text-ink">
        {w}
      </mark>
    ) : (
      w
    )
  })
}
