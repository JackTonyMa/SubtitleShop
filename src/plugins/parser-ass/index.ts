import { BasePlugin } from '../../core/plugins/BasePlugin'
import type { ParserPlugin } from '../../core/plugins/types'
import type { SubtitleFile } from '../../core/models/SubtitleFile'
import { parseAss, serializeAss } from './parser'

export class AssParserPlugin extends BasePlugin implements ParserPlugin {
  readonly category = 'parser' as const
  readonly supportedFormats = ['ass', 'ssa']

  constructor() {
    super('parser-ass', 'ASS Parser', '1.0.0')
  }

  activate(): void {
    // Plugin activation logic
    console.log('ASS Parser activated')
  }

  deactivate(): void {
    // Plugin deactivation logic
    console.log('ASS Parser deactivated')
  }

  parse(content: string): Partial<SubtitleFile> {
    return parseAss(content)
  }

  serialize(data: Partial<SubtitleFile>): string {
    return serializeAss(data)
  }
}
