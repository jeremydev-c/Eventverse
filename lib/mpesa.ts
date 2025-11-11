import axios, { AxiosRequestConfig } from 'axios'

const MPESA_BASE_URL =
  process.env.MPESA_ENVIRONMENT === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE
const MPESA_PASSKEY = process.env.MPESA_PASSKEY
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL

function assertEnvVar(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required M-Pesa environment variable: ${name}`)
  }
  return value
}

function buildPassword(timestamp: string) {
  const shortCode = assertEnvVar(MPESA_SHORTCODE, 'MPESA_SHORTCODE')
  const passKey = assertEnvVar(MPESA_PASSKEY, 'MPESA_PASSKEY')
  const dataToEncode = `${shortCode}${passKey}${timestamp}`
  return Buffer.from(dataToEncode).toString('base64')
}

async function getAccessToken(): Promise<string> {
  const consumerKey = assertEnvVar(MPESA_CONSUMER_KEY, 'MPESA_CONSUMER_KEY')
  const consumerSecret = assertEnvVar(
    MPESA_CONSUMER_SECRET,
    'MPESA_CONSUMER_SECRET'
  )

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    'base64'
  )

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    headers: {
      Authorization: `Basic ${credentials}`,
    },
    timeout: 15000,
  }

  const response = await axios.request<{ access_token: string }>(config)

  if (!response.data?.access_token) {
    throw new Error('Failed to obtain M-Pesa access token')
  }

  return response.data.access_token
}

type InitiateSTKPushParams = {
  amount: number
  phoneNumber: string
  accountReference: string
  transactionDesc?: string
  callbackUrl?: string
}

export async function initiateSTKPush({
  amount,
  phoneNumber,
  accountReference,
  transactionDesc = 'Event Ticket Purchase',
  callbackUrl,
}: InitiateSTKPushParams) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number')
  }

  const parsedAmount = Math.ceil(amount)
  const msisdn = phoneNumber.replace(/\D/g, '')
  if (!/^254\d{9}$/.test(msisdn)) {
    throw new Error('Phone number must be in format 2547XXXXXXXX')
  }

  const accessToken = await getAccessToken()
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14)

  const payload = {
    BusinessShortCode: assertEnvVar(MPESA_SHORTCODE, 'MPESA_SHORTCODE'),
    Password: buildPassword(timestamp),
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: parsedAmount,
    PartyA: msisdn,
    PartyB: assertEnvVar(MPESA_SHORTCODE, 'MPESA_SHORTCODE'),
    PhoneNumber: msisdn,
    CallBackURL: callbackUrl ?? assertEnvVar(MPESA_CALLBACK_URL, 'MPESA_CALLBACK_URL'),
    AccountReference: accountReference.substring(0, 12),
    TransactionDesc: transactionDesc.substring(0, 20) || 'Event Ticket',
  }

  const response = await axios.post(
    `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  )

  return response.data
}

type QuerySTKStatusParams = {
  checkoutRequestId: string
}

export async function querySTKPushStatus({
  checkoutRequestId,
}: QuerySTKStatusParams) {
  if (!checkoutRequestId) {
    throw new Error('checkoutRequestId is required')
  }

  const accessToken = await getAccessToken()
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14)

  const payload = {
    BusinessShortCode: assertEnvVar(MPESA_SHORTCODE, 'MPESA_SHORTCODE'),
    Password: buildPassword(timestamp),
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  }

  const response = await axios.post(
    `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  )

  return response.data
}

export type MpesaCallbackResult = {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: number
  ResultDesc: string
  CallbackMetadata?: {
    Item: Array<{
      Name: string
      Value?: string | number
    }>
  }
}

export function extractMpesaCallbackData(callback: MpesaCallbackResult) {
  const metadata = callback.CallbackMetadata?.Item ?? []
  const getValue = (name: string) =>
    metadata.find((item) => item.Name === name)?.Value

  return {
    amount: Number(getValue('Amount') ?? 0),
    mpesaReceiptNumber: String(getValue('MpesaReceiptNumber') ?? ''),
    transactionDate: String(getValue('TransactionDate') ?? ''),
    phoneNumber: String(getValue('PhoneNumber') ?? ''),
  }
}

export { getAccessToken }

