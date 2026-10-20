import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: '/api',
  timeout: 8000,
})

http.interceptors.response.use(
  (res) => {
    const json = res.data
    if (json && typeof json === 'object' && 'code' in json) {
      if (json.code !== 0) {
        ElMessage.error(json.message || '请求失败')
        return Promise.reject(json)
      }
      return json.data
    }
    return json
  },
  (err) => {
    ElMessage.error(err?.response?.data?.message || err.message || '网络异常')
    return Promise.reject(err)
  }
)

export default {
  list: () => http.get('/entries'),
  create: (data) => http.post('/entries', data),
  update: (id, data) => http.put(`/entries/${id}`, data),
  remove: (id) => http.delete(`/entries/${id}`),
}
