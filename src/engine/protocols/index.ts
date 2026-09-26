import type { ExamKind } from '../types'
import { ABDOMINAL_ORDER_RULES, ABDOMINAL_STEPS, type OrderRule, type ProtocolStep } from './abdominal'

export interface Protocol {
  kind: ExamKind
  title: string
  steps: ProtocolStep[]
  rules: OrderRule[]
}

const PROTOCOLS: Partial<Record<ExamKind, Protocol>> = {
  abdominal: { kind: 'abdominal', title: 'Abdominal examination', steps: ABDOMINAL_STEPS, rules: ABDOMINAL_ORDER_RULES },
}

export function protocolFor(kind: ExamKind): Protocol {
  return PROTOCOLS[kind] ?? PROTOCOLS.abdominal!
}

export function registerProtocol(p: Protocol) {
  PROTOCOLS[p.kind] = p
}
