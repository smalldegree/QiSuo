<script setup>
import { ref, onMounted, computed, reactive } from 'vue'      // Vue 3 Composition API：响应式、生命周期、派生状态
import { ElMessage, ElMessageBox } from 'element-plus'         // Element Plus 的轻提示和确认弹窗
import api from './api'                                        // 封装好的 Axios CRUD 方法
import { useTheme } from './composables/useTheme'             // 主题切换 composable

// 解构 useTheme 返回值：current 当前主题 id、setTheme 切换方法、THEMES 主题清单
const { current: theme, setTheme, THEMES } = useTheme()

// 科技风预设渐变色卡，供用户选择入口卡片背景；新增/编辑对话框的"主题色"就从这里挑
const PALETTE = [
  'linear-gradient(135deg, #00d4ff, #0099cc)',    // 青蓝
  'linear-gradient(135deg, #8a5cff, #5b2eff)',    // 紫
  'linear-gradient(135deg, #ff3fa4, #c91280)',    // 粉
  'linear-gradient(135deg, #00f5a0, #00d9f5)',    // 青绿
  'linear-gradient(135deg, #ffd26f, #ff8c42)',    // 橙黄
  'linear-gradient(135deg, #667eea, #764ba2)',    // 蓝紫
  'linear-gradient(135deg, #11998e, #38ef7d)',    // 青绿
  'linear-gradient(135deg, #fc6076, #ff9a44)',    // 珊瑚
]

// 卡片网格里的入口数据，由 loadList 从后端拉取后赋值
const entries = ref([])
// loading 给卡片网格的 v-loading 指令用，请求期间显示遮罩
const loading = ref(false)
// 控制新增/编辑 Dialog 的显示与隐藏
const dialogVisible = ref(false)
// 当前编辑的入口 id；null 表示"新增模式"，非 null 表示"编辑模式"
const editingId = ref(null)

// Dialog 里的表单模型，用 reactive 保证深层字段响应式；图标字留空、颜色随机预设
const form = reactive({
  name: '',
  url: '',
  icon: '',
  color: PALETTE[0],
})

// 派生状态：根据 editingId 是否为 null 判断当前 Dialog 处于编辑还是新增
const isEdit = computed(() => editingId.value !== null)
// Dialog 标题：新增时"添加入口"，编辑时"编辑入口"
const dialogTitle = computed(() => (isEdit.value ? '编辑入口' : '添加入口'))

// 拉取入口列表；接口异常被拦截器拦截并弹提示，这里 catch 留空即可
async function loadList() {
  loading.value = true
  try {
    entries.value = await api.list() // api.list() 直接返回数组（拦截器已拆包）
  } catch (e) {
    // 接口异常已在拦截器提示
  } finally {
    loading.value = false
  }
}

// 打开新增 Dialog：重置所有字段，随机挑一个渐变色作为默认色
function openCreate() {
  editingId.value = null
  form.name = ''
  form.url = ''
  form.icon = ''
  form.color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
  dialogVisible.value = true
}

// 打开编辑 Dialog：把现有入口数据灌进表单模型
function openEdit(entry) {
  editingId.value = entry.id
  form.name = entry.name
  form.url = entry.url
  form.icon = entry.icon || ''                      // 数据库存的 null 转成空串给 input
  form.color = entry.color || PALETTE[0]            // 没设颜色时兜底用第一个色卡
  dialogVisible.value = true
}

// Dialog 的保存按钮回调：校验 → 补 https:// → 根据 isEdit 调 create 或 update → 刷新列表
async function handleSave() {
  const name = form.name.trim()
  let url = form.url.trim()
  if (!name || !url) {
    ElMessage.warning('请填写系统名称和URL')
    return
  }
  // 用户可能只填了 "example.com"，自动补 https://，避免打开时报协议错误
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url

  // 组装 payload：icon 空串转 null（数据库存 null 更干净）
  const payload = { name, url, icon: form.icon.trim() || null, color: form.color }

  try {
    if (isEdit.value) {
      await api.update(editingId.value, payload)
      ElMessage.success('已更新')
    } else {
      await api.create(payload)
      ElMessage.success('已添加')
    }
    dialogVisible.value = false
    await loadList()                               // 保存后重新拉列表，拿到最新排序和时间戳
  } catch (e) {
    // 拦截器已提示
  }
}

// 删除入口：先用 ElMessageBox 让用户二次确认，再调删除接口，成功后刷新
async function handleDelete(entry) {
  try {
    await ElMessageBox.confirm(
      `确定删除入口「${entry.name}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return                                         // 用户点取消，confirm 会 reject，直接 return
  }
  try {
    await api.remove(entry.id)
    ElMessage.success('已删除')
    await loadList()
  } catch (e) {
    // 拦截器已提示
  }
}

// 点击卡片打开入口：同样补 https://，_blank 新开标签页
function openEntry(entry) {
  let url = entry.url
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  window.open(url, '_blank')
}

// 给对话框的"随机"按钮用：从 PALETTE 随机挑一个渐变色
function randomColor() {
  form.color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
}

// 组件挂载后立即加载一次入口列表，保证首屏就有数据
onMounted(loadList)
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header-left">
        <div class="app-title">栖所</div>           <!-- 应用标题，CSS 用 title-gradient 做渐变文字 -->
        <div class="app-subtitle">日常的起承转合</div>
      </div>
      <div class="app-header-right">
        <!-- 主题切换器 -->
        <div class="theme-switcher" role="tablist" aria-label="主题">
          <button
            v-for="t in THEMES"                       <!-- 遍历 composable 导出的主题清单 -->
            :key="t.id"
            class="theme-chip"
            :class="{ active: theme === t.id }"       <!-- 当前选中的主题加 active 类，CSS 有渐变背景 -->
            :aria-selected="theme === t.id"           <!-- 无障碍：告诉屏幕阅读器哪个被选中 -->
            @click="setTheme(t.id)"                   <!-- 点击切换，composable 会自动同步 DOM + localStorage -->
          >
            <span class="theme-dot" :style="{ background: t.dot }"></span>
            {{ t.name }}
          </button>
        </div>
        <el-button type="primary" class="btn-primary" @click="openCreate">
          <el-icon style="margin-right:4px"><Plus /></el-icon>
          添加入口
        </el-button>
      </div>
    </header>

    <!-- 卡片网格 -->
    <div v-loading="loading" class="entry-grid">     <!-- v-loading 是 Element Plus 的加载指令 -->
      <div
        v-for="e in entries"                          <!-- 遍历后端返回的入口数据渲染卡片 -->
        :key="e.id"
        class="entry-card"
        @click="openEntry(e)"                         <!-- 点卡片本身打开 URL -->
      >
        <!-- 图标区：取 entry.color 渐变背景，缺省用 PALETTE[0]；内容是图标字首字母大写 -->
        <div class="entry-icon" :style="{ background: e.color || PALETTE[0] }">
          {{ (e.icon || e.name || '?').slice(0, 1).toUpperCase() }}
        </div>
        <div class="entry-name">{{ e.name }}</div>
        <div class="entry-url">{{ e.url }}</div>
        <!-- 右上角的编辑/删除按钮，hover 时才显现；@click.stop 防止冒泡触发卡片跳转 -->
        <div class="entry-actions" @click.stop>
          <button class="action-btn" title="编辑" @click="openEdit(e)">
            <el-icon><Edit /></el-icon>
          </button>
          <button class="action-btn danger" title="删除" @click="handleDelete(e)">
            <el-icon><Delete /></el-icon>
          </button>
        </div>
      </div>

      <!-- 空态：加载完成且 entries 为空时展示 -->
      <div v-if="!loading && entries.length === 0" class="empty-state">
        <div class="empty-icon">⟡</div>
        <p>暂无入口 · 点击右上角「添加入口」开始</p>
      </div>
    </div>
  </div>

  <!-- 新增/编辑 Dialog -->
  <el-dialog
    v-model="dialogVisible"                          <!-- 双向绑定 visible 状态 -->
    :title="dialogTitle"                              <!-- 用 computed 动态显示"添加入口"或"编辑入口" -->
    width="440px"
    :close-on-click-modal="false"                     <!-- 点遮罩不关闭，防止误操作丢数据 -->
  >
    <el-form label-width="90px" label-position="right">
      <el-form-item label="系统名称">
        <el-input v-model="form.name" placeholder="如：企业邮箱 / 代码仓库" maxlength="40" show-word-limit />
      </el-form-item>
      <el-form-item label="登录地址">
        <el-input v-model="form.url" placeholder="https://example.com/login" />
      </el-form-item>
      <el-form-item label="图标字">
        <el-input v-model="form.icon" placeholder="留空则自动取名称首字" maxlength="2" />
      </el-form-item>
      <el-form-item label="主题色">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="color-picker">
            <!-- 遍历 PALETTE 渐变色卡，选中的加 active 类显示描边 -->
            <div
              v-for="(c, i) in PALETTE"
              :key="i"
              class="color-dot"
              :class="{ active: form.color === c }"
              :style="{ background: c }"
              @click="form.color = c"
            />
          </div>
          <el-button link type="primary" @click="randomColor">
            <el-icon style="margin-right:2px"><Refresh /></el-icon>
            随机
          </el-button>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" class="btn-primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>
