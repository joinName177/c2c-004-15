/** cm³ 转 L 展示；装箱方案的容积数值较大，统一保留一位小数。 */
export function formatVolume(volumeCm3: number): string {
  return `${(volumeCm3 / 1000).toFixed(1)}L`;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function formatWeight(kg: number): string {
  return `${kg.toFixed(1)}kg`;
}
