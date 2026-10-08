import { spawn } from 'node:child_process'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const TEST_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/154.0.0.0 Safari/537.36 Edg/154.0.4258.62'

const runMain = (env = {}) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, ['main.js'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('close', (code) => {
      resolve({ code, stdout, stderr })
    })
  })

test('exits with failure when a configured check-in fails', async () => {
  const result = await runMain({
    GLADOS: 'invalid-cookie',
    GLADOS_USER_AGENT: TEST_USER_AGENT,
    NOTIFY: 'console:log',
  })

  assert.equal(result.code, 1)
  assert.match(result.stdout, /Checkin Error/)
})

test('prints a safe failure reason even without console notification', async () => {
  const result = await runMain({
    GLADOS: 'invalid-cookie',
    GLADOS_USER_AGENT: TEST_USER_AGENT,
    NOTIFY: '',
  })

  assert.equal(result.code, 1)
  assert.match(result.stderr, /Checkin failure: Error: /)
})

test('fails clearly when the browser user agent is missing', async () => {
  const result = await runMain({
    GLADOS: 'configured-cookie',
    GLADOS_USER_AGENT: '',
    NOTIFY: '',
  })

  assert.equal(result.code, 1)
  assert.match(result.stderr, /GLADOS_USER_AGENT is not configured/)
})
