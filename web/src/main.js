import { createApp } from 'vue'                    // Vue 3 的应用工厂，替代 Vue 2 的 new Vue()
import ElementPlus from 'element-plus'              // Element Plus 组件库本体
import 'element-plus/dist/index.css'                // Element Plus 的全局样式，不引入组件会裸奔
import * as ElementPlusIconsVue from '@element-plus/icons-vue' // Element Plus 图标全集，后续批量注册
import App from './App.vue'                         // 根组件，整个应用的起点
import './style.css'                               // 全局样式（含三套主题的 CSS 变量和组件样式）

const app = createApp(App)                          // 创建 Vue 应用实例，尚未挂载到 DOM

// 遍历图标对象，把每个图标组件都注册为全局组件，这样模板里直接用 <Edit /> <Delete /> 不需要单独 import
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)                                // 安装 Element Plus，注入 ElMessage / ElMessageBox 等全局 API
app.mount('#app')                                   // 挂载到 index.html 里 <div id="app"> 上，应用启动
