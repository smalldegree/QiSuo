<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from './api'
import { useTheme } from './composables/useTheme'

const { current: theme, setTheme, THEMES } = useTheme()

// 科技风预设色
const PALETTE = [
  'linear-gradient(135deg, #00d4ff, #0099cc)',
  'linear-gradient(135deg, #8a5cff, #5b2eff)',
  'linear-gradient(135deg, #ff3fa4, #c91280)',
  'linear-gradient(135deg, #00f5a0, #00d9f5)',
  'linear-gradient(135deg, #ffd26f, #ff8c42)',
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #11998e, #38ef7d)',
  'linear-gradient(135deg, #fc6076, #ff9a44)',
]

const entries = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)

const form = reactive({
  name: '',
  url: '',
  icon: '',
  color: PALETTE[0],
})

const isEdit = computed(() => editingId.value !== null)
const dialogTitle = computed(() => (isEdit.value ? '编辑入口' : '添加入口'))

async function loadList() {
  loading.value = true
  try {
    entries.value = await api.list()
  } catch (e) {
    // 接口异常已在拦截器提示
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  form.name = ''
  form.url = ''
  form.icon = ''
  form.color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
  dialogVisible.value = true
}

function openEdit(entry) {
  editingId.value = entry.id
  form.name = entry.name
  form.url = entry.url
  form.icon = entry.icon || ''
  form.color = entry.color || PALETTE[0]
  dialogVisible.value = true
}

async function handleSave() {
  const name = form.name.trim()
  let url = form.url.trim()
  if (!name || !url) {
    ElMessage.warning('请填写系统名称和URL')
    return
  }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url

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
    await loadList()
  } catch (e) {
    // 拦截器已提示
  }
}

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
    return
  }
  try {
    await api.remove(entry.id)
    ElMessage.success('已删除')
    await loadList()
  } catch (e) {
    // 拦截器已提示
  }
}

function openEntry(entry) {
  let url = entry.url
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  window.open(url, '_blank')
}

function randomColor() {
  form.color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
}

onMounted(loadList)
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header-left">
        <div class="app-title">栖所</div>
        <div class="app-subtitle">日常的起承转合</div>
      </div>
      <div class="app-header-right">
        <!-- 主题切换器 -->
        <div class="theme-switcher" role="tablist" aria-label="主题">
          <button
            v-for="t in THEMES"
            :key="t.id"
            class="theme-chip"
            :class="{ active: theme === t.id }"
            :aria-selected="theme === t.id"
            @click="setTheme(t.id)"
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
    <div v-loading="loading" class="entry-grid">
      <div
        v-for="e in entries"
        :key="e.id"
        class="entry-card"
        @click="openEntry(e)"
      >
        <div class="entry-icon" :style="{ background: e.color || PALETTE[0] }">
          {{ (e.icon || e.name || '?').slice(0, 1).toUpperCase() }}
        </div>
        <div class="entry-name">{{ e.name }}</div>
        <div class="entry-url">{{ e.url }}</div>
        <div class="entry-actions" @click.stop>
          <button class="action-btn" title="编辑" @click="openEdit(e)">
            <el-icon><Edit /></el-icon>
          </button>
          <button class="action-btn danger" title="删除" @click="handleDelete(e)">
            <el-icon><Delete /></el-icon>
          </button>
        </div>
      </div>

      <div v-if="!loading && entries.length === 0" class="empty-state">
        <div class="empty-icon">⟡</div>
        <p>暂无入口 · 点击右上角「添加入口」开始</p>
      </div>
    </div>
  </div>

  <!-- 新增/编辑 Dialog -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="440px"
    :close-on-click-modal="false"
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
