/**
 * Sparrow SMS service for sending OTP and other SMS in Nepal.
 * SMS is only sent when SPARROW_SMS_TOKEN is configured (optional).
 * Get token and sender ID from https://web.sparrowsms.com/
 */

import { config } from '../config/env.js';

const SPARROW_SMS_API_URL = 'https://api.sparrowsms.com/v2/sms/';

/**
 * Nepal mobile prefixes: 96 (Smart, Hello), 97 (Ncell, UTL), 98 (Ncell, NTC, Smart)
 * Normalize to 10 digits for Sparrow API (e.g. +9779812345678 -> 9812345678, 97XXXXXXXX -> 97XXXXXXXX)
 */
const NEPAL_MOBILE_PREFIXES = ['96', '97', '98'];

const normalizePhoneForSms = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  
  // Handle 10-digit Nepal numbers (96, 97, 98 prefixes)
  if (digits.length === 10) {
    const prefix = digits.slice(0, 2);
    if (NEPAL_MOBILE_PREFIXES.includes(prefix)) return digits;
  }
  
  // Handle international format: +977 + 10-digit local = 13 digits total
  // e.g. +9779812345678, +9779712345678, +9779612345678
  if (digits.startsWith('977') && digits.length === 13) {
    const local = digits.slice(3);
    if (NEPAL_MOBILE_PREFIXES.includes(local.slice(0, 2))) return local;
  }
  
  return null;
};

/**
 * Check if Sparrow SMS is configured (token is optional - when not set, SMS is skipped)
 */
export const isSmsConfigured = () => {
  return Boolean(config.sparrowSms?.token?.trim());
};

/**
 * Send OTP via Sparrow SMS. No-op if token is not configured.
 * @param {string} phone - Phone number (with or without +977)
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export const sendOTPSms = async (phone, otp) => {
  if (!isSmsConfigured()) {
    return { success: false, message: 'SMS not configured (token optional)' };
  }

  const to = normalizePhoneForSms(phone);
  if (!to || to.length !== 10) {
    console.warn('[SMS] Invalid or missing phone number for OTP:', phone);
    return { success: false, message: 'Invalid phone number' };
  }

  const token = config.sparrowSms.token.trim();
  // Sender ID: use SPARROW_SMS_FROM if set; otherwise try "OTP" (some accounts have this as default)
  const from = (config.sparrowSms.from?.trim() || 'OTP').substring(0, 11);
  const text = `you otp is: ${otp}. Valid for 5 minutes. - ${config.appName}`;

  try {
    const params = new URLSearchParams({ token, from, to, text });
    const response = await fetch(SPARROW_SMS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok && (data.response_code === 200 || response.status === 200)) {
      return { success: true };
    }
    console.warn('[SMS] Sparrow API error:', response.status, data);
    // If 1008 Invalid Sender, set SPARROW_SMS_FROM in .env to the sender ID Sparrow assigned to your account
    return { success: false, message: data.response || data.message || 'SMS send failed' };
  } catch (error) {
    console.error('[SMS] Sparrow request failed:', error.message);
    return { success: false, message: error.message };
  }
};
