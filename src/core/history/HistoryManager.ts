import { Command } from './Command'

export interface HistoryManagerOptions {
  maxHistory?: number
}

/**
 * Manages undo/redo history with command pattern
 */
export class HistoryManager {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private maxHistory: number

  constructor(options: HistoryManagerOptions = {}) {
    this.maxHistory = options.maxHistory ?? 100
   }

  /**
   * Execute a command and add it to history
   */
  execute(command: Command): boolean {
    const success = command.execute()
    if (!success) {
      return false
    }

    this.undoStack.push(command)
    this.redoStack = [] // Clear redo stack on new command

    // Enforce max history limit
    if (this.undoStack.length > this.maxHistory) {
      const removed = this.undoStack.shift()
      if (removed?.dispose) {
        removed.dispose()
      }
    }

    return true
  }

  /**
   * Undo the last command
   */
  undo(): boolean {
    const command = this.undoStack.pop()
    if (!command) {
      return false
    }

    const success = command.undo()
    if (!success) {
      // Put it back if undo failed
      this.undoStack.push(command)
      return false
    }

    this.redoStack.push(command)
    return true
  }

  /**
   * Redo the last undone command
   */
  redo(): boolean {
    const command = this.redoStack.pop()
    if (!command) {
      return false
    }

    const success = command.execute()
    if (!success) {
      // Put it back if redo failed
      this.redoStack.push(command)
      return false
    }

    this.undoStack.push(command)
    return true
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Get the list of undoable command names (most recent first)
   */
  getUndoHistory(): string[] {
    return this.undoStack
      .slice()
      .reverse()
      .map(cmd => cmd.name)
  }

  /**
   * Get the list of redoable command names (most recent first)
   */
  getRedoHistory(): string[] {
    return this.redoStack
      .slice()
      .reverse()
      .map(cmd => cmd.name)
  }

  /**
   * Clear all history
   */
  clear(): void {
    // Dispose all commands
    for (const cmd of this.undoStack) {
      if (cmd.dispose) {
        cmd.dispose()
      }
    }
    for (const cmd of this.redoStack) {
      if (cmd.dispose) {
        cmd.dispose()
      }
    }

    this.undoStack = []
    this.redoStack = []
  }

  /**
   * Get current undo stack size
   */
  getUndoSize(): number {
    return this.undoStack.length
  }

  /**
   * Get current redo stack size
   */
  getRedoSize(): number {
    return this.redoStack.length
  }
}

/**
 * Create a singleton history manager instance
 */
export function createHistoryManager(options?: HistoryManagerOptions): HistoryManager {
  return new HistoryManager(options)
}
