import { Command } from '../Command'
import type { SubtitleItem } from '../../models/SubtitleItem'

export interface AddSubtitleCommandParams {
  item: Omit<SubtitleItem, 'id'>
  addFn: (item: Omit<SubtitleItem, 'id'>) => SubtitleItem | null
  removeFn: (id: string) => void
}

/**
 * Command to add a subtitle
 * Undo will remove the added subtitle
 */
export class AddSubtitleCommand extends Command {
  readonly name = 'Add Subtitle'

  private addedItem: SubtitleItem | null = null

  constructor(private params: AddSubtitleCommandParams) {
    super()
  }

  execute(): boolean {
    this.addedItem = this.params.addFn(this.params.item)
    return this.addedItem !== null
  }

  undo(): boolean {
    if (!this.addedItem) {
      return false
    }
    this.params.removeFn(this.addedItem.id)
    return true
  }
}
