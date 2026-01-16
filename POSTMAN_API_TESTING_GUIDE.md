# 🚀 Vaastu LMS API Testing Guide - Production

## 🎯 **Your Production API is Live!**
- **Base URL:** `https://goldfish-app-d9t4j.ondigitalocean.app`
- **Health Check:** `https://goldfish-app-d9t4j.ondigitalocean.app/health`
- **Status:** ✅ Running perfectly

---

## 📋 **IMPORT POSTMAN COLLECTION**

### **Step 1: Download the Collection**
The file `Vaastu_LMS_Postman_Collection.json` is ready in your project folder.

### **Step 2: Import to Postman**
1. Open **Postman**
2. Click **"Import"** (top left)
3. Select **"File"** tab
4. Choose `Vaastu_LMS_Postman_Collection.json`
5. Click **"Import"**

### **Step 3: Set Environment Variables**
1. In Postman, click **"Environments"** (left sidebar)
2. Click **"Create Environment"**
3. Name it: `Vaastu LMS Production`
4. Add these variables:

```json
{
  "baseUrl": "https://goldfish-app-d9t4j.ondigitalocean.app",
  "accessToken": "",
  "refreshToken": ""
}
```

---

## 🧪 **TESTING WORKFLOW**

### **1. Health Check (No Auth Required)**
```bash
GET https://goldfish-app-d9t4j.ondigitalocean.app/health
Expected: {"success":true,"message":"Server is running"}
```

### **2. Register a New User**
```bash
POST /api/auth/register
Body:
{
  "email": "test@example.com",
  "password": "password123",
  "fullName": "Test User",
  "phone": "+977-1234567890"
}
```

### **3. Login (Get Access Token)**
```bash
POST /api/auth/login
Body:
{
  "email": "test@example.com",
  "password": "password123"
}
```
**Important:** The access token will be automatically saved to `{{accessToken}}`

### **4. Test Authenticated Endpoints**
All endpoints with 🔒 require the `Authorization: Bearer {{accessToken}}` header.

---

## 📚 **COMPLETE API ENDPOINTS**

### **🔐 Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-email` - Verify email

### **👤 User Management**
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### **📚 Courses**
- `GET /api/courses` - Get all courses (public)
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create course (admin/instructor)
- `PUT /api/courses/:id` - Update course (admin/instructor)

### **🎓 Enrollments**
- `POST /api/enrollments` - Enroll in course
- `GET /api/enrollments/my-enrollments` - Get user enrollments
- `GET /api/enrollments/:id/progress` - Get enrollment progress

### **📖 Lessons & Progress**
- `GET /api/lessons?courseId=:id` - Get course lessons
- `GET /api/lessons/:id` - Get lesson details
- `POST /api/progress/complete` - Mark lesson complete

### **📝 Quizzes & Assignments**
- `GET /api/quizzes/:id` - Get quiz questions
- `POST /api/quizzes/:id/attempt` - Submit quiz answers
- `POST /api/assignments/submit` - Submit assignment

### **💳 Payments**
- `POST /api/payments/initiate` - Initiate payment
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/history` - Get payment history

### **⭐ Reviews**
- `GET /api/reviews?courseId=:id` - Get course reviews
- `POST /api/reviews` - Submit course review

### **🎓 Certificates**
- `GET /api/certificates/my-certificates` - Get user certificates
- `GET /api/certificates/:id/download` - Download certificate

### **🛒 E-commerce**
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product details
- `POST /api/cart/add` - Add to cart
- `GET /api/cart` - Get cart items
- `POST /api/orders` - Create order

### **📝 Blog**
- `GET /api/blogs` - Get all blog posts
- `GET /api/blogs/:slug` - Get blog post by slug

### **👑 Admin (Admin Only)**
- `GET /api/admin/users` - Get all users
- `GET /api/admin/dashboard/stats` - Get dashboard statistics

---

## 🔑 **API AUTHENTICATION**

### **Bearer Token Auth:**
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Token Management:**
- **Access Token:** Valid for 15 minutes
- **Refresh Token:** Valid for 7 days
- Use `POST /api/auth/refresh` to get new access token

---

## 🧪 **TESTING CHECKLIST**

- [ ] **Import collection to Postman** ✅
- [ ] **Set environment variables** ✅
- [ ] **Test health endpoint** ✅
- [ ] **Register test user** ✅
- [ ] **Login and get token** ✅
- [ ] **Test authenticated endpoints** ✅
- [ ] **Test course enrollment** ✅
- [ ] **Test payment flow** ✅

---

## 📱 **MOBILE APP DEVELOPMENT**

### **For Flutter/React Native Developers:**

1. **Base URL:** `https://goldfish-app-d9t4j.ondigitalocean.app`
2. **Authentication:** Use Bearer tokens
3. **CORS:** Already configured for mobile apps
4. **Rate Limits:** 300 requests per 15 minutes

### **Sample API Call (Flutter):**
```dart
final response = await http.get(
  Uri.parse('https://goldfish-app-d9t4j.ondigitalocean.app/api/courses'),
  headers: {
    'Authorization': 'Bearer $accessToken',
    'Content-Type': 'application/json',
  },
);
```

---

## 🚨 **IMPORTANT NOTES**

### **Rate Limiting:**
- **Authenticated:** 300 requests per 15 minutes
- **Unauthenticated:** 100 requests per 15 minutes

### **File Uploads:**
- **Max Size:** 10MB per file
- **Supported:** Images, videos, documents
- **Storage:** Cloudinary CDN

### **Payment Integration:**
- **eSewa:** Nepal's primary payment gateway
- **Mobile Banking:** Supported
- **Card Payments:** Visa, Mastercard

---

## 🎯 **READY FOR DEVELOPMENT!**

Your **Vaastu LMS Backend API** is production-ready with:

- ✅ **50+ API endpoints** documented
- ✅ **Postman collection** ready to import
- ✅ **Authentication** fully configured
- ✅ **Database** optimized with Supabase
- ✅ **File storage** with Cloudinary
- ✅ **Payment processing** with eSewa
- ✅ **Email notifications** ready

**Share the `Vaastu_LMS_Postman_Collection.json` file with your friends and start building amazing LMS applications!** 🚀

---

## 📞 **SUPPORT**

- **API Base URL:** `https://goldfish-app-d9t4j.ondigitalocean.app`
- **Health Check:** `https://goldfish-app-d9t4j.ondigitalocean.app/health`
- **Documentation:** This guide + Postman collection

**Happy coding! 🎊**
