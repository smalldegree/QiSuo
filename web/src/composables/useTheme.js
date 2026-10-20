import { ref, watch } from 'vue'

/**
 * 主题配置清单
 * - id: CSS 选择器 data-theme 的值
 * - name: UI 展示名
 * - dot: 切换器小圆点的颜色
 */
export const THEMES = [
  { id: 'aurora',    name: '极光',   dot: '#00d4ff' },
  { id: 'cybergrid', name: '赛博',   dot: '#00ff88' },
  { id: 'paper',     name: '极简',   dot: '#3b5caf' },
]

const STORAGE_KEY = 'portal-theme'
const DEFAULT = 'aurora'

function readInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && THEMES.some(t => t.id === saved)) return saved
  } catch {}
  return DEFAULT
}

/**
 * 主题切换 composable
 * 1. 启动时读取 localStorage 并应用到 <html data-theme="...">
 * 2. 提供 setTheme / toggle 方法
 * 3. current 响应式，写入时自动同步 DOM + localStorage
 */
export function useTheme() {
  const current = ref(readInitial())

  // 立即应用到 DOM
  function apply(id) {
    document.documentElement.setAttribute('data-theme', id)
  }

  // 首次同步
  apply(current.value)

  // watch 后自动持久化
  watch(current, (val) => {
    apply(val)
    try { localStorage.setItem(STORAGE_KEY, val) } catch {}
  })

  function setTheme(id) {
    if (THEMES.some(t => t.id === id)) current.value = id
  }

  function toggle() {
    const idx = THEMES.findIndex(t => t.id === current.value)
    current.value = THEMES[(idx + 1) % THEMES.length].id
  }

  return { current, setTheme, toggle, THEMES }
}
