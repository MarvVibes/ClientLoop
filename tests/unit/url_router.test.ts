import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRoute, buildQuestionnaireUrl } from '../../src/lib/navigation/urlRouter'

test('URL Router - Extracts token from query parameter ?token=...', () => {
  const route = parseRoute('http://localhost:5173/?token=demo_paso_token_2026')
  assert.equal(route.view, 'questionnaire')
  assert.equal(route.token, 'demo_paso_token_2026')
})

test('URL Router - Extracts token from query parameter ?f=...', () => {
  const route = parseRoute('https://clientloop.app/?f=046af8949210abcd')
  assert.equal(route.view, 'questionnaire')
  assert.equal(route.token, '046af8949210abcd')
})

test('URL Router - Extracts token from pathname /f/:token', () => {
  const route = parseRoute('https://clientloop.app/f/046af8949210abcd')
  assert.equal(route.view, 'questionnaire')
  assert.equal(route.token, '046af8949210abcd')
})

test('URL Router - Extracts token from pathname /q/:token', () => {
  const route = parseRoute('http://localhost:5173/q/demo_token_123')
  assert.equal(route.view, 'questionnaire')
  assert.equal(route.token, 'demo_token_123')
})

test('URL Router - Extracts token from hash #/f/:token', () => {
  const route = parseRoute('http://localhost:5173/#/f/hash_token_abc')
  assert.equal(route.view, 'questionnaire')
  assert.equal(route.token, 'hash_token_abc')
})

test('URL Router - Recognizes portal routes (/portal and ?view=portal)', () => {
  const route1 = parseRoute('http://localhost:5173/portal')
  assert.equal(route1.view, 'staff_portal')

  const route2 = parseRoute('http://localhost:5173/?view=portal')
  assert.equal(route2.view, 'staff_portal')

  const route3 = parseRoute('http://localhost:5173/#/portal')
  assert.equal(route3.view, 'staff_portal')
})

test('URL Router - Defaults to landing view when no token or route matched', () => {
  const route = parseRoute('http://localhost:5173/')
  assert.equal(route.view, 'landing')
  assert.equal(route.token, undefined)
})

test('URL Router - Builds valid canonical questionnaire URL', () => {
  const url = buildQuestionnaireUrl('token_xyz_999', 'https://clientloop.app')
  assert.equal(url, 'https://clientloop.app/f/token_xyz_999')
})
