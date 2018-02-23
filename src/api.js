let loginUrl = `https://login.wx.qq.com`
let origin = 'https://wx.qq.com'

const api = {
  js_login: `${loginUrl}/jslogin`,
  login: `${loginUrl}/cgi-bin/mmwebwx-bin/login`,
  get_cookie: `${origin}/cgi-bin/mmwebwx-bin/webwxnewloginpage`,
  init: `${origin}/cgi-bin/mmwebwx-bin/webwxinit`,
  get_contact: `${origin}/cgi-bin/mmwebwx-bin/webwxgetcontact`,
  get_qun: `${origin}/cgi-bin/mmwebwx-bin/webwxbatchgetcontact`,
  send_text: `${origin}/cgi-bin/mmwebwx-bin/webwxsendmsg`
}
module.exports = api
