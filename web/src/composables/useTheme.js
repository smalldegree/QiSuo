import { ref, watch } from 'vue'

/**
 * 主题配置清单
 * - id: CSS 选择器 data-theme 的值，写入 <html data-theme="xxx"> 来切换
 * - name: UI 展示名，在切换器上显示的中文标签
 * - dot: 切换器小圆点的颜色，让用户一眼区分不同主题
 */
export const THEMES = [
  { id: 'aurora',    name: '极光',   dot: '#00d4ff' },  // 极光默认主题，蓝紫渐变 + 深色
  { id: 'cybergrid', name: '赛博',   dot: '#00ff88' },  // 赛博网格主题，霓虹绿 + 扫描线特效
  { id: 'paper',     name: '极简',   dot: '#3b5caf' },  // 极简纸面主题，浅色无光晕
]

const STORAGE_KEY = 'portal-theme' // localStorage 里存主题的 key
const DEFAULT = 'aurora'           // 未设置或读取失败时的兜底主题

// 读取初始主题：先查 localStorage，校验是否是合法 id，否则回退 DEFAULT
function readInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && THEMES.some(t => t.id === saved)) return saved // 校验合法性，防止用户手动改 localStorage 注入无效值
  } catch {} // localStorage 在某些隐私模式下会抛异常，静默忽略
  return DEFAULT
}

/**
 * 主题切换 composable
 * 1. 启动时读取 localStorage 并应用到 <html data-theme="...">
 * 2. 提供 setTheme / toggle 方法
 * 3. current 响应式，写入时自动同步 DOM + localStorage
 */
export function useTheme() {
  const current = ref(readInitial()) // 响应式的当前主题 id，组件订阅它来展示切换器激活态

  // 把主题 id 写入 <html data-theme="xxx">，CSS 变量选择器靠它生效
  function apply(id) {
    document.documentElement.setAttribute('data-theme', id)
  }

  // 模块加载时立即应用一次，保证首屏就是用户上次选的主题
  apply(current.value)

  // watch current：以后任何地方修改 current.value，都自动同步 DOM 和 localStorage
  watch(current, (val) => {
    apply(val)
    try { localStorage.setItem(STORAGE_KEY, val) } catch {}
  })

  // 显式设置主题；只有传入合法 id 才生效，防止拼写错误
  function setTheme(id) {
    if (THEMES.some(t => t.id === id)) current.value = id
  }

  // 循环切换：aurora → cybergrid → paper → aurora
  function toggle() {
    const idx = THEMES.findIndex(t => t.id === current.value)
    current.value = THEMES[(idx + 1) % THEMES.length].id
  }

  return { current, setTheme, toggle, THEMES }
}
