export function parseDelimited(text: string): string[][] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const delimiter = trimmed.includes("\t") ? "\t" : ",";
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.split(delimiter).map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

export function toNumber(value: string): number {
  const cleaned = value.replace(/[$,%]/g, "").replace(/\s/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
