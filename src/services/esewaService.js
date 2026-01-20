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
 * @param {string} transactionId - Transaction ID to verify
 * @param {string} productCode - Product code
 * @returns {Promise<Object>} Verification result
 */
export const verifyEsewaPayment = async (transactionId, productCode = null) => {
  // Use configured product code if not provided
  if (!productCode) {
    productCode = config.esewaProductCode || 'EPAYTEST';
  }
  if (!config.esewa.merchantId || !config.esewa.secretKey) {
    throw new Error('eSewa credentials not configured');
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

  try {
    // Create signature for verification
    const message = `transaction_uuid=${transactionId},product_code=${productCode}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('base64');

    // Make verification request
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${secretKey}`,
      },
      body: new URLSearchParams({
        transaction_uuid: transactionId,
        product_code: productCode,
        signature: signature,
      }),
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
      message: data.message || 'Payment verification failed',
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
 * Verify eSewa callback data
 * @param {Object} callbackData - Callback data from eSewa
 * @returns {boolean} True if signature is valid
 */
export const verifyEsewaCallback = (callbackData) => {
  if (!config.esewa.secretKey) {
    return false;
  }

  try {
    const { total_amount, transaction_uuid, product_code, signature } = callbackData;

    // Recreate signature
    const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.esewa.secretKey)
      .update(message)
      .digest('base64');

    // Compare signatures (constant-time comparison for security)
    return crypto.timingSafeEqual(
      Buffer.from(signature || ''),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
};

export default {
  generateEsewaPaymentUrl,
  verifyEsewaPayment,
  verifyEsewaCallback,
};

