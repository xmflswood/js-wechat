const api = require('./api')
const qrcode = require('qrcode-terminal')
const qs = require('qs')
const axios = require('axios')
const tool = require('./tool')
const MessageFactory = require('./message')
const _ = require('lodash')

class Wx {
  constructor () {
    this.uuid = ''
    this.redirectUri = ''
    this.isLogin = false
    this.prop = {
      skey: '',
      wxsid: '',
      wxuin: '',
      pass_ticket: '',
      formatedSyncKey: '',
      webwxDataTicket: '',
      syncKey: {
        List: []
      }
    }
    this.user = {}
    this.BaseRequest = {
      BaseRequest: {}
    }
    this.Message = MessageFactory(this)
    this.contacts = {}
    this.Cookie = {}
    this._setAxios()
    this.$http = axios
    // extends?
    this.syncPollingId = 0
    this.lastSyncTime = 0
  }
  _setAxios () {
    axios.interceptors.request.use(config => {
      this.Cookie['pgv_pvi'] = getPgv()
      this.Cookie['pgv_si'] = getPgv('s')
      config.headers['cookie'] = Object.keys(this.Cookie).map(key => {
        return `${key}=${this.Cookie[key]}`
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
            this.Cookie[pm[1]] = pm[2]
          }
        })
      }
      return res
    }, err => {
      return Promise.reject(err)
    })
  }
  _getQrCodeUrl () {
    let params = {
      appid: 'wx782c26e4c19acffb',
      redirect_uri: `https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxnewloginpage`,
      fun: `new`,
      lang: `zh-CN`,
      _: +new Date()
    }
    return this.$http.get(api.js_login, {params: params}).then(
      (res) => {
        // 获取uuid
        this.uuid = tool.getQs(res.data, 'window.QRLogin.uuid').replace(/"/g, '')
        qrcode.generate(`https://login.weixin.qq.com/l/${this.uuid}`, {
          small: true
        })
      }
    )
  }
  _waitForLogin () {
    this.loginTimer = setInterval(this._checkLogin.bind(this), 500)
    return new Promise((resolve, reject) => {
      this.loginResolve = resolve
      this.loginReject = reject
    })
  }
  _checkLogin () {
    let params = {
      tip: 1,
      uuid: this.uuid,
      _: +new Date()
    }
    this.$http.get(api.login, {params: params}).then(
      (res) => {
        let code = parseInt(tool.getQs(res.data, 'window.code'))
        if (code === 200) {
          this.redirectUri = tool.getQs(res.data, 'window.redirect_uri')
          clearInterval(this.loginTimer)
          this.loginResolve()
        }
      }
    )
  }
  _getCookies () {
    let qsp = qs.parse(this.redirectUri.substring(this.redirectUri.indexOf('?') + 1))
    let params = {
      ticket: qsp.ticket,
      uuid: this.uuid,
      lang: qsp.lang,
      scan: qsp.scan,
      fun: 'new'
    }
    return this.$http.get(api.get_cookie, {params: params}).then(
      (res) => {
        this.prop.skey = res.data.match(/<skey>(.*)<\/skey>/)[1]
        this.prop.wxsid = res.data.match(/<wxsid>(.*)<\/wxsid>/)[1]
        this.prop.wxuin = res.data.match(/<wxuin>(.*)<\/wxuin>/)[1]
        this.prop.pass_ticket = res.data.match(/<pass_ticket>(.*)<\/pass_ticket>/)[1]
      }
    )
  }
  _wxinit () {
    this.BaseRequest.BaseRequest = {
      Uin: this.prop.wxuin,
      Sid: this.prop.wxsid,
      Skey: this.prop.skey,
      DeviceID: getDeviceID()
    }
    return this.$http.post(`${api.init}?r=${+new Date()}&pass_ticket=${this.prop.pass_ticket}`, this.BaseRequest).then(
      (res) => {
        this.user = res.data.User
        this.isLogin = true
        this.updateSyncKey(res.data)
      }
    )
  }
  _getContact (seq = 0) {
    let params = {
      lang: 'zh_CN',
      pass_ticket: this.prop.pass_ticket,
      r: +new Date(),
      seq: seq,
      skey: this.prop.skey
    }
    return this.$http.post(api.get_contact, params).then(
      (res) => {
        this.updateContacts(res.data.MemberList || [])
        // this.contacts = res.data.MemberList || []
      }
    )
  }
  notifyMobile () {
    let params = {
      'BaseRequest': this.BaseRequest,
      'Code': 3,
      'FromUserName': this.user['UserName'],
      'ToUserName': this.user['UserName'],
      'ClientMsgId': getClientMsgId()
    }
    return this.$http.post(`${api.notify}?pass_ticket=${this.prop.pass_ticket}`, params)
  }
  batchGetContact (contacts) {
    let params = {
      'BaseRequest': this.BaseRequest,
      'Count': contacts.length,
      'List': contacts
    }
    return this.$http.post(`${api.webwxbatchgetcontact}?pass_ticket=${this.prop.pass_ticket}&type=ex&r=${+new Date()}&lang=zh_CN`, params).then(
      (res) => {
        return res.data.ContactList
      }
    )
  }
  async syncPolling (id = ++this.syncPollingId) {
    let code = +await this.syncCheck()
    if (code !== 0) {
      let newData = await this.sync()
      this.handleSync(newData)
    }
    this.lastSyncTime = Date.now()
    this.syncPolling(id)
  }
  syncCheck () {
    let params = {
      'r': +new Date(),
      'sid': this.prop.wxsid,
      'uin': this.prop.wxuin,
      'skey': this.prop.skey,
      'deviceid': getDeviceID(),
      'synckey': this.prop.formatedSyncKey
    }
    return this.$http.get(api.synccheck, {params: params}).then(
      (res) => {
        let window = {
          synccheck: {}
        }
        try {
          // eslint-disable-next-line
          eval(res.data)
        } catch (ex) {
          window.synccheck = {retcode: '0', selector: '0'}
        }
        return window.synccheck.selector
      }
    )
  }
  sync () {
    let params = {
      'BaseRequest': this.BaseRequest,
      'SyncKey': this.prop.syncKey,
      'rr': ~new Date()
    }
    return this.$http.post(`${api.sync}?sid=${this.prop.wxsid}&skey=${this.prop.skey}&pass_ticket=${this.prop.pass_ticket}&lang=zh_CN`, params).then(
      (res) => {
        this.updateSyncKey(res.data)
        this.prop.skey = res.data.Skey || this.prop.skey
        return res.data
      }
    )
  }
  handleSync (data) {
    if (data.AddMsgCount) {
      this.handleMsg(data.AddMsgList)
    }
    if (data.ModContactCount) {
      this.updateContacts(data.ModContactList)
    }
  }
  handleMsg (data) {
    data.forEach(async msg => {
      if (!this.contacts[msg.FromUserName] ||
      (msg.FromUserName.startsWith('@@') && this.contacts[msg.FromUserName].MemberCount === 0)) {
        let contacts = await this.batchGetContact([{UserName: msg.FromUserName}])
        this.updateContacts(contacts)
      }
      msg = this.Message.extend(msg)
      if (msg.MsgType === 51) {
        let userList = msg.StatusNotifyUserName.split(',').filter(UserName => !this.contacts[UserName])
          .map(UserName => {
            return {
              UserName: UserName
            }
          })
        let all = _.chunk(userList, 50)
        all.forEach(async (i) => {
          let contacts = await this.batchGetContact(i)
          this.updateContacts(contacts)
        })
      }
    })
  }
  updateContacts (contacts) {
    if (!contacts || contacts.length === 0) {
      return
    }
    contacts.forEach(contact => {
      if (!this.contacts[contact.UserName]) {
        this.contacts[contact.UserName] = contact
      }
    })
  }
  updateSyncKey (data) {
    if (data.SyncKey) {
      this.prop.syncKey = data.SyncKey
    }
    if (data.SyncCheckKey) {
      let synckeylist = []
      for (let e = data.SyncCheckKey.List, o = 0, n = e.length; n > o; o++) {
        synckeylist.push(e[o]['Key'] + '_' + e[o]['Val'])
      }
      this.prop.formatedSyncKey = synckeylist.join('|')
    } else if (!this.prop.formatedSyncKey && data.SyncKey) {
      let synckeylist = []
      for (let e = data.SyncKey.List, o = 0, n = e.length; n > o; o++) {
        synckeylist.push(e[o]['Key'] + '_' + e[o]['Val'])
      }
      this.prop.formatedSyncKey = synckeylist.join('|')
    }
  }
  // 常用
  sendText (msg, to) {
    let clientMsgId = getClientMsgId()
    let params = {
      'BaseRequest': this.BaseRequest,
      'Scene': 0,
      'Msg': {
        'Type': 1,
        'Content': msg,
        'FromUserName': this.user['UserName'],
        'ToUserName': to,
        'LocalID': clientMsgId,
        'ClientMsgId': clientMsgId
      }
    }
    this.$http.post(`${api.send_text}?pass_ticket=${this.prop.pass_ticket}&lang=zh_CN`, params).then(
      (res) => {
        console.log('发送消息成功')
      }
    )
  }
  findName (name) {
    let list = Object.values(this.contacts)
    for (let i = 0; i < list.length; i++) {
      if (list[i].NickName === name || list[i].RemarkName === name) {
        return list[i].UserName
      }
    }
  }
}

function getClientMsgId () {
  return (Date.now() + Math.random().toFixed(3)).replace('.', '')
}
function getDeviceID () {
  return 'e' + ('' + Math.random().toFixed(15)).substring(2, 17)
}
const getPgv = c => {
  return (c || '') + Math.round(2147483647 * (Math.random() || 0.5)) * (+new Date() % 1E10)
}
module.exports = Wx
