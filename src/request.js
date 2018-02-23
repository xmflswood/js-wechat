const axios = require('axios')
let Cookie = {}
const getPgv = c => {
  return (c || '') + Math.round(2147483647 * (Math.random() || 0.5)) * (+new Date() % 1E10)
}
axios.interceptors.request.use(config => {
  Cookie['pgv_pvi'] = getPgv()
  Cookie['pgv_si'] = getPgv('s')
  config.headers['cookie'] = Object.keys(Cookie).map(key => {
    return `${key}=${Cookie[key]}`
  }).join('; ')
  return config
}, err => {
  return Promise.reject(err)
})
axios.interceptors.response.use(res => {
  let setCookie = res.headers['set-cookie']
  if (setCookie) {
    setCookie.forEach(item => {
      let pm = item.match(/^(.+?)\s?=\s?(.+?);/)
      if (pm) {
        Cookie[pm[1]] = pm[2]
      }
    })
  }
  return res
}, err => {
  return Promise.reject(err)
})
module.exports = axios
