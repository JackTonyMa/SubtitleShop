/**
 * Abstract base class for all undoable commands
 */
export abstract class Command {
  /** Human-readable name of the command */
  abstract readonly name: string

  /**
   * Execute the command
   * Returns true if execution was successful
   */
  abstract execute(): boolean

  /**
   * Undo the command
   * Returns true if undo was successful
   */
  abstract undo(): boolean

  /**
   * Optional: called when this command is being discarded from history
   * Use this to clean up any resources
   */
  dispose?(): void
}

/**
 * Command constructor type
 */
export type CommandConstructor = new (...args: any[]) => Command
