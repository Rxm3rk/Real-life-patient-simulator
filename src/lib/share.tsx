import { toast } from '../components/ui/Toast'

/**
 * Open the share sheet; otherwise copy to the clipboard; if the browser refuses
 * both, show the link so it can be copied by hand.
 */
export async function shareLink(o: { title: string; text?: string; url: string; copyText?: boolean; copied: string; copiedBody?: string }) {
  if (navigator.share) {
    try {
      await navigator.share({ title: o.title, text: o.text, url: o.url })
      return
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return // the user closed the sheet
    }
  }
  try {
    await navigator.clipboard.writeText(o.copyText && o.text ? `${o.text} ${o.url}` : o.url)
    toast({ tone: 'success', title: o.copied, body: o.copiedBody })
  } catch {
    toast({ tone: 'info', title: 'Copy this link', body: <LinkField url={o.url} />, duration: 0 })
  }
}

function LinkField({ url }: { url: string }) {
  return (
    <input
      readOnly
      value={url}
      aria-label="Link to share"
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => {
        e.stopPropagation() // a click on the toast itself dismisses it
        e.currentTarget.select()
      }}
      className="mt-1.5 h-9 w-full rounded-lg bg-surface-2 px-2.5 font-mono text-[12px] text-ink ring-1 ring-line outline-none focus:ring-accent"
    />
  )
}
