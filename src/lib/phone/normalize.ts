// ====================================================================
// CLIENTLOOP PHONE NUMBER NORMALIZATION & VALIDATION
// E.164 Standard Compliant with Tenant Country Support
// ====================================================================

export interface PhoneNormalizationResult {
  isValid: boolean
  e164: string
  countryCode: string
  nationalNumber: string
  formattedDisplay: string
  error?: string
}

const COUNTRY_DIALING_CODES: Record<string, { code: string; defaultLength: number }> = {
  '+1': { code: '+1', defaultLength: 10 },    // US / Canada
  '+234': { code: '+234', defaultLength: 10 }, // Nigeria (e.g. 0803 -> +234803)
  '+44': { code: '+44', defaultLength: 10 },  // UK
  '+27': { code: '+27', defaultLength: 9 },   // South Africa
  '+254': { code: '+254', defaultLength: 9 },  // Kenya
  '+61': { code: '+61', defaultLength: 9 },   // Australia
  '+971': { code: '+971', defaultLength: 9 }, // UAE
}

/**
 * Normalizes any phone input into strict E.164 format (+[country][digits])
 * @param input Raw phone string typed by staff (e.g. "0803 123 4567" or "(555) 019-2834")
 * @param defaultCountry Dialing prefix configured by the tenant (e.g. "+234" for Nigeria, "+1" for US)
 */
export function normalizePhoneNumber(
  input: string,
  defaultCountry = '+1'
): PhoneNormalizationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      e164: '',
      countryCode: defaultCountry,
      nationalNumber: '',
      formattedDisplay: '',
      error: 'Phone number cannot be empty'
    }
  }

  // Strip all whitespace, dashes, parentheses, dots
  let cleaned = input.trim().replace(/[\s\(\)\-\.]/g, '')

  let detectedCountry = defaultCountry
  let national = cleaned

  // If already starts with '+', extract the country code
  if (cleaned.startsWith('+')) {
    const matchedPrefix = Object.keys(COUNTRY_DIALING_CODES).find(prefix => cleaned.startsWith(prefix))
    if (matchedPrefix) {
      detectedCountry = matchedPrefix
      national = cleaned.slice(matchedPrefix.length)
    } else {
      // Fallback: extract up to 3 digits as country code
      const match = cleaned.match(/^(\+\d{1,3})(\d+)$/)
      if (match) {
        detectedCountry = match[1]
        national = match[2]
      }
    }
  } else {
    // If input starts with '00', treat as international prefix
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.slice(2)
      return normalizePhoneNumber(cleaned, defaultCountry)
    }

    // If input already starts with the country dialing digits (e.g. '234803...' for '+234' or '1555...' for '+1')
    const rawCountryDigits = detectedCountry.replace('+', '')
    if (cleaned.startsWith(rawCountryDigits) && cleaned.length >= rawCountryDigits.length + 7) {
      national = cleaned.slice(rawCountryDigits.length)
    } else if (national.startsWith('0') && national.length > 8) {
      // Strip leading local trunk prefix '0' (e.g. Nigeria 0803... -> 803...)
      national = national.slice(1)
    }
  }

  // Ensure national portion contains only digits
  national = national.replace(/\D/g, '')

  // Basic length sanity check (E.164 max length is 15 digits total)
  if (national.length < 7 || national.length > 14) {
    return {
      isValid: false,
      e164: '',
      countryCode: detectedCountry,
      nationalNumber: national,
      formattedDisplay: input,
      error: `Invalid phone length (${national.length} digits). Expected 8–14 digits.`
    }
  }

  const e164 = `${detectedCountry}${national}`

  // Format readable display
  let formattedDisplay = `${detectedCountry} ${national}`
  if (detectedCountry === '+1' && national.length === 10) {
    formattedDisplay = `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
  } else if (detectedCountry === '+234' && national.length === 10) {
    formattedDisplay = `+234 0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`
  }

  return {
    isValid: true,
    e164,
    countryCode: detectedCountry,
    nationalNumber: national,
    formattedDisplay
  }
}
