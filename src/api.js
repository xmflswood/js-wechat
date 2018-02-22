let loginUrl = `https://login.wx.qq.com`
let origin = 'https://wx.qq.com'

const api = {
  js_login: `${loginUrl}/jslogin`,
  login: `${loginUrl}/cgi-bin/mmwebwx-bin/login`,
  get_cookie: `${origin}/cgi-bin/mmwebwx-bin/webwxnewloginpage`,
  init: `${origin}/cgi-bin/mmwebwx-bin/webwxinit`
}
module.exports = api
