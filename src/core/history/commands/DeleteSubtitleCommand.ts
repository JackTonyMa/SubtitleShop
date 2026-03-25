import { Command } from '../Command'
import type { SubtitleItem } from '../../models/SubtitleItem'

export interface DeleteSubtitleCommandParams {
  item: SubtitleItem
  removeFn: (id: string) => void
  addFn: (item: Omit<SubtitleItem, 'id'>) => SubtitleItem | null
}

/**
 * Command to delete a subtitle
 * Undo will restore the deleted subtitle
 */
export class DeleteSubtitleCommand extends Command {
  readonly name = 'Delete Subtitle'

  private deletedItem: SubtitleItem | null = null
  private restoredItem: SubtitleItem | null = null

  constructor(private params: DeleteSubtitleCommandParams) {
    super()
  }

  execute(): boolean {
    this.deletedItem = { ...this.params.item }
    this.params.removeFn(this.params.item.id)
    return true
  }

  undo(): boolean {
    if (!this.deletedItem) {
      return false
    }
    const { id, ...itemWithoutId } = this.deletedItem
    this.restoredItem = this.params.addFn(itemWithoutId)
    return this.restoredItem !== null
  }
}
