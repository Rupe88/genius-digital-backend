# Postman: Create Event

## Endpoint

- **Method:** `POST`
- **URL:** `http://localhost:4000/api/events` (use your backend port if different)

## Auth (required)

Create Event is **admin only**. You must send a valid admin JWT.

1. **Get token:** `POST http://localhost:4000/api/auth/login`  
   Body (raw JSON): `{ "email": "admin@lms.com", "password": "Admin@123" }`  
   Copy `data.accessToken` from the response.
2. **Use in Create Event:**  
   Headers: `Authorization: Bearer <paste_accessToken_here>`  
   Or in Postman: Auth tab → Type: Bearer Token → paste token.

## Headers (for JSON body)

- `Content-Type`: `application/json`
- `Authorization`: `Bearer <your_admin_jwt_token>`

---

## 1. Create event (JSON, no image)

**Body:** raw → JSON

```json
{
  "title": "Vaastu Workshop 2025",
  "slug": "vaastu-workshop-2025",
  "startDate": "2025-03-15T09:00:00.000Z",
  "endDate": "2025-03-15T17:00:00.000Z",
  "shortDescription": "One-day workshop on Vaastu fundamentals and home alignment.",
  "description": "Learn basic Vaastu principles, directions, and simple corrections for your home. Includes practical session.",
  "venue": "Sanskar Academy Hall",
  "location": "Kathmandu, Nepal",
  "price": 0,
  "isFree": true,
  "maxAttendees": 50,
  "featured": true
}
```

---

## 2. Minimal (required fields only)

```json
{
  "title": "Quick Test Event",
  "slug": "quick-test-event",
  "startDate": "2025-06-01T14:00:00.000Z"
}
```

---

## 3. Create event with image (form-data, upload only)

Image is upload-only (no image URL in JSON). Use form-data and attach a file:

1. **Headers:** `Authorization: Bearer <admin_access_token>` (same as JSON). Do **not** set `Content-Type`; Postman will set `multipart/form-data` with boundary.
2. **Body** → **form-data**
3. Add text fields (key / value):
   - `title`: `Event With Uploaded Image`
   - `slug`: `event-with-uploaded-image`
   - `startDate`: `2025-05-10T09:00:00.000Z`
   - `venue`: `Test Venue`
   - `isFree`: `true`
   - `featured`: `false`
4. Add file field:
   - Key: `image` (type **File**)
   - Value: choose an image file (JPEG/PNG/WebP/GIF, max 10MB)

---

## Field reference

| Field             | Type    | Required | Notes                                      |
|------------------|--------|----------|--------------------------------------------|
| title            | string | yes      | Event title                                |
| slug             | string | yes      | URL-friendly, unique                       |
| startDate        | string | yes      | ISO 8601 (e.g. `2025-03-15T09:00:00.000Z`) |
| endDate          | string | no       | ISO 8601                                   |
| description      | string | no       | Full description                           |
| shortDescription | string | no       | Max 500 chars                              |
| venue            | string | no       | Venue name                                 |
| location         | string | no       | Address or city                            |
| price            | number | no       | Default 0                                  |
| isFree           | boolean| no       | Default false                               |
| maxAttendees     | number | no       | Integer                                    |
| featured         | boolean| no       | Default false                               |

Image is **upload only**: send via form-data as file key `image`. Not accepted as a URL in JSON.

---

## Example success response (201)

```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": "uuid-here",
    "title": "Vaastu Workshop 2025",
    "slug": "vaastu-workshop-2025",
    "startDate": "2025-03-15T09:00:00.000Z",
    "endDate": "2025-03-15T17:00:00.000Z",
    "description": "...",
    "shortDescription": "...",
    "image": null,
    "venue": "Sanskar Academy Hall",
    "location": "Kathmandu, Nepal",
    "price": "0",
    "isFree": true,
    "maxAttendees": 50,
    "status": "UPCOMING",
    "featured": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

## See also

- **Login API:** `docs/POSTMAN_LOGIN_API.md` – get admin token for Create Event.
- **Cloudinary:** `docs/CLOUDINARY_SETUP.md` – required for form-data image upload.
