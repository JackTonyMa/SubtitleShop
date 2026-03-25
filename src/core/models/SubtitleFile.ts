import { SubtitleItem } from './SubtitleItem'
import { AssStyle } from './AssStyle'

export interface SubtitleFile {
  id: string
  filename: string
  format: 'ass' | 'srt'
  items: SubtitleItem[]
  styles: AssStyle[]
  scriptInfo?: Record<string, string>
  createdAt: number
  updatedAt: number
}

export interface SubtitleFileParams {
  filename: string
  format: 'ass' | 'srt'
  items?: SubtitleItem[]
  styles?: AssStyle[]
  scriptInfo?: Record<string, string>
}

export function createSubtitleFile(params: SubtitleFileParams): SubtitleFile {
  const now = Date.now()
  return {
    id: generateId(),
    filename: params.filename,
    format: params.format,
    items: params.items ?? [],
    styles: params.styles ?? [],
    scriptInfo: params.scriptInfo,
    createdAt: now,
    updatedAt: now,
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
