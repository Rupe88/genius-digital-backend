# Postman – Register API (Live DigitalOcean)

Complete test steps for **POST Register** on the live backend.

---

## 1. Request setup

| Setting | Value |
|--------|--------|
| **Method** | `POST` |
| **URL** | `https://goldfish-app-d9t4j.ondigitalocean.app/api/auth/register` |
| **Headers** | `Content-Type: application/json` |

If your deployment strips `/api`, use instead:
`https://goldfish-app-d9t4j.ondigitalocean.app/auth/register`

---

## 2. Headers

| Key | Value |
|-----|--------|
| `Content-Type` | `application/json` |

---

## 3. Body (raw JSON)

**Required:**

- `email` – valid email (e.g. `yourname@gmail.com`)
- `password` – min 8 chars, at least one **uppercase**, one **lowercase**, one **number**
- `fullName` – 2–255 characters

**Optional:**

- `phone` – e.g. `9812345678` (Nepal); if provided and Sparrow SMS is configured, OTP is also sent via SMS

**Example – minimal:**

```json
{
  "email": "postman-test@example.com",
  "password": "TestPass123",
  "fullName": "Postman Test User"
}
```

**Example – with phone:**

```json
{
  "email": "postman-test@example.com",
  "password": "TestPass123",
  "fullName": "Postman Test User",
  "phone": "9812345678"
}
```

In Postman: **Body** → **raw** → **JSON** → paste one of the above (change email for a new user).

---

## 4. Expected responses

### 201 Created – New user registered

- OTP is sent to the given email (and to phone if provided and SMS is configured).
- Use the same `email` in **Verify OTP** next.

```json
{
  "success": true,
  "message": "Registration successful. Please check your email for OTP verification.",
  "data": {
    "userId": "8cff2d61-339d-499a-b1d6-59b01d33ceaa",
    "email": "postman-test@example.com",
    "phone": "9812345678"
  }
}
```

(`phone` is only present if you sent it in the request.)

---

### 200 OK – Email already exists but not verified (OTP resent)

- Same email was used before but OTP was never completed.
- A new OTP has been sent to the email.

```json
{
  "success": true,
  "message": "An account with this email already exists but is not verified. A new OTP has been sent to your email.",
  "data": {
    "userId": "uuid-here",
    "email": "postman-test@example.com",
    "phone": "9812345678"
  }
}
```

---

### 409 Conflict – Email already registered and verified

- Account with this email is already fully registered.

```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

---

### 400 Bad Request – Validation error

Example (invalid email / weak password):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Please provide a valid email address" },
    { "field": "password", "message": "Password must contain at least one uppercase letter, one lowercase letter, and one number" }
  ]
}
```

---

## 5. Quick test flow in Postman

1. **POST** `https://goldfish-app-d9t4j.ondigitalocean.app/api/auth/register`
2. **Body** → raw → JSON → use the example body above (change `email` to a new one for 201).
3. Click **Send**.
4. Expect **201** for a new user; check your email (and phone if you sent `phone`) for the OTP.
5. To complete signup, call **Verify OTP** (see below) with the same `email` and the 6-digit OTP.

---

## 6. Verify OTP (next step after register)

After a successful register (201 or 200 with OTP resent):

| Setting | Value |
|--------|--------|
| **Method** | `POST` |
| **URL** | `https://goldfish-app-d9t4j.ondigitalocean.app/api/auth/verify-otp` |
| **Headers** | `Content-Type: application/json` |
| **Body (raw JSON)** | `{ "email": "postman-test@example.com", "otp": "123456" }` |

Replace `email` with the one you registered and `otp` with the 6-digit code from email (and SMS if sent).  
On success you get `accessToken` and `refreshToken` for further authenticated requests.

---

## 7. cURL (live DigitalOcean)

```bash
curl -X POST 'https://goldfish-app-d9t4j.ondigitalocean.app/api/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{"email":"postman-test@example.com","password":"TestPass123","fullName":"Postman Test User","phone":"9812345678"}'
```

Use this same URL and body in Postman for the live register test.
