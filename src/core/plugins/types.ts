export interface PluginMetadata {
  id: string
  name: string
  version: string
  description?: string
  author?: string
}

export interface IPlugin {
  readonly metadata: PluginMetadata
  activate(): void
  deactivate(): void
}

export type PluginCategory = 'parser' | 'exporter' | 'converter' | 'editor'

export interface ParserPlugin extends IPlugin {
  category: 'parser'
  supportedFormats: string[]
  parse(content: string): unknown
  serialize(data: unknown): string
}
