import { ClipboardCopy, ClipboardPaste, Download, Monitor, Moon, Sun, Upload, Volume2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { playPercussion, speak, unlockAudio } from '../../audio/engine'
import { Page, PageHeader } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Segmented, Switch } from '../../components/ui/primitives'
import { Sheet } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { EMBEDDED } from '../../lib/env'
import { use3dPatients, webgl2Supported, webglTier } from '../../lib/webgl'
import { useProgress } from '../../store/progress'
import { useSettings, type ThemePref } from '../../store/settings'

export default function Settings() {
  const st = useSettings()
  const set = st.set
  const fileRef = useRef<HTMLInputElement>(null)

  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasted, setPasted] = useState('')

  const payload = () => JSON.stringify({ app: 'bedside', version: 1, exportedAt: new Date().toISOString(), progress: useProgress.getState() })

  const exportData = () => {
    const blob = new Blob([payload()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bedside-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // Embedded copies can't download files, so progress travels through the clipboard instead
  const copyData = async () => {
    try {
      await navigator.clipboard.writeText(payload())
      toast({ tone: 'success', title: 'Progress copied', body: 'On your other device, open Settings → Paste progress.' })
    } catch {
      toast({ tone: 'danger', title: 'Could not copy', body: 'This browser blocked the clipboard.' })
    }
  }

  const importText = (text: string) => {
    try {
      const json = JSON.parse(text)
      if (json.app !== 'bedside' || !Array.isArray(json.progress?.attempts)) throw new Error('bad file')
      const cur = useProgress.getState()
      const ids = new Set(cur.attempts.map((a) => a.attemptId))
      const merged = [...cur.attempts, ...json.progress.attempts.filter((a: { attemptId: string }) => !ids.has(a.attemptId))].sort((a, b) => b.at - a.at)
      useProgress.setState({ attempts: merged.slice(0, 60), drills: { ...json.progress.drills, ...cur.drills } })
      toast({ tone: 'success', title: 'Progress imported', body: `${merged.length} attempts on this device.` })
      return true
    } catch {
      toast({ tone: 'danger', title: 'Could not import that', body: 'Use progress exported or copied from Bedside.' })
      return false
    }
  }
  const importData = async (f: File) => importText(await f.text())

  return (
    <Page>
      <PageHeader eyebrow="Preferences" title="Settings" />

      <div className="space-y-6">
        <Group title="You">
          <Row label="Your name" hint="Used to greet you on the home screen.">
            <input
              value={st.studentName}
              onChange={(e) => set({ studentName: e.target.value.slice(0, 40) })}
              placeholder="e.g. Sara"
              className="h-10 w-full max-w-[220px] rounded-xl bg-surface-2 px-3 text-[15px] text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent/50"
            />
          </Row>
        </Group>

        <Group title="Appearance">
          <Row label="Theme">
            <Segmented<ThemePref>
              layoutId="theme"
              value={st.theme}
              onChange={(theme) => set({ theme })}
              size="sm"
              options={[
                { value: 'system', label: 'Auto', icon: <Monitor size={14} /> },
                { value: 'light', label: 'Light', icon: <Sun size={14} /> },
                { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
              ]}
            />
          </Row>
        </Group>

        <Group title="Sound, voice & touch">
          <Row label="Clinical sounds" hint="Percussion notes, bowel sounds, bruits and monitor beeps.">
            <Switch checked={st.sound} onChange={(sound) => set({ sound })} label="Clinical sounds" />
          </Row>
          <Row label="Volume">
            <div className="flex w-full max-w-[240px] items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={st.volume}
                onChange={(e) => set({ volume: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
                aria-label="Volume"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Test sound"
                onClick={() => {
                  unlockAudio()
                  ;['resonant', 'tympanic', 'dull'].forEach((n, i) => window.setTimeout(() => playPercussion(n as 'resonant'), i * 450))
                }}
              >
                <Volume2 size={16} />
              </Button>
            </div>
          </Row>
          <Row label="Patient voice" hint="Patients speak their answers aloud (uses your device’s voices).">
            <div className="flex items-center gap-2">
              <Button size="xs" variant="ghost" onClick={() => speak('Hello doctor, the pain is down here on the right.', 'male', 30)} disabled={!st.patientVoice}>
                Test
              </Button>
              <Switch checked={st.patientVoice} onChange={(patientVoice) => set({ patientVoice })} label="Patient voice" />
            </div>
          </Row>
          <Row label="Haptic pulse" hint="Feel the radial pulse as vibration (Android phones).">
            <Switch checked={st.haptics} onChange={(haptics) => set({ haptics })} label="Haptics" />
          </Row>
        </Group>

        <Group title="Simulation">
          <Row label="OSCE station length" hint="Per station component in OSCE mode.">
            <Segmented
              layoutId="osce-len"
              size="sm"
              value={String(st.osceStationSeconds / 60)}
              onChange={(v) => set({ osceStationSeconds: Number(v) * 60 })}
              options={['5', '8', '10', '12'].map((m) => ({ value: m, label: `${m}m` }))}
            />
          </Row>
          <Row label="Abdominal regions in Practice mode" hint="Overlay the nine regions while you palpate (always on in Learn mode).">
            <Switch checked={st.showRegions} onChange={(showRegions) => set({ showRegions })} label="Show regions" />
          </Row>
          <Row
            label="3D patients"
            hint={
              !webgl2Supported()
                ? 'This browser can’t show 3D graphics, so patients are illustrated.'
                : webglTier() === 'software'
                  ? 'This device has no graphics acceleration, so 3D patients would be slow. Turn on to try them anyway.'
                  : 'Examine lifelike 3D patients. Turn off for the lighter illustrated patients on an older device.'
            }
          >
            <Switch checked={use3dPatients(st.patients3d)} disabled={!webgl2Supported()} onChange={(patients3d) => set({ patients3d })} label="3D patients" />
          </Row>
        </Group>

        <Group title="Your data">
          {EMBEDDED ? (
            <>
              <Row label="Copy progress" hint="Copies your attempts as text, to paste on another device.">
                <Button size="sm" onClick={copyData} leading={<ClipboardCopy size={15} />}>
                  Copy
                </Button>
              </Row>
              <Row label="Paste progress">
                <Button size="sm" onClick={() => setPasteOpen(true)} leading={<ClipboardPaste size={15} />}>
                  Paste
                </Button>
              </Row>
            </>
          ) : (
            <Row label="Export progress" hint="Download your attempts to move them to another device.">
              <Button size="sm" onClick={exportData} leading={<Download size={15} />}>
                Export
              </Button>
            </Row>
          )}
          <Row label={EMBEDDED ? 'Import a progress file' : 'Import progress'}>
            <>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
              <Button size="sm" onClick={() => fileRef.current?.click()} leading={<Upload size={15} />}>
                Import
              </Button>
            </>
          </Row>
        </Group>

        <Group title="About">
          <div className="space-y-3 px-5 py-4 text-[13.5px] leading-relaxed text-muted">
            <p>
              <b className="text-ink">Bedside</b> is an educational patient simulator for medical students on their surgical rotation. Examination routines follow{' '}
              <i>Macleod’s Clinical Examination</i> (14th edition); history, investigations and management follow current UK guidance (NICE, RCS, WSES, Tokyo guidelines, Atlanta classification).
            </p>
            <p>All patients are fictional. Findings are simplified for teaching. It does not replace supervised clinical practice or your local protocols.</p>
            <p>Everything runs on your device — no account, no tracking. Your progress stays in this browser.</p>
          </div>
        </Group>
      </div>
      <Sheet
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title="Paste progress"
        description="Paste the text you copied from Bedside on your other device. Attempts are merged with the ones here."
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setPasteOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!pasted.trim()}
              onClick={() => {
                if (importText(pasted)) {
                  setPasted('')
                  setPasteOpen(false)
                }
              }}
            >
              Import
            </Button>
          </div>
        }
      >
        <textarea
          id="paste-progress"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={6}
          placeholder='{"app":"bedside", …}'
          className="w-full resize-none rounded-xl bg-surface-2 p-3 font-mono text-[12px] text-ink ring-1 ring-line outline-none placeholder:text-faint focus:ring-accent"
        />
      </Sheet>
    </Page>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface-1 ring-1 ring-line">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-[14.5px] font-medium text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[12.5px] text-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
