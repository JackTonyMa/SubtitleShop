import { SubtitleFile } from './SubtitleFile'

export interface ProjectSettings {
  [key: string]: unknown
}

export interface Project {
  id: string
  name: string
  files: SubtitleFile[]
  settings: ProjectSettings
  createdAt: number
  updatedAt: number
}

export interface ProjectParams {
  name: string
  files?: SubtitleFile[]
  settings?: ProjectSettings
}

export function createProject(params: ProjectParams): Project {
  const now = Date.now()
  return {
    id: generateId(),
    name: params.name,
    files: params.files ?? [],
    settings: params.settings ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
