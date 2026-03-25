import { describe, it, expect } from 'vitest'
import { Project, createProject } from '../Project'

describe('Project', () => {
  it('should create empty project', () => {
    const project = createProject({
      name: 'Test Project',
    })

    expect(project.name).toBe('Test Project')
    expect(project.files).toEqual([])
    expect(project.settings).toEqual({})
  })
})
