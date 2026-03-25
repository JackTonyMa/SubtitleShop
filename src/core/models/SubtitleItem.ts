export interface SubtitleItem {
  id: string
  startTime: number
  endTime: number
  text: string
  style?: string
  effect?: string
}

export function createSubtitleItem(params: Omit<SubtitleItem, 'id'>): SubtitleItem {
  if (params.startTime >= params.endTime) {
    throw new Error('Start time must be less than end time')
  }

  return {
    id: generateId(),
    ...params,
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
