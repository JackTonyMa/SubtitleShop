export function msToAssTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const centiseconds = Math.floor((ms % 1000) / 10)
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
}

export function msToSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

export function assTimeToMs(time: string): number {
  const match = time.match(/^(\d+):(\d{2}):(\d{2})\.(\d{2})$/)
  if (!match) throw new Error(`Invalid ASS time format: ${time}`)
  const [, hours, minutes, seconds, centiseconds] = match
  return parseInt(hours) * 3600000 + parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(centiseconds) * 10
}

export function srtTimeToMs(time: string): number {
  const match = time.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/)
  if (!match) throw new Error(`Invalid SRT time format: ${time}`)
  const [, hours, minutes, seconds, milliseconds] = match
  return parseInt(hours) * 3600000 + parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(milliseconds)
}

export const parseAssTime = assTimeToMs
export const parseSrtTime = srtTimeToMs
