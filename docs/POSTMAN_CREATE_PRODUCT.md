# Create Product API – Postman

Use this to test **Create Product** manually in Postman.

---

## 1. Base URL

- **Local:** `http://localhost:4000`
- **Production (example):** `https://goldfish-app-d9t4j.ondigitalocean.app`

All paths below are relative to this base.

---

## 2. Get admin token (login)

**Request**

- **Method:** `POST`
- **URL:** `http://localhost:4000/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**

```json
{
  "email": "admin@example.com",
  "password": "your-admin-password"
}
```

**Response**

- Copy `data.accessToken` and use it in the Create Product request as **Authorization: Bearer &lt;token&gt;**.

---

## 3. Create Product – JSON only

**Request**

- **Method:** `POST`
- **URL:** `http://localhost:4000/api/products`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <paste accessToken from step 2>`
- **Body type:** raw → **JSON**

Only **name**, **slug**, and **price** are validated; the controller accepts and coerces all other fields.

---

### Minimal JSON (required only – use this to test)

Change `slug` each run to avoid duplicate errors.

```json
{
  "name": "Test Product",
  "slug": "test-product-001",
  "price": 9.99
}
```

---

### Full JSON (all optional fields)

```json
{
  "name": "Crystal Pyramid for Positive Energy",
  "slug": "crystal-pyramid-positive-energy-001",
  "description": "Enhances positive energy flow in your space. Hand-crafted crystal pyramid.",
  "shortDescription": "Crystal pyramid for home and office.",
  "price": 29.99,
  "comparePrice": 39.99,
  "stock": 100,
  "sku": "VASTU-CP-001",
  "status": "ACTIVE",
  "featured": true,
  "categoryId": null,
  "productType": "VASTU_ITEM",
  "vastuPurpose": "Enhance positive energy",
  "energyType": "POSITIVE",
  "material": "Crystal",
  "dimensions": { "length": 10, "width": 10, "height": 12 },
  "images": []
}
```

- **categoryId:** omit or `null`; if set, must be a valid UUID from your categories table.
- **slug / sku:** must be unique (e.g. change to `test-product-002` for each new product).

---

### Success response (201)

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "uuid",
    "name": "Crystal Pyramid for Positive Energy",
    "slug": "crystal-pyramid-positive-energy",
    "description": "...",
    "shortDescription": "...",
    "images": [],
    "price": "29.99",
    "comparePrice": "39.99",
    "sku": "VASTU-CP-001",
    "stock": 100,
    "status": "ACTIVE",
    "featured": true,
    "categoryId": null,
    "productType": "VASTU_ITEM",
    "vastuPurpose": "Enhance positive energy",
    "energyType": "POSITIVE",
    "material": "Crystal",
    "dimensions": { "length": 10, "width": 10, "height": 12 },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error (400 validation)**

```json
{
  "success": false,
  "message": "Product name is required",
  "errors": [...]
}
```

**Error (400 duplicate slug/SKU)**

```json
{
  "success": false,
  "message": "A product with this slug or SKU already exists."
}
```

**Error (401)**

- Missing or invalid token: add valid `Authorization: Bearer <accessToken>` (from admin login).

---

## 4. Postman checklist

1. **Login:** POST `http://localhost:4000/api/auth/login` with body `{"email":"your-admin@example.com","password":"your-password"}`. Copy `data.accessToken`.
2. **Create Product:** POST `http://localhost:4000/api/products`
   - **Authorization:** Bearer Token = pasted accessToken.
   - **Body:** raw **JSON** only (e.g. minimal: `{"name":"Test Product","slug":"test-product-001","price":9.99}`).
3. Change `slug` (and `sku` if sent) for each new product to avoid duplicate errors.
