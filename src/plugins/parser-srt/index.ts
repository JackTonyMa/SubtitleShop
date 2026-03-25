import { BasePlugin } from '../../core/plugins/BasePlugin'
import type { ParserPlugin } from '../../core/plugins/types'
import type { SubtitleFile } from '../../core/models/SubtitleFile'
import { parseSrt, serializeSrt } from './parser'

export class SrtParserPlugin extends BasePlugin implements ParserPlugin {
  readonly category = 'parser' as const
  readonly supportedFormats = ['srt']

  constructor() {
    super('parser-srt', 'SRT Parser', '1.0.0')
  }

  activate(): void {
    // Plugin activation logic
    console.log('SRT Parser activated')
  }

  deactivate(): void {
    // Plugin deactivation logic
    console.log('SRT Parser deactivated')
  }

  parse(content: string): Partial<SubtitleFile> {
    return parseSrt(content)
  }

  serialize(data: Partial<SubtitleFile>): string {
    return serializeSrt(data)
  }
}
