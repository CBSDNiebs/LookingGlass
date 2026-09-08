export interface OtrEvent {
  tMs: number;
  kind: string;
}

export function computeBinsByKind(events: OtrEvent[], durationMs: number) {
  const minutes = Math.max(1, Math.ceil(Math.max(0, durationMs) / 60000));
  const bins = Array.from({ length: minutes }, (_, i) => ({
    minute: i + 1,
    total: 0,
    group: 0, warm: 0, cold: 0, volunteer: 0,
    specific: 0, general: 0, corrective: 0, redirect: 0, genCrit: 0, indCrit: 0,
    engWhole: 0, engSmall: 0, engPartners: 0, engChoral: 0, engCloze: 0, engWhiteboard: 0
  }));

  for (const e of events) {
    const idx = Math.min(minutes - 1, Math.max(0, Math.floor(e.tMs / 60000)));
    bins[idx].total += 1;
    if (e.kind in bins[idx]) {
      bins[idx][e.kind as keyof typeof bins[0]] += 1;
    }
  }
  return bins;
}
