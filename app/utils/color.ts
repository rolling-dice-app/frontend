/** 依正負號回傳語意色 class：正→success、負→danger、零→muted（共用於 modifier / bonus 顯示） */
export function getModifierColorClass(value: number): string {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}
