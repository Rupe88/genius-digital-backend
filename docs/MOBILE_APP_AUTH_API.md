# Mobile App (Numerology) Auth API

Separate auth for the **Numerology mobile app**. Uses its own table (`mobile_app_users`) and OTP table (`mobile_app_otps`). Base path: **`/api/mobile/auth`** (or `/mobile/auth` if proxy strips `/api`).

---

## Base URL

- **Local:** `http://localhost:4000/api/mobile/auth`
- **Production:** `https://goldfish-app-d9t4j.ondigitalocean.app/api/mobile/auth`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|--------------|
| POST | `/register` | No | Register; sends OTP to email |
| POST | `/send-otp` | No | Resend OTP to email |
| POST | `/verify-otp` | No | Verify OTP; returns tokens |
| POST | `/login` | No | Login (email + password); returns tokens |
| POST | `/refresh-token` | No | New access + refresh token |
| GET | `/me` | Bearer | Current user |
| POST | `/logout` | Bearer | Logout (invalidate refresh token) |

---

## 1. Register

**POST** `/api/mobile/auth/register`

**Body (JSON):**

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| email | string | Yes | Valid email |
| password | string | Yes | Min 8 chars; 1 upper, 1 lower, 1 number |
| fullName | string | No | Max 255 |
| phone | string | No | Max 50 |

**Example:**

```json
{
  "email": "user@example.com",
  "password": "TestPass123",
  "fullName": "John Doe",
  "phone": "9812345678"
}
```

**Responses:**

- **201:** User created; OTP sent to email.  
  `{ "success": true, "message": "...", "data": { "mobileAppUserId", "email", "phone?" } }`
- **200:** Email already exists but not verified; OTP resent.
- **409:** Email already registered and verified.
- **400:** Validation error (see `errors` array).

---

## 2. Send OTP (resend)

**POST** `/api/mobile/auth/send-otp`

**Body (JSON):**

```json
{ "email": "user@example.com" }
```

**Responses:**

- **200:** OTP sent.  
  `{ "success": true, "message": "OTP sent to your email.", "data": { "email" } }`
- **404:** User not found.
- **400:** Email already verified.
- **429:** Too many OTP requests (max 3 per hour).

---

## 3. Verify OTP

**POST** `/api/mobile/auth/verify-otp`

**Body (JSON):**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Responses:**

- **200:** Verified; returns user + tokens.  
  `{ "success": true, "message": "Email verified successfully", "data": { "user": { "id", "email", "fullName", "phone", "isEmailVerified" }, "accessToken", "refreshToken" } }`
- **400:** Invalid or expired OTP / already verified.
- **404:** User not found.

---

## 4. Login

**POST** `/api/mobile/auth/login`

**Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "TestPass123"
}
```

**Responses:**

- **200:** Success.  
  `{ "success": true, "message": "Login successful", "data": { "user": { ... }, "accessToken", "refreshToken" } }`
- **401:** Invalid email or password.
- **403:** Email not verified (use send-otp + verify-otp first).

---

## 5. Refresh token

**POST** `/api/mobile/auth/refresh-token`

**Body (JSON):**

```json
{ "refreshToken": "eyJhbGc..." }
```

**Response:**  
`{ "success": true, "data": { "accessToken", "refreshToken" } }`

---

## 6. Me (protected)

**GET** `/api/mobile/auth/me`  
**Header:** `Authorization: Bearer <accessToken>`

**Response:**  
`{ "success": true, "data": { "user": { "id", "email", "fullName", "phone", "isEmailVerified" } } }`

---

## 7. Logout (protected)

**POST** `/api/mobile/auth/logout`  
**Header:** `Authorization: Bearer <accessToken>`

**Response:**  
`{ "success": true, "message": "Logout successful" }`

---

## Flow (mobile app)

1. **Register** → user created, OTP sent to email.
2. **Verify OTP** → get `accessToken` and `refreshToken`; store in app.
3. Use **Bearer `accessToken`** for `/me` and `/logout`.
4. When access token expires, call **Refresh token** with `refreshToken` to get new tokens.
5. **Login** (email + password) for returning users (after they have verified email once).

All tokens are for **mobile app users only** (separate from main LMS `User` and LMS auth).
