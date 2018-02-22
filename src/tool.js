let tool = {
  getQs (source, key) {
    let start = source.indexOf(key) + key.length
    let parseString = source.substring(start)
    start = parseString.indexOf('=') + 1
    parseString = parseString.substring(start).trim()
    let end = parseString.indexOf(';')
    return parseString.substring(0, end)
  }
}
module.exports = tool
