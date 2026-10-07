import type { Session, TopicId } from './types'

/** Group C — general surgery clinical sessions. */
export const SCHEDULE: Session[] = [
  { day: 1, slot: 'am', time: '8:30–10:30', topic: 'bariatric' },
  { day: 1, slot: 'pm', time: '11:00–1:00', topic: 'complicated-hernia' },
  { day: 2, slot: 'am', time: '8:30–10:30', topic: 'acute-abdomen' },
  { day: 2, slot: 'pm', time: '11:00–1:00', topic: 'distension' },
  { day: 3, slot: 'am', time: '8:30–10:30', topic: 'breast' },
  { day: 3, slot: 'pm', time: '11:00–1:00', topic: 'dysphagia' },
  { day: 4, slot: 'am', time: '8:30–10:30', topic: 'jaundice' },
  { day: 4, slot: 'pm', time: '11:00–1:00', topic: 'gi-bleeding' },
  { day: 5, slot: 'am', time: '8:30–10:30', topic: 'periop' },
  { day: 5, slot: 'pm', time: '11:00–1:00', topic: 'epigastric' },
  { day: 6, slot: 'am', time: '8:30–10:30', topic: 'neck-lump' },
  { day: 6, slot: 'pm', time: '11:00–1:00', topic: 'perianal' },
]

export const DAYS = [1, 2, 3, 4, 5, 6]

export const sessionsOn = (day: number) => SCHEDULE.filter((s) => s.day === day)
export const sessionOf = (topic: TopicId) => SCHEDULE.find((s) => s.topic === topic)!
