import { Command } from '../Command'
import type { SubtitleItem } from '../../models/SubtitleItem'

export interface UpdateSubtitleCommandParams {
  id: string
  oldValues: Partial<SubtitleItem>
  newValues: Partial<SubtitleItem>
  updateFn: (id: string, updates: Partial<SubtitleItem>) => void
  getItemFn: (id: string) => SubtitleItem | undefined
}

/**
 * Command to update a subtitle
 * Undo will restore old values
 */
export class UpdateSubtitleCommand extends Command {
  readonly name = 'Update Subtitle'

  constructor(private params: UpdateSubtitleCommandParams) {
    super()
  }

  execute(): boolean {
    const item = this.params.getItemFn(this.params.id)
    if (!item) {
      return false
    }

    this.params.updateFn(this.params.id, this.params.newValues)
    return true
  }

  undo(): boolean {
    const item = this.params.getItemFn(this.params.id)
    if (!item) {
      return false
    }

    this.params.updateFn(this.params.id, this.params.oldValues)
    return true
  }
}
