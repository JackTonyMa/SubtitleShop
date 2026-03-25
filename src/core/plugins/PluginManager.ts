import { IPlugin } from './types'

export class PluginManager {
  private plugins: Map<string, IPlugin> = new Map()

  register(plugin: IPlugin): void {
    const { id } = plugin.metadata

    if (this.plugins.has(id)) {
      throw new Error(`Plugin ${id} already registered`)
    }

    this.plugins.set(id, plugin)
    plugin.activate()
  }

  unregister(id: string): void {
    const plugin = this.plugins.get(id)
    if (plugin) {
      plugin.deactivate()
      this.plugins.delete(id)
    }
  }

  get(id: string): IPlugin | undefined {
    return this.plugins.get(id)
  }

  getAll(): IPlugin[] {
    return Array.from(this.plugins.values())
  }

  clear(): void {
    this.plugins.forEach((plugin) => plugin.deactivate())
    this.plugins.clear()
  }
}
