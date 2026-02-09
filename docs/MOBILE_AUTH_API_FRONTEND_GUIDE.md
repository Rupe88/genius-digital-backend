# Mobile Auth API - Frontend Integration Guide

Quick reference guide for integrating the mobile authentication API in your frontend application.

---

## Base URL

```
POST /api/mobile/auth/login-or-register
```

**Production:** `https://your-backend-url.com/api/mobile/auth/login-or-register`  
**Development:** `http://localhost:4000/api/mobile/auth/login-or-register`

---

## Login or Register Endpoint

### Overview

Single endpoint that handles both user registration and login. If email exists, it logs them in. If email is new, it creates an account. OTP is sent via email or SMS based on the `mailIn` field.

### Request Body

```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "phone": "9812345678",
  "mailIn": "email"
}
```

### Field Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | **Yes** | Valid email address (automatically normalized to lowercase) |
| `fullName` | string | No | User's full name (max 255 characters) |
| `phone` | string | **Conditional** | Required when `mailIn` is `"phone"`. Optional when `mailIn` is `"email"` |
| `mailIn` | string | **Yes** | Must be either `"phone"` or `"email"`. Determines how OTP is sent |

### `mailIn` Field Behavior

- **`"email"`** (default): OTP is sent via email using nodemailer
- **`"phone"`**: OTP is sent via SMS using Sparrow SMS. Requires `phone` field to be provided

### Success Response

**Status Code:** `200` (existing user) or `201` (new user)

```json
{
  "success": true,
  "message": "OTP sent to your email.",
  "data": {
    "mobileAppUserId": "18fb92fc-8da6-4c53-b4b6-6ffeca6e240b",
    "email": "user@example.com",
    "phone": "9812345678",
    "sentVia": "email"
  }
}
```

**Response Fields:**
- `mobileAppUserId`: Unique identifier for the user
- `sentVia`: Indicates how OTP was sent (`"email"` or `"sms"`)
- `message`: Success message (may vary if SMS fails and falls back to email)

### Error Responses

#### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "message": "Phone number is required when mailIn is \"phone\"",
  "errors": [
    {
      "type": "field",
      "msg": "Phone number is required when mailIn is \"phone\"",
      "path": "phone",
      "location": "body"
    }
  ]
}
```

**Common Validation Errors:**
- `"Valid email required"` - Invalid email format
- `"mailIn must be either \"phone\" or \"email\""` - Invalid `mailIn` value
- `"Phone number is required when mailIn is \"phone\""` - Missing phone when SMS is selected

#### 400 Bad Request - Missing Phone for SMS

```json
{
  "success": false,
  "message": "Phone number is required for SMS OTP"
}
```

This occurs when `mailIn` is `"phone"` but the user doesn't have a phone number saved and none was provided.

#### 429 Too Many Requests - Rate Limit

```json
{
  "success": false,
  "message": "Maximum OTP requests reached. Please try again later."
}
```

Maximum 3 OTP requests per hour per user.

---

## Verify OTP Endpoint

### Request

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Success Response

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "id": "18fb92fc-8da6-4c53-b4b6-6ffeca6e240b",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phone": "9812345678",
      "isEmailVerified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Important:** Store the `token` securely. Use it in the `Authorization` header for protected endpoints:
```
Authorization: Bearer {token}
```

---

## Frontend Implementation Example

### React/TypeScript Example

```typescript
interface LoginRegisterRequest {
  email: string;
  fullName?: string;
  phone?: string;
  mailIn: 'phone' | 'email';
}

interface LoginRegisterResponse {
  success: boolean;
  message: string;
  data: {
    mobileAppUserId: string;
    email: string;
    phone?: string;
    sentVia: 'email' | 'sms';
  };
}

async function loginOrRegister(data: LoginRegisterRequest): Promise<LoginRegisterResponse> {
  const response = await fetch('/api/mobile/auth/login-or-register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send OTP');
  }

  return response.json();
}

// Usage
try {
  const result = await loginOrRegister({
    email: 'user@example.com',
    fullName: 'John Doe',
    phone: '9812345678',
    mailIn: 'phone', // or 'email'
  });
  
  console.log(`OTP sent via ${result.data.sentVia}`);
  // Show OTP input screen
} catch (error) {
  console.error('Error:', error.message);
  // Show error to user
}
```

### JavaScript Example

```javascript
async function sendOTP(email, fullName, phone, mailIn = 'email') {
  try {
    const response = await fetch('/api/mobile/auth/login-or-register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        fullName,
        phone,
        mailIn, // 'phone' or 'email'
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send OTP');
    }

    return data;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
}

// Usage
sendOTP('user@example.com', 'John Doe', '9812345678', 'phone')
  .then((result) => {
    console.log('OTP sent via:', result.data.sentVia);
    // Navigate to OTP verification screen
  })
  .catch((error) => {
    alert(error.message);
  });
```

---

## Important Notes

1. **Phone Format**: Phone numbers are automatically normalized. Accepts formats like:
   - `9812345678` (10 digits)
   - `+9779812345678` (international format)
   - `9779812345678` (without +)

2. **SMS Fallback**: If SMS fails (e.g., invalid phone, SMS service down), the system automatically falls back to email. Check `sentVia` in the response to know which method was used.

3. **Rate Limiting**: Maximum 3 OTP requests per hour per user. Show appropriate error message if rate limit is hit.

4. **Token Storage**: After OTP verification, store the token securely (e.g., AsyncStorage in React Native, localStorage in web). Token doesn't expire, but can be invalidated server-side.

5. **Error Handling**: Always check the `success` field and handle errors appropriately. Show user-friendly error messages based on the `message` field.

---

## Complete Flow Example

```javascript
// Step 1: Send OTP
const otpResponse = await sendOTP('user@example.com', 'John Doe', '9812345678', 'phone');

// Step 2: User enters OTP
const userOTP = '123456'; // From user input

// Step 3: Verify OTP
const verifyResponse = await fetch('/api/mobile/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    otp: userOTP,
  }),
});

const verifyData = await verifyResponse.json();

if (verifyData.success) {
  // Step 4: Store token
  localStorage.setItem('authToken', verifyData.data.token);
  
  // Step 5: Use token for protected endpoints
  const userData = await fetch('/api/mobile/auth/me', {
    headers: {
      'Authorization': `Bearer ${verifyData.data.token}`,
    },
  });
}
```

---

## Quick Reference

| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `/login-or-register` | POST | No | Send OTP (email or SMS) |
| `/verify-otp` | POST | No | Verify OTP and get token |
| `/send-otp` | POST | No | Resend OTP |
| `/me` | GET | Yes | Get current user info |

**Protected endpoints require:** `Authorization: Bearer {token}` header
