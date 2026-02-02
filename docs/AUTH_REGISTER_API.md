# Register API - Manual Testing

## Endpoint

| Item | Value |
|------|--------|
| **Method** | `POST` |
| **Path (with /api)** | `/api/auth/register` |
| **Path (no prefix)** | `/auth/register` |
| **Content-Type** | `application/json` |

### Base URLs

- **Local:** `http://localhost:4000`
- **Production:** `https://goldfish-app-d9t4j.ondigitalocean.app`

Full URLs:
- `http://localhost:4000/api/auth/register`
- `https://goldfish-app-d9t4j.ondigitalocean.app/api/auth/register`
- `https://goldfish-app-d9t4j.ondigitalocean.app/auth/register` (if proxy strips `/api`)

---

## Request

### Headers

```
Content-Type: application/json
```

### Body (JSON)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email, normalized (lowercase) |
| `password` | string | Yes | Min 8 chars, at least one uppercase, one lowercase, one number |
| `fullName` | string | Yes | 2–255 characters, trimmed |

### Example body

```json
{
  "email": "test@example.com",
  "password": "TestPass123",
  "fullName": "Test User"
}
```

---

## cURL examples

### Local

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","fullName":"Test User"}'
```

### Production

```bash
curl -X POST https://goldfish-app-d9t4j.ondigitalocean.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","fullName":"Test User"}'
```

---

## Responses

### 201 Created – New user

```json
{
  "success": true,
  "message": "Registration successful. Please check your email for OTP verification.",
  "data": {
    "userId": "uuid-here",
    "email": "test@example.com"
  }
}
```

### 200 OK – Existing unverified user (OTP resent)

```json
{
  "success": true,
  "message": "An account with this email already exists but is not verified. A new OTP has been sent to your email.",
  "data": {
    "userId": "uuid-here",
    "email": "test@example.com"
  }
}
```

### 409 Conflict – Email already registered and verified

```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

### 400 Bad Request – Validation error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Please provide a valid email address" },
    { "field": "password", "message": "Password must be at least 8 characters long" }
  ]
}
```

---

## Flow after register

1. Call **POST /api/auth/register** with `email`, `password`, `fullName`.
2. User receives OTP by email.
3. Call **POST /api/auth/verify-otp** with `email` and `otp` to verify and complete signup.
4. Call **POST /api/auth/login** with `email` and `password` to get tokens.
