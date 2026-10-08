import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBrowserHeaders,
  describeCheckinError,
  isAlreadyCheckedInMessage,
} from '../main.js'

test('recognizes GLaDOS already-checked-in responses as successful state', () => {
  assert.equal(
    isAlreadyCheckedInMessage("Today's observation logged. Return tomorrow for more points."),
    true
  )
})

test('does not treat permission errors as already checked in', () => {
  assert.equal(isAlreadyCheckedInMessage('没有权限'), false)
})

test('uses the configured browser identity for GLaDOS requests', () => {
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.4258.62'

  assert.deepEqual(buildBrowserHeaders(userAgent), {
    accept: 'application/json, text/plain, */*',
    origin: 'https://glados.rocks',
    'user-agent': userAgent,
  })
})

test('reports device mismatch details without exposing credentials', () => {
  assert.equal(
    describeCheckinError({
      code: 4,
      message: 'Automated check-in detected. Please sign in again to continue.',
      reason: 'device-mismatch',
      loginDevice: 'macOS',
      currentDevice: 'Windows',
    }),
    'Automated check-in detected. Please sign in again to continue. ' +
      '(reason=device-mismatch, loginDevice=macOS, currentDevice=Windows)'
  )
})
