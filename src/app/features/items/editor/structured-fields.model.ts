export function parseCharacters(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function serializeCharacters(values: string[]): string {
  return values
    .map((name) => name.replace(/[\r\n]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export interface DurationParts {
  hours: number | null;
  minutes: number | null;
}

export function parseDuration(value: string): DurationParts | null {
  const text = value.trim().toLocaleLowerCase();
  if (!text) return { hours: null, minutes: null };
  const clock = /^(\d+):([0-5]\d)(?::00)?$/.exec(text);
  if (clock && Number.isSafeInteger(Number(clock[1])))
    return { hours: Number(clock[1]), minutes: Number(clock[2]) };
  const units = /^(?:(\d+)\s*(?:horas?|hrs?|h))?\s*(?:(\d+)\s*(?:minutos?|mins?|m))?$/.exec(text);
  if (!units || (!units[1] && !units[2])) return null;
  const total = Number(units[1] ?? 0) * 60 + Number(units[2] ?? 0);
  if (!Number.isSafeInteger(total)) return null;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

export function formatDuration(parts: DurationParts): string {
  if (parts.hours === null && parts.minutes === null) return '';
  return `${String(parts.hours ?? 0).padStart(2, '0')}:${String(parts.minutes ?? 0).padStart(2, '0')}`;
}
