import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isAlreadyCheckedInMessage } from '../main.js'

test('recognizes GLaDOS already-checked-in responses as successful state', () => {
  assert.equal(
    isAlreadyCheckedInMessage("Today's observation logged. Return tomorrow for more points."),
    true
  )
})

test('does not treat permission errors as already checked in', () => {
  assert.equal(isAlreadyCheckedInMessage('没有权限'), false)
})
