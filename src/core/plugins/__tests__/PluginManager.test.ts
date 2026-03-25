import { describe, it, expect, beforeEach } from 'vitest'
import { PluginManager } from '../PluginManager'
import { BasePlugin } from '../BasePlugin'

describe('PluginManager', () => {
  let manager: PluginManager

  beforeEach(() => {
    manager = new PluginManager()
  })

  it('should register a plugin', () => {
    const plugin = new BasePlugin('test-plugin', 'Test Plugin')
    manager.register(plugin)

    expect(manager.get('test-plugin')).toBe(plugin)
  })

  it('should throw when registering duplicate plugin', () => {
    const plugin = new BasePlugin('test-plugin', 'Test Plugin')
    manager.register(plugin)

    expect(() => manager.register(plugin)).toThrow('Plugin test-plugin already registered')
  })

  it('should get all plugins', () => {
    const plugin1 = new BasePlugin('plugin-1', 'Plugin 1')
    const plugin2 = new BasePlugin('plugin-2', 'Plugin 2')

    manager.register(plugin1)
    manager.register(plugin2)

    expect(manager.getAll()).toHaveLength(2)
  })
})
