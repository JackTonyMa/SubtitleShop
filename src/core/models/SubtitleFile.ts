import { SubtitleItem } from './SubtitleItem'
import { AssStyle } from './AssStyle'

export type SubtitleFormat = 'ass' | 'ssa' | 'srt' | 'vtt'

export interface SubtitleFile {
  id: string
  filename: string
  format: SubtitleFormat
  items: SubtitleItem[]
  styles: AssStyle[]
  createdAt: number
  updatedAt: number
}

export interface SubtitleFileParams {
  filename: string
  format: SubtitleFormat
  items?: SubtitleItem[]
  styles?: AssStyle[]
}

export function createSubtitleFile(params: SubtitleFileParams): SubtitleFile {
  const now = Date.now()
  return {
    id: generateId(),
    filename: params.filename,
    format: params.format,
    items: params.items ?? [],
    styles: params.styles ?? [],
    createdAt: now,
    updatedAt: now,
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
