function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toDate(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') return null

  let value: string | number | Date = input
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (m) {
      const year = m[1] ?? ''
      const month = (m[2] ?? '').padStart(2, '0')
      const day = (m[3] ?? '').padStart(2, '0')
      const hour = (m[4] ?? '').padStart(2, '0')
      const minute = m[5] ?? '00'
      const second = m[6] ?? '00'
      value = `${year}-${month}-${day}T${hour}:${minute}:${second}`
    }
  }

  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDateTime(
  input: string | number | Date | null | undefined,
  mode: 'full' | 'date' | 'time' = 'full',
): string {
  const d = toDate(input)
  if (!d) return ''

  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`

  if (mode === 'date') return date
  if (mode === 'time') return time
  return `${date} ${time}`
}

export function fromNow(input: string | number | Date | null | undefined): string {
  const d = toDate(input)
  if (!d) return ''

  const diffMs = Date.now() - d.getTime()

  if (diffMs < 0) return formatDateTime(d, 'date')

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`

  return formatDateTime(d, 'date')
}

export function toIso(input: string | number | Date | null | undefined): string {
  const d = toDate(input)
  if (!d) return ''

  const offsetMinutes = -d.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`

  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${offset}`
  )
}
