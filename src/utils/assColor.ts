export interface AssColorComponents {
  alpha: number
  red: number
  green: number
  blue: number
}

export function assColorToCss(assColor: string): string {
  const hex = assColor.replace(/&H/i, '').padStart(8, '0')
  const blue = hex.slice(2, 4)
  const green = hex.slice(4, 6)
  const red = hex.slice(6, 8)
  return `#${red}${green}${blue}`.toLowerCase()
}

export function cssToAssColor(cssColor: string): string {
  const hex = cssColor.replace('#', '')
  // Handle 3-character hex shorthand (#fff -> #ffffff)
  let fullHex = hex
  if (hex.length === 3) {
    fullHex = hex.split('').map(c => c + c).join('')
  }
  // Now pad to 6 characters
  fullHex = fullHex.padStart(6, '0')
  const red = fullHex.slice(0, 2)
  const green = fullHex.slice(2, 4)
  const blue = fullHex.slice(4, 6)
  return `&H00${blue}${green}${red}`.toUpperCase()
}

export function parseAssColor(assColor: string): AssColorComponents {
  const hex = assColor.replace('&H', '').padStart(8, '0')
  return {
    alpha: parseInt(hex.slice(0, 2), 16),
    blue: parseInt(hex.slice(2, 4), 16),
    green: parseInt(hex.slice(4, 6), 16),
    red: parseInt(hex.slice(6, 8), 16),
  }
}

export function formatAssColor(components: AssColorComponents): string {
  const alpha = components.alpha.toString(16).padStart(2, '0')
  const blue = components.blue.toString(16).padStart(2, '0')
  const green = components.green.toString(16).padStart(2, '0')
  const red = components.red.toString(16).padStart(2, '0')
  return `&H${alpha}${blue}${green}${red}`.toUpperCase()
}
