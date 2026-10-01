/**
 * 时间格式化工具。
 *
 * 为什么需要它？
 * 后端返回的是标准时间字符串（文档 1.1，如 2026-10-01T14:48:00+08:00），
 * 但界面上直接显示这一长串很难看。组长给的手机原型里有 ago() 函数，
 * 专门把时间转成"3小时前"这种说法，我们项目里原本没有，所以补上。
 */

/** 补零：1 -> "01"。类比 C++ 的 printf("%02d", n) */
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 把任意输入转成 Date；转不出来返回 null */
function toDate(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') return null

  // 标准 ISO（2026-10-01T14:48:00+08:00）任何浏览器都能解析，
  // 但项目里实际出现过两种"看着像时间、其实不是 ISO"的写法：
  //   2026-09-19 14:00        —— mock 数据里的写法（空格分隔）
  //   2026/10/2 14:30:00      —— new Date().toLocaleString('zh-CN') 的输出
  // 这两种 Safari / 部分环境会解析失败，返回 Invalid Date。
  // 所以这里统一改写成 ISO 的 2026-09-19T14:00:00 再交给 new Date()。
  let value: string | number | Date = input
  if (typeof input === 'string') {
    const m = input.match(
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/,
    )
    if (m) {
      // noUncheckedIndexedAccess 开着，所以要给每一项兜个默认值
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

/**
 * 格式化成 "2026-10-01 14:48"（或只要日期 / 只要时间）
 *
 * mode:
 *   'full' -> 2026-10-01 14:48
 *   'date' -> 2026-10-01
 *   'time' -> 14:48
 */
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

/**
 * 相对时间：把时间转成"刚刚 / 5分钟前 / 3小时前 / 2天前"。
 * 超过 30 天就直接显示日期。
 *
 * 对应组长原型 index.html 第 173 行的 ago()。
 */
export function fromNow(input: string | number | Date | null | undefined): string {
  const d = toDate(input)
  if (!d) return ''

  const diffMs = Date.now() - d.getTime()

  // 未来时间（服务器时间比本机快、或用户手填了未来时间）直接显示日期，
  // 不然会出现"-3分钟前"这种奇怪的东西
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

/**
 * 转成后端要的 ISO 8601（带本地时区偏移）。
 *
 * 注意：不能直接用 new Date().toISOString()！
 * 那个返回的是 UTC 时间（结尾是 Z，如 2026-10-01T06:48:00.000Z），
 * 比北京时间少 8 小时，传给后端就会存错时间。
 * 这里手动拼出 +08:00 的形式。
 */
export function toIso(input: string | number | Date | null | undefined): string {
  const d = toDate(input)
  if (!d) return ''

  // getTimezoneOffset() 返回的是"UTC 减本地"的分钟数，北京是 -480，
  // 所以取负号才是我们想要的偏移量
  const offsetMinutes = -d.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`

  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${offset}`
  )
}
