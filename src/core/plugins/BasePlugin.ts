import { IPlugin, PluginMetadata } from './types'

export abstract class BasePlugin implements IPlugin {
  readonly metadata: PluginMetadata

  constructor(id: string, name: string, version = '1.0.0') {
    this.metadata = {
      id,
      name,
      version,
    }
  }

  activate(): void {
    // Override in subclass
  }

  deactivate(): void {
    // Override in subclass
  }
}
