import { fileURLToPath } from 'node:url'

export const isAlreadyCheckedInMessage = (message = '') =>
  String(message).includes("Today's observation logged")

const glados = async () => {
  const notice = []
  const errors = []
  let failures = 0
  let successes = 0
  if (!process.env.GLADOS) {
    return {
      notice: ['Checkin Error', 'GLADOS secret is not configured'],
      errors: ['GLADOS secret is not configured'],
      failures: 1,
      successes: 0,
    }
  }
  for (const cookie of String(process.env.GLADOS).split('\n')) {
    if (!cookie) continue
    try {
      const common = {
        'cookie': cookie,
        'referer': 'https://glados.rocks/console/checkin',
        'user-agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)',
      }
      const action = await fetch('https://glados.rocks/api/user/checkin', {
        method: 'POST',
        headers: { ...common, 'content-type': 'application/json' },
        body: '{"token":"glados.one"}',
      }).then((r) => r.json())
      if (action?.code && !isAlreadyCheckedInMessage(action?.message)) {
        throw new Error(action?.message)
      }
      const status = await fetch('https://glados.rocks/api/user/status', {
        method: 'GET',
        headers: { ...common },
      }).then((r) => r.json())
      if (status?.code) throw new Error(status?.message)
      notice.push(
        'Checkin OK',
        `${action?.message}`,
        `Left Days ${Number(status?.data?.leftDays)}`
      )
      successes += 1
    } catch (error) {
      const message = `${error}`
      failures += 1
      errors.push(message)
      notice.push(
        'Checkin Error',
        message,
        `<${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}>`
      )
    }
  }
  return { notice, errors, failures, successes }
}

const notify = async (notice) => {
  if (!process.env.NOTIFY || !notice) return
  for (const option of String(process.env.NOTIFY).split('\n')) {
    if (!option) continue
    try {
      if (option.startsWith('console:')) {
        for (const line of notice) {
          console.log(line)
        }
      } else if (option.startsWith('wxpusher:')) {
        await fetch(`https://wxpusher.zjiecode.com/api/send/message`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            appToken: option.split(':')[1],
            summary: notice[0],
            content: notice.join('<br>'),
            contentType: 3,
            uids: option.split(':').slice(2),
          }),
        })
      } else if (option.startsWith('pushplus:')) {
        await fetch(`https://www.pushplus.plus/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: option.split(':')[1],
            title: notice[0],
            content: notice.join('<br>'),
            template: 'markdown',
          }),
        })
      } else if (option.startsWith('qyweixin:')) {
        const qyweixinToken = option.split(':')[1]
        const qyweixinNotifyRebotUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=' + qyweixinToken;
        await fetch(qyweixinNotifyRebotUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            msgtype: 'markdown',
            markdown: {
                content: notice.join('<br>')
            }
          }),
        })
      } else {
        // fallback
        await fetch(`https://www.pushplus.plus/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: option,
            title: notice[0],
            content: notice.join('<br>'),
            template: 'markdown',
          }),
        })
      }
    } catch (error) {
      throw error
    }
  }
}

const main = async () => {
  const result = await glados()
  await notify(result.notice)
  console.log(`Checkin finished: ${result.successes} success, ${result.failures} failed`)
  if (result.failures > 0) {
    for (const error of result.errors) {
      console.error(`Checkin failure: ${error}`)
    }
    process.exitCode = 1
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
