/**
 * Sparrow SMS service for sending OTP and other SMS in Nepal.
 * SMS is only sent when SPARROW_SMS_TOKEN is configured (optional).
 * Get token and sender ID from https://web.sparrowsms.com/
 */

import { config } from '../config/env.js';

const SPARROW_SMS_API_URL = 'https://api.sparrowsms.com/v2/sms/';

/**
 * Normalize Nepali phone to 10 digits for Sparrow API (e.g. +9779812345678 -> 9812345678, 98XXXXXXXX -> 98XXXXXXXX)
 */
const normalizePhoneForSms = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('98')) return digits;
  if (digits.length === 12 && digits.startsWith('977')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('977')) return digits.slice(2);
  if (digits.length === 10) return digits;
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
  // Sender ID must be registered/approved in Sparrow SMS (NTA-approved, max 11 chars, alphanumeric)
  const from = config.sparrowSms.from?.trim();
  if (!from) {
    console.warn('[SMS] SPARROW_SMS_FROM not set. Please set a valid sender ID in .env (SPARROW_SMS_FROM=YourSenderID)');
    return { success: false, message: 'SMS sender ID not configured. Please contact administrator.' };
  }
  const text = `Your verification code is ${otp}. Valid for 5 minutes. - ${config.appName}`;

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
    return { success: false, message: data.response || data.message || 'SMS send failed' };
  } catch (error) {
    console.error('[SMS] Sparrow request failed:', error.message);
    return { success: false, message: error.message };
  }
};
