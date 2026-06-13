import { spawn } from 'node:child_process'
import { test } from 'node:test'
import assert from 'node:assert/strict'

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
    NOTIFY: 'console:log',
  })

  assert.equal(result.code, 1)
  assert.match(result.stdout, /Checkin Error/)
})
