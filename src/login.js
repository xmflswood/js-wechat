const api = require('./api')
const axios = require('axios')
const qrcode = require('qrcode-terminal')
const qs = require('qs')
let uuid = ''

function login () {
  let params = {
    appid: 'wx782c26e4c19acffb',
    redirect_uri: `https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxnewloginpage`,
    fun: `new`,
    lang: `zh-CN`,
    _: +new Date()
  }
  axios.get(api.js_login, {params: params}).then(
    (res) => {
      // 获取uuid
      uuid = qs.parse(res.data, {delimiter: ';'})[' window.QRLogin.uuid '].trim().substring(1, 13)
      qrcode.generate(`https://login.weixin.qq.com/l/${uuid}`, {
        small: true
      })
    }
  )
}
exports.login = login
