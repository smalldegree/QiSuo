import axios from 'axios'
import { ElMessage } from 'element-plus' // 用 Element Plus 的全局消息组件做错误提示

// 创建一个 axios 实例，所有请求走同一个 http 客户端，便于统一拦截
const http = axios.create({
  baseURL: '/api',   // 所有请求自动加 /api 前缀；生产环境 Nginx 把 /api 反代到 Express 3001
  timeout: 8000,     // 8 秒超时，防止后端挂死时前端无限等待
})

// 响应拦截器：把后端的 { code, data, message } 统一拆出来
http.interceptors.response.use(
  (res) => {
    const json = res.data
    // 判断是不是我们约定的后端响应格式（有 code 字段且是对象）
    if (json && typeof json === 'object' && 'code' in json) {
      if (json.code !== 0) {
        // 业务错误（如 400 参数缺失、自定义校验失败），弹 Element Plus 错误提示并 reject
        ElMessage.error(json.message || '请求失败')
        return Promise.reject(json)
      }
      // 业务成功，只把 data 字段交给调用方，调用方拿到的就是纯数据
      return json.data
    }
    // 不是约定格式（比如第三方接口），原样返回
    return json
  },
  (err) => {
    // 网络层 / HTTP 状态码错误（404、500、超时、断网），弹错误提示后 reject
    ElMessage.error(err?.response?.data?.message || err.message || '网络异常')
    return Promise.reject(err)
  }
)

// 对外暴露统一的 CRUD 方法，组件里用 api.list() / api.create(...) 即可
// 拦截器已经帮我们拆过包，所以 list() 直接拿到数组，不需要再 .data
export default {
  list: () => http.get('/entries'),
  create: (data) => http.post('/entries', data),
  update: (id, data) => http.put(`/entries/${id}`, data),
  remove: (id) => http.delete(`/entries/${id}`),
}
