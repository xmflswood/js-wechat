const Bot = require('./src/bot')
let bot = new Bot()
async function init () {
  await bot._getQrCodeUrl()
  console.log('等待手机端确认登录')
  await bot._waitForLogin()
  await bot._getCookies()
  console.log('获取cookies成功')
  await bot._wxinit()
  console.log('初始化成功')
  return true
}
async function main () {
  await init()
  bot.syncPolling()
  // await bot._getContact()
  // bot.lastSyncTime = Date.now()
}
main()
