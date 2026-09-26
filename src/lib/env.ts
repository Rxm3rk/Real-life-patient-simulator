/**
 * `vite build --mode embed` produces the single-file app for hosts that run it
 * inside a locked-down frame (no microphone, no downloads, no share sheet).
 */
export const EMBEDDED = import.meta.env.MODE === 'embed'
