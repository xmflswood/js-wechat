const api = require('./api')
const qrcode = require('qrcode-terminal')
const $http = require('./request')
const qs = require('qs')
const tool = require('./tool')
const _ = require('lodash')
let uuid = ''
let redirectUri = ''
let pro = {
  skey: '',
  wxsid: '',
  wxuin: '',
  pass_ticket: ''
}
let user = {}
let BaseRequest = {
  BaseRequest: {}
}
let memberList = []
function getClientMsgId () {
  return (Date.now() + Math.random().toFixed(3)).replace('.', '')
}

function login () {
  let params = {
    appid: 'wx782c26e4c19acffb',
    redirect_uri: `https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxnewloginpage`,
    fun: `new`,
    lang: `zh-CN`,
    _: +new Date()
  }
  $http.get(api.js_login, {params: params}).then(
    (res) => {
      // 获取uuid
      uuid = tool.getQs(res.data, 'window.QRLogin.uuid').replace(/"/g, '')
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
  $http.get(api.login, {params: params}).then(
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
  $http.get(api.get_cookie, {params: params}).then(
    (res) => {
      pro.skey = res.data.match(/<skey>(.*)<\/skey>/)[1]
      pro.wxsid = res.data.match(/<wxsid>(.*)<\/wxsid>/)[1]
      pro.wxuin = res.data.match(/<wxuin>(.*)<\/wxuin>/)[1]
      pro.pass_ticket = res.data.match(/<pass_ticket>(.*)<\/pass_ticket>/)[1]
      init()
    }
  )
}
function init () {
  let DeviceID = 'e' + ('' + Math.random().toFixed(15)).substring(2, 17)
  BaseRequest.BaseRequest = {
    Uin: pro.wxuin,
    Sid: pro.wxsid,
    Skey: pro.skey,
    DeviceID: DeviceID
  }
  $http.post(`${api.init}?r=${+new Date()}&pass_ticket=${pro.pass_ticket}`, BaseRequest).then(
    (res) => {
      console.log('初始化成功')
      user = res.data.User
      getContact()
    }
  )
}
function getContact () {
  let params = {
    lang: 'zh_CN',
    pass_ticket: pro.pass_ticket,
    r: +new Date(),
    seq: 0,
    skey: pro.skey
  }
  $http.post(api.get_contact, params).then(
    (res) => {
      memberList = res.data.MemberList
      fathers.forEach((i) => {
        sendText('爸爸您好', findName(i))
      })
      console.log('获取联系人列表成功')
    }
  )
}
function sendText (msg, to) {
  let clientMsgId = getClientMsgId()
  let params = {
    'BaseRequest': BaseRequest,
    'Scene': 0,
    'Msg': {
      'Type': 1,
      'Content': msg,
      'FromUserName': user['UserName'],
      'ToUserName': to,
      'LocalID': clientMsgId,
      'ClientMsgId': clientMsgId
    }
  }
  $http.post(`${api.send_text}?pass_ticket=${pro.pass_ticket}&lang=zh_CN`, params).then(
    (res) => {
      console.log('发送消息成功')
    }
  )
}
function findName (name) {
  for (let i = 0; i < memberList.length; i++) {
    if (memberList[i].RemarkName === name || memberList[i].NickName === name) {
      return memberList[i].UserName
    }
  }
}
let fathers = ['evan', 'wood', 'meteor', '正太']
exports.login = login
