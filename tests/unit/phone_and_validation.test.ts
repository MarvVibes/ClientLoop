import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePhoneNumber } from '../../src/lib/phone/normalize'
import { 
  recordVisitSchema, 
  questionnaireSubmissionSchema 
} from '../../src/lib/validation/schemas'
import { hasPermission } from '../../src/lib/auth/roles'

test('Phone Normalization - US local format', () => {
  const result = normalizePhoneNumber('(555) 019-2834', '+1')
  assert.equal(result.isValid, true)
  assert.equal(result.e164, '+15550192834')
  assert.equal(result.countryCode, '+1')
  assert.equal(result.nationalNumber, '5550192834')
})

test('Phone Normalization - Nigeria local format with trunk zero', () => {
  // Nigerian numbers start with 0 (e.g. 0803 123 4567), which must strip trunk zero for E.164 (+2348031234567)
  const result = normalizePhoneNumber('0803 123 4567', '+234')
  assert.equal(result.isValid, true)
  assert.equal(result.e164, '+2348031234567')
  assert.equal(result.countryCode, '+234')
  assert.equal(result.nationalNumber, '8031234567')
})

test('Phone Normalization - International format with plus already included', () => {
  const result = normalizePhoneNumber('+2348031234567')
  assert.equal(result.isValid, true)
  assert.equal(result.e164, '+2348031234567')
  assert.equal(result.countryCode, '+234')
})

test('Phone Normalization - Rejects invalid length', () => {
  const result = normalizePhoneNumber('12345', '+1')
  assert.equal(result.isValid, false)
  assert.match(result.error || '', /Invalid phone length/i)
})

test('Zod Schema - recordVisitSchema accepts valid visit data', () => {
  const input = {
    phone: '(555) 019-2834',
    countryCode: '+1',
    customerName: 'Marcus Vance',
    service: 'Deep Tissue Recovery Therapy',
    sendQuestionnaire: true,
    consentBasis: 'implicit_transaction',
  }
  const parsed = recordVisitSchema.safeParse(input)
  assert.equal(parsed.success, true)
})

test('Zod Schema - recordVisitSchema rejects invalid phone', () => {
  const input = {
    phone: '99',
    countryCode: '+1',
    service: 'Deep Tissue Recovery Therapy',
  }
  const parsed = recordVisitSchema.safeParse(input)
  assert.equal(parsed.success, false)
  if (!parsed.success) {
    assert.match(parsed.error.issues[0].message, /Invalid phone length/i)
  }
})

test('Zod Schema - questionnaireSubmissionSchema validates complete submission', () => {
  const submission = {
    tokenHash: 'a1b2c3d4e5f6789012345678',
    firstVisitAnswer: true,
    discoverySourceAnswer: 'Google Maps / Search',
    serviceAnswer: 'HydraFacial',
    rating: 5,
    feedbackText: 'Outstanding hospitality and attention to detail.',
  }
  const parsed = questionnaireSubmissionSchema.safeParse(submission)
  assert.equal(parsed.success, true)
})

test('RBAC - Checks role permissions accurately', () => {
  // Staff cannot export data or manage staff
  assert.equal(hasPermission('staff', 'canExportData'), false)
  assert.equal(hasPermission('staff', 'canManageStaff'), false)
  assert.equal(hasPermission('staff', 'canRecordVisits'), true)

  // Manager can export data and manage staff, but not workspace billing
  assert.equal(hasPermission('manager', 'canExportData'), true)
  assert.equal(hasPermission('manager', 'canManageStaff'), true)
  assert.equal(hasPermission('manager', 'canManageWorkspace'), false)

  // Owner has all permissions
  assert.equal(hasPermission('owner', 'canManageWorkspace'), true)
  assert.equal(hasPermission('owner', 'canExportData'), true)
})
