import { fileURLToPath } from 'node:url'

const GLADOS_ORIGIN = 'https://glados.rocks'
const GLADOS_HOSTNAME = new URL(GLADOS_ORIGIN).hostname

export const isAlreadyCheckedInMessage = (message = '') =>
  String(message).includes("Today's observation logged")

export const buildBrowserHeaders = (userAgent = '') => ({
  accept: 'application/json, text/plain, */*',
  origin: GLADOS_ORIGIN,
  'user-agent': String(userAgent).trim(),
})

export const describeCheckinError = (result = {}) => {
  const message = result?.message || 'Unknown GLaDOS check-in error'
  const details = ['reason', 'loginDevice', 'currentDevice']
    .filter((key) => result?.[key])
    .map((key) => `${key}=${result[key]}`)

  return details.length ? `${message} (${details.join(', ')})` : message
}

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
  const userAgent = String(process.env.GLADOS_USER_AGENT || '').trim()
  if (!userAgent) {
    return {
      notice: [
        'Checkin Error',
        'GLADOS_USER_AGENT is not configured; it must match the browser that created the cookie',
      ],
      errors: [
        'GLADOS_USER_AGENT is not configured; it must match the browser that created the cookie',
      ],
      failures: 1,
      successes: 0,
    }
  }
  for (const cookie of String(process.env.GLADOS).split('\n')) {
    if (!cookie) continue
    try {
      const common = {
        ...buildBrowserHeaders(userAgent),
        cookie,
      }
      const action = await fetch(`${GLADOS_ORIGIN}/api/user/checkin`, {
        method: 'POST',
        headers: { ...common, 'content-type': 'application/json;charset=UTF-8' },
        body: JSON.stringify({ token: GLADOS_HOSTNAME }),
      }).then((r) => r.json())
      if (action?.code && !isAlreadyCheckedInMessage(action?.message)) {
        throw new Error(describeCheckinError(action))
      }
      const status = await fetch(`${GLADOS_ORIGIN}/api/user/status`, {
        method: 'GET',
        headers: { ...common },
      }).then((r) => r.json())
      if (status?.code) throw new Error(describeCheckinError(status))
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
