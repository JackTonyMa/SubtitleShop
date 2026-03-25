export interface AssStyle {
  name: string
  fontName: string
  fontSize: number
  primaryColor: string
  secondaryColor: string
  outlineColor: string
  backColor: string
  bold: boolean
  italic: boolean
  underline: boolean
  strikeOut: boolean
  scaleX: number
  scaleY: number
  spacing: number
  angle: number
  borderStyle: number
  outline: number
  shadow: number
  alignment: number
  marginL: number
  marginR: number
  marginV: number
  encoding: number
}

export const DEFAULT_STYLE: AssStyle = {
  name: 'Default',
  fontName: 'Arial',
  fontSize: 20,
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
  outline: 2,
  shadow: 2,
  alignment: 2,
  marginL: 10,
  marginR: 10,
  marginV: 10,
  encoding: 1,
}

export function createDefaultStyle(): AssStyle {
  return { ...DEFAULT_STYLE }
}

export function createAssStyle(overrides: Partial<AssStyle> & { name: string }): AssStyle {
  return {
    ...DEFAULT_STYLE,
    ...overrides,
  }
}
