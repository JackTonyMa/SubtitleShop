import type { AssStyle } from '../../core/models/AssStyle'

export interface PresetStyle {
  id: string
  name: string
  description: string
  style: Omit<AssStyle, 'name'>
}

export const PRESET_STYLES: PresetStyle[] = [
  {
    id: 'anime',
    name: '动漫风格',
    description: '明亮色彩、描边阴影、底部居中',
    style: {
      fontName: 'Arial Unicode MS',
      fontSize: 24,
      primaryColor: '&H00FFFFFF',
      secondaryColor: '&H00FFFF00',
      outlineColor: '&H00000000',
      backColor: '&H80000000',
      bold: true,
      italic: false,
      underline: false,
      strikeOut: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 0,
      angle: 0,
      borderStyle: 1,
      outline: 2,
      shadow: 2,
      alignment: 2,
      marginL: 20,
      marginR: 20,
      marginV: 20,
      encoding: 1,
    },
  },
  {
    id: 'movie',
    name: '电影字幕',
    description: '经典白色无衬线、底部居中、清晰可读',
    style: {
      fontName: 'Arial',
      fontSize: 22,
      primaryColor: '&H00FFFFFF',
      secondaryColor: '&H000000FF',
      outlineColor: '&H00000000',
      backColor: '&H80000000',
      bold: false,
      italic: false,
      underline: false,
      strikeOut: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 0,
      angle: 0,
      borderStyle: 1,
      outline: 1,
      shadow: 0,
      alignment: 2,
      marginL: 40,
      marginR: 40,
      marginV: 30,
      encoding: 1,
    },
  },
  {
    id: 'documentary',
    name: '纪录片风格',
    description: '专业外观、清晰易读、适度边距',
    style: {
      fontName: 'Helvetica',
      fontSize: 20,
      primaryColor: '&H00E8E8E8',
      secondaryColor: '&H000000FF',
      outlineColor: '&H00141414',
      backColor: '&H80000000',
      bold: false,
      italic: false,
      underline: false,
      strikeOut: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 0.5,
      angle: 0,
      borderStyle: 1,
      outline: 1.5,
      shadow: 1,
      alignment: 2,
      marginL: 60,
      marginR: 60,
      marginV: 40,
      encoding: 1,
    },
  },
  {
    id: 'karaoke',
    name: '卡拉OK',
    description: '高对比度、填充效果、居中显示',
    style: {
      fontName: 'Microsoft YaHei',
      fontSize: 28,
      primaryColor: '&H00FFFFFF',
      secondaryColor: '&H00FF0000',
      outlineColor: '&H00000000',
      backColor: '&H00000000',
      bold: true,
      italic: false,
      underline: false,
      strikeOut: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 0,
      angle: 0,
      borderStyle: 1,
      outline: 3,
      shadow: 0,
      alignment: 2,
      marginL: 20,
      marginR: 20,
      marginV: 30,
      encoding: 1,
    },
  },
  {
    id: 'minimal',
    name: '极简风格',
    description: '无描边、无阴影、纯净文字',
    style: {
      fontName: 'Arial',
      fontSize: 18,
      primaryColor: '&H00FFFFFF',
      secondaryColor: '&H000000FF',
      outlineColor: '&H00000000',
      backColor: '&H00000000',
      bold: false,
      italic: false,
      underline: false,
      strikeOut: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 0,
      angle: 0,
      borderStyle: 1,
      outline: 0,
      shadow: 0,
      alignment: 2,
      marginL: 20,
      marginR: 20,
      marginV: 20,
      encoding: 1,
    },
  },
]

export function getPresetStyleById(id: string): PresetStyle | undefined {
  return PRESET_STYLES.find(s => s.id === id)
}

export function createStyleFromPreset(
  presetId: string,
  customName?: string
): AssStyle | null {
  const preset = getPresetStyleById(presetId)
  if (!preset) return null

  return {
    name: customName ?? preset.name,
    ...preset.style,
  }
}

export function getPresetStyles(): PresetStyle[] {
  return [...PRESET_STYLES]
}

export function getPresetStyleNames(): { id: string; name: string; description: string }[] {
  return PRESET_STYLES.map(({ id, name, description }) => ({
    id,
    name,
    description,
  }))
}
