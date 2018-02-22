const api = require('./api')
const axios = require('axios')
const qrcode = require('qrcode-terminal')
const qs = require('qs')
const tool = require('./tool')
let uuid = ''
let redirectUri = ''
let cookies = {
  skey: '',
  wxsid: '',
  wxuin: '',
  pass_ticket: ''
}

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
      uuid = tool.getQs(res.data, 'window.QRLogin.uuid').replace(/"/g, '')
      console.log(uuid)
      qrcode.generate(`https://login.weixin.qq.com/l/${uuid}`, {
        small: true
      })
      waitForLogin()
    }
  )
}
function waitForLogin () {
  console.log('等待手机端确认登录')
  let params = {
    tip: 1,
    uuid: uuid,
    _: +new Date()
  }
  axios.get(api.login, {params: params}).then(
    (res) => {
      let code = parseInt(tool.getQs(res.data, 'window.code'))
      if (code === 200) {
        console.log('手机端确认登录,等待获取cookies')
        redirectUri = tool.getQs(res.data, 'window.redirect_uri')
        getCookies()
      } else {
        setTimeout(() => {
          waitForLogin()
        }, 3000)
      }
    }
  )
}
function getCookies () {
  let qsp = qs.parse(redirectUri.substring(redirectUri.indexOf('?') + 1))
  let params = {
    ticket: qsp.ticket,
    uuid: uuid,
    lang: qsp.lang,
    scan: qsp.scan,
    fun: 'new'
  }
  axios.get(api.get_cookie, {params: params}).then(
    (res) => {
      cookies.skey = res.data.match(/<skey>(.*)<\/skey>/)[1]
      cookies.wxsid = res.data.match(/<wxsid>(.*)<\/wxsid>/)[1]
      cookies.wxuin = res.data.match(/<wxuin>(.*)<\/wxuin>/)[1]
      cookies.pass_ticket = res.data.match(/<pass_ticket>(.*)<\/pass_ticket>/)[1]
      console.log('获取cookies成功,等待初始化')
      init()
    }
  )
}
function init () {
  let DeviceID = 'e' + ('' + Math.random().toFixed(15)).substring(2, 17)
  let params = {
    BaseRequest: {
      Uin: cookies.wxuin,
      Sid: cookies.wxsid,
      Skey: cookies.skey,
      DeviceID: DeviceID
    }
  }
  axios.post(`${api.init}?r=${+new Date()}&pass_ticket=${cookies.pass_ticket}`, params).then(
    (res) => {
      console.log(res.data)
    }
  )
}
exports.login = login
