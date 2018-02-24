/* Message Object Example
{
    "FromUserName": "",
    "ToUserName": "",
    "Content": "",
    "StatusNotifyUserName": "",
    "ImgWidth": 0,
    "PlayLength": 0,
    "RecommendInfo": {},
    "StatusNotifyCode": 4,
    "NewMsgId": "",
    "Status": 3,
    "VoiceLength": 0,
    "ForwardFlag": 0,
    "AppMsgType": 0,
    "Ticket": "",
    "AppInfo": {...},
    "Url": "",
    "ImgStatus": 1,
    "MsgType": 1,
    "ImgHeight": 0,
    "MediaId": "",
    "MsgId": "",
    "FileName": "",
    "HasProductId": 0,
    "FileSize": "",
    "CreateTime": 0,
    "SubMsgType": 0
}
*/
function convertEmoji (s) {
  return s ? s.replace(/<span.*?class="emoji emoji(.*?)"><\/span>/g, (a, b) => {
    switch (b.toLowerCase()) {
      case '1f639':
        b = '1f602'
        break
      case '1f64d':
        b = '1f614'
        break
    }
    try {
      let s = null
      if (b.length === 4 || b.length === 5) {
        s = ['0x' + b]
      } else if (b.length === 8) {
        s = ['0x' + b.slice(0, 4), '0x' + b.slice(4, 8)]
      } else if (b.length === 10) {
        s = ['0x' + b.slice(0, 5), '0x' + b.slice(5, 10)]
      } else {
        throw new Error('unknown emoji characters')
      }
      return String.fromCodePoint.apply(null, s)
    } catch (err) {
      return '*'
    }
  }) : ''
}
function formatNum (num, length) {
  num = (isNaN(num) ? 0 : num).toString()
  let n = length - num.length

  return n > 0 ? [new Array(n + 1).join('0'), num].join('') : num
}

const messageProto = {
  init: function (instance) {
    this.MsgType = +this.MsgType
    this.isSendBySelf = this.FromUserName === instance.user.UserName || this.FromUserName === ''

    this.OriginalContent = this.Content
    if (this.FromUserName.indexOf('@@') === 0) {
      this.Content = this.Content.replace(/^@.*?(?=:)/, match => {
        let user = instance.contacts[this.FromUserName].MemberList.find(member => {
          return member.UserName === match
        })
        return user ? instance.Contact.getDisplayName(user) : match
      })
    }

    this.Content = this.Content.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<br\/>/g, '\n')
    this.Content = convertEmoji(this.Content)

    return this
  },
  isSendBy: function (contact) {
    return this.FromUserName === contact.UserName
  },
  getPeerUserName: function () {
    return this.isSendBySelf ? this.ToUserName : this.FromUserName
  },
  getDisplayTime: function () {
    var time = new Date(1e3 * this.CreateTime)
    return time.getHours() + ':' + formatNum(time.getMinutes(), 2)
  }
}

function MessageFactory (instance) {
  return {
    extend: function (messageObj) {
      messageObj = Object.setPrototypeOf(messageObj, messageProto)
      return messageObj.init(instance)
    }
  }
}
module.exports = MessageFactory
