import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface VirtualScrollOptions<T> {
  /** Array of items to virtualize */
  items: Ref<T[]> | T[]
  /** Height of each item in pixels */
  itemHeight: number
  /** Height of the viewport/container in pixels */
  viewportHeight: number
  /** Number of extra items to render outside viewport (for smooth scrolling) */
  buffer?: number
}

export interface VirtualScrollResult<T> {
  /** Items currently visible in viewport (plus buffer) */
  visibleItems: ComputedRef<T[]>
  /** Total height of all items */
  totalHeight: ComputedRef<number>
  /** Vertical offset for the visible container */
  offsetY: ComputedRef<number>
  /** Index of first visible item */
  startIndex: ComputedRef<number>
  /** Index of last visible item */
  endIndex: ComputedRef<number>
  /** Current scroll position */
  scrollTop: Ref<number>
  /** Handle scroll event */
  onScroll: (event: Event) => void
  /** Scroll to a specific item index */
  scrollToIndex: (index: number) => void
  /** Scroll to a specific pixel offset */
  scrollToOffset: (offset: number) => void
}

/**
 * Vue 3 composable for virtual scrolling
 *
 * @example
 * ```vue
 * <template>
 *   <div class="viewport" @scroll="onScroll" ref="viewportRef">
 *     <div :style="{ height: `${totalHeight}px` }">
 *       <div
 *         v-for="item in visibleItems"
 *         :key="item.id"
 *         :style="{ transform: `translateY(${offsetY}px)` }"
 *       >
 *         {{ item.text }}
 *       </div>
 *     </div>
 *   </div>
 * </template>
 *
 * <script setup>
 * import { useVirtualScroll } from './useVirtualScroll'
 *
 * const items = ref([...])
 * const { visibleItems, totalHeight, offsetY, onScroll } = useVirtualScroll({
 *   items,
 *   itemHeight: 40,
 *   viewportHeight: 600
 * })
 * </script>
 * ```
 */
export function useVirtualScroll<T>(
  options: VirtualScrollOptions<T>
): VirtualScrollResult<T> {
  const scrollTop = ref(0)

  // Ensure items is always a ref
  const itemsRef = computed(() => {
    return Array.isArray(options.items) ? options.items : options.items.value
  })

  const buffer = options.buffer ?? 3

  // Total height of all items
  const totalHeight = computed(() => {
    return itemsRef.value.length * options.itemHeight
  })

  // Calculate visible range
  const startIndex = computed(() => {
    const index = Math.floor(scrollTop.value / options.itemHeight)
    return Math.max(0, index - buffer)
  })

  const endIndex = computed(() => {
    const visibleCount = Math.ceil(options.viewportHeight / options.itemHeight)
    const index = Math.floor(scrollTop.value / options.itemHeight) + visibleCount
    return Math.min(itemsRef.value.length - 1, index + buffer)
  })

  // Get visible items
  const visibleItems = computed(() => {
    if (itemsRef.value.length === 0) return []
    return itemsRef.value.slice(startIndex.value, endIndex.value + 1)
  })

  // Calculate offset for the visible container
  const offsetY = computed(() => {
    return startIndex.value * options.itemHeight
  })

  // Handle scroll events
  function onScroll(event: Event) {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
  }

  // Scroll to specific index
  function scrollToIndex(index: number) {
    const clampedIndex = Math.max(0, Math.min(index, itemsRef.value.length - 1))
    scrollTop.value = clampedIndex * options.itemHeight
  }

  // Scroll to specific offset
  function scrollToOffset(offset: number) {
    const maxOffset = totalHeight.value - options.viewportHeight
    scrollTop.value = Math.max(0, Math.min(offset, maxOffset))
  }

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    scrollTop,
    onScroll,
    scrollToIndex,
    scrollToOffset,
  }
}

export default useVirtualScroll
