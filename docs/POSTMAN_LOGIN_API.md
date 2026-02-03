# Login API (Postman)

The auth API runs on the **backend** server, not the frontend.

- **Frontend (Next.js):** `http://localhost:3000` – no `/api` routes here
- **Backend (API):** `http://localhost:4000` (or whatever `PORT` is in your backend `.env`)

Use the backend URL for all API calls, including login.

---

## Login

**Method:** `POST`  
**URL:** `http://localhost:4000/api/auth/login`

**Headers:**

- `Content-Type`: `application/json`

**Body (raw, JSON):**

```json
{
  "email": "admin@lms.com",
  "password": "Admin@123"
}
```

Use an existing user’s email and password (e.g. from seed or registration). User must be **email-verified** and **active**.

---

## Example success response (200)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@lms.com",
      "fullName": "Admin User",
      "role": "ADMIN",
      "isEmailVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

Use `accessToken` in the `Authorization` header for protected endpoints:

- `Authorization`: `Bearer <accessToken>`

---

## If it still doesn’t work

1. **Backend running**  
   Start the backend: `cd vaastu-backend && npm run dev`  
   Confirm it listens on the port you use (e.g. 4000).

2. **Correct base URL**  
   In Postman, use `http://localhost:4000/api/auth/login` (or `http://localhost:8000/...` if your `.env` has `PORT=8000`).

3. **User exists and is verified**  
   Login requires a user that exists, has verified email, and is active. Use seed data or register + verify.

4. **CORS**  
   Backend allows `http://localhost:3000` in development. Calling the API from Postman (no browser origin) is fine.
