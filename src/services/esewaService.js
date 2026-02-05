import crypto from 'crypto';
import { config } from '../config/env.js';

/**
 * eSewa Payment Service
 * Handles eSewa payment integration for Nepal
 */

const ESEWA_BASE_URL = {
  sandbox: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
  production: 'https://epay.esewa.com.np/api/epay/main/v2/form',
};

const ESEWA_VERIFY_URL = {
  sandbox: 'https://rc-epay.esewa.com.np/api/epay/transaction/status',
  production: 'https://epay.esewa.com.np/api/epay/transaction/status',
};

/**
 * Generate eSewa payment form data
 * @param {Object} params - Payment parameters
 * @param {string} params.amount - Payment amount
 * @param {string} params.transactionId - Unique transaction ID
 * @param {string} params.productServiceCharge - Service charge (default 0)
 * @param {string} params.productDeliveryCharge - Delivery charge (default 0)
 * @param {string} params.productName - Product/course name
 * @param {string} params.successUrl - Success callback URL
 * @param {string} params.failureUrl - Failure callback URL
 * @returns {Object} Form data for eSewa payment
 */
export const generateEsewaPaymentUrl = (params) => {
  const {
    amount,
    transactionId,
    productServiceCharge = '0',
    productDeliveryCharge = '0',
    productName,
    successUrl,
    failureUrl,
  } = params;

  if (!config.esewa.merchantId || !config.esewa.secretKey) {
    throw new Error('eSewa credentials not configured');
  }

  const environment = config.esewa.environment || 'sandbox';
  const baseUrl = ESEWA_BASE_URL[environment];

  // FORCE TEST CREDENTIALS IN SANDBOX
  // This prevents ES104 errors if user has wrong keys in .env for testing
  let secretKey = config.esewa.secretKey;
  let productCode = config.esewaProductCode || 'EPAYTEST';

  if (environment === 'sandbox') {
    secretKey = '8gBm/:&EnhH.1/q';
    productCode = 'EPAYTEST';
  }

  // Calculate total amount
  const totalAmount =
    parseFloat(amount) +
    parseFloat(productServiceCharge) +
    parseFloat(productDeliveryCharge);

  // Create signature data
  // Create signature data
  const signatureData = {
    total_amount: totalAmount.toFixed(2),
    transaction_uuid: transactionId,
    product_code: productCode,
  };

  // Generate signature (HMAC SHA256)
  const message = `total_amount=${signatureData.total_amount},transaction_uuid=${signatureData.transaction_uuid},product_code=${signatureData.product_code}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');

  // Return form data for POST request
  return {
    url: baseUrl,
    formData: {
      amount: totalAmount.toFixed(2),
      tax_amount: '0',
      total_amount: totalAmount.toFixed(2),
      transaction_uuid: transactionId,
      product_code: productCode,
      product_service_charge: productServiceCharge,
      product_delivery_charge: productDeliveryCharge,
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature: signature,
    },
  };
};

/**
 * Verify eSewa payment
 * @param {string} amount - Transaction amount
 * @param {string} transactionId - Transaction ID to verify
 * @param {string} productCode - Product code
 * @returns {Promise<Object>} Verification result
 */
export const verifyEsewaPayment = async (amount, transactionId, productCode = null) => {
  // Use configured product code if not provided
  if (!productCode) {
    productCode = config.esewaProductCode || 'EPAYTEST';
  }
  if (!config.esewa.merchantId || !config.esewa.secretKey) {
    // throw new Error('eSewa credentials not configured');
  }

  const environment = config.esewa.environment || 'sandbox';
  const verifyUrl = ESEWA_VERIFY_URL[environment];

  let secretKey = config.esewa.secretKey;

  // Force test credentials in sandbox
  if (environment === 'sandbox') {
    secretKey = '8gBm/:&EnhH.1/q';
    if (!productCode || productCode === 'EPAYTEST') {
      productCode = 'EPAYTEST';
    }
  }

  // Ensure amount is formatted to 2 decimal places
  const formattedAmount = parseFloat(amount).toFixed(2);

  try {
    // Create signature for verification
    const message = `total_amount=${formattedAmount},transaction_uuid=${transactionId},product_code=${productCode}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('base64');

    // Make verification request (GET for V2 Status Check)
    const queryString = new URLSearchParams({
      product_code: productCode,
      total_amount: formattedAmount,
      transaction_uuid: transactionId,
      signature: signature
    }).toString();

    const response = await fetch(`${verifyUrl}?${queryString}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.status === 'COMPLETE') {
      return {
        success: true,
        status: data.status,
        transactionId: data.transaction_uuid,
        amount: data.total_amount,
        data: data,
      };
    }

    return {
      success: false,
      status: data.status || 'FAILED',
      message: 'Payment verification failed',
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      status: 'ERROR',
      message: error.message || 'Error verifying payment',
      error: error,
    };
  }
};

/**
 * Verify eSewa callback data.
 * eSewa redirect sends signed_field_names in the callback; the signature is built from
 * those fields in that order (see developer.esewa.com.np Epay-V2).
 * @param {Object} callbackData - Callback data from eSewa (decoded from success URL ?data=)
 * @returns {boolean} True if signature is valid
 */
export const verifyEsewaCallback = (callbackData) => {
  if (!callbackData || typeof callbackData !== 'object') {
    return false;
  }

  const environment = config.esewa.environment || 'sandbox';
  let secretKey = config.esewa.secretKey;
  if (environment === 'sandbox') {
    secretKey = '8gBm/:&EnhH.1/q';
  }
  if (!secretKey) {
    return false;
  }

  const signature = callbackData.signature;
  const signedFieldNames = callbackData.signed_field_names;
  if (signature == null) {
    return false;
  }

  try {
    // Build message in the same order as signed_field_names (eSewa callback format)
    let message;
    if (signedFieldNames && typeof signedFieldNames === 'string' && signedFieldNames.trim()) {
      const fields = signedFieldNames.split(',').map((f) => f.trim()).filter(Boolean);
      const parts = fields.map((name) => {
        const value = callbackData[name];
        return `${name}=${value == null ? '' : value}`;
      });
      message = parts.join(',');
    } else {
      // Fallback: request-style (total_amount, transaction_uuid, product_code only)
      const total_amount = callbackData.total_amount;
      const transaction_uuid = callbackData.transaction_uuid;
      const product_code = callbackData.product_code || config.esewaProductCode || 'EPAYTEST';
      if (transaction_uuid == null || total_amount == null) return false;
      message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('base64');

    const sigStr = String(signature).trim();
    const expStr = String(expectedSignature).trim();
    if (sigStr.length !== expStr.length) return false;
    return crypto.timingSafeEqual(Buffer.from(sigStr, 'utf8'), Buffer.from(expStr, 'utf8'));
  } catch (error) {
    return false;
  }
};

export default {
  generateEsewaPaymentUrl,
  verifyEsewaPayment,
  verifyEsewaCallback,
};

