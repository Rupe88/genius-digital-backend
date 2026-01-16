# 🚀 COMPLETE VAASU LMS API ENDPOINTS LIST

## 📊 **TOTAL ENDPOINTS: 80+ APIs**

### **Base URL:** `https://goldfish-app-d9t4j.ondigitalocean.app`

---

## 🔐 **1. AUTHENTICATION APIs**

### **Public Routes (No Auth Required):**
```bash
# User Registration
POST /api/auth/register
Body: { "email": "user@example.com", "password": "password123", "fullName": "John Doe", "phone": "+977-1234567890" }

# OTP Verification
POST /api/auth/verify-otp
Body: { "email": "user@example.com", "otp": "123456" }

# Resend OTP
POST /api/auth/resend-otp
Body: { "email": "user@example.com" }

# User Login
POST /api/auth/login
Body: { "email": "user@example.com", "password": "password123" }

# Refresh Token
POST /api/auth/refresh-token
Body: { "refreshToken": "your_refresh_token" }

# Forgot Password
POST /api/auth/forgot-password
Body: { "email": "user@example.com" }

# Reset Password
POST /api/auth/reset-password
Body: { "token": "reset_token", "newPassword": "newpassword123" }
```

### **Protected Routes (Auth Required):**
```bash
# Logout
POST /api/auth/logout
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Get Current User
GET /api/auth/me
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Get User Profile
GET /api/auth/profile
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Update Payment Preference
PUT /api/auth/profile/payment-preference
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "preferredPaymentMethod": "ESEWA" }
```

---

## 📚 **2. COURSE MANAGEMENT APIs**

### **Public Routes:**
```bash
# Get All Courses
GET /api/courses?page=1&limit=10

# Filter Courses
GET /api/courses/filter?category=vastu&level=beginner&price_min=50&price_max=200

# Get Ongoing Courses
GET /api/courses/ongoing

# Get Course by ID
GET /api/courses/:courseId
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Create Course (with thumbnail upload)
POST /api/courses
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
FormData: { "title": "Course Name", "description": "...", "price": 99.99, "thumbnail": [FILE] }

# Update Course (with thumbnail upload)
PUT /api/courses/:courseId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
FormData: { "title": "Updated Name", "price": 149.99, "thumbnail": [FILE] }

# Delete Course
DELETE /api/courses/:courseId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## 📖 **3. CHAPTER/MODULE MANAGEMENT APIs**

### **Public Routes:**
```bash
# Get Course Chapters
GET /api/chapters/course/:courseId

# Get Chapter by ID
GET /api/chapters/:chapterId
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Create Chapter
POST /api/chapters
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "courseId": "course-uuid",
  "title": "Introduction to Vastu",
  "description": "Basic concepts",
  "order": 1,
  "isLocked": false,
  "isPreview": true
}

# Update Chapter
PUT /api/chapters/:chapterId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "title": "Updated Title", "order": 2 }

# Delete Chapter
DELETE /api/chapters/:chapterId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Reorder Chapters
POST /api/chapters/reorder
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "courseId": "course-uuid",
  "chapterOrders": [
    {"id": "chapter-1", "order": 1},
    {"id": "chapter-2", "order": 2}
  ]
}

# Toggle Chapter Lock
POST /api/chapters/:chapterId/toggle-lock
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Toggle Chapter Preview
POST /api/chapters/:chapterId/toggle-preview
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## 🎥 **4. LESSON MANAGEMENT APIs**

### **Public Routes:**
```bash
# Get Course Lessons
GET /api/lessons/course/:courseId

# Get Lesson by ID
GET /api/lessons/:lessonId
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Create Lesson (with video upload)
POST /api/lessons
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
FormData: {
  "courseId": "course-uuid",
  "chapterId": "chapter-uuid",
  "title": "Lesson Title",
  "lessonType": "VIDEO",
  "video": [VIDEO_FILE],
  "videoDuration": 1800,
  "isPreview": true,
  "order": 1
}

# Update Lesson
PUT /api/lessons/:lessonId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
FormData: { "title": "Updated Title", "video": [NEW_VIDEO_FILE] }

# Delete Lesson
DELETE /api/lessons/:lessonId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## 🎓 **5. ENROLLMENT APIs**

### **User Routes (Auth Required):**
```bash
# Enroll in Course
POST /api/enrollments
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "courseId": "course-uuid", "affiliateCode": "optional-code" }

# Get My Enrollments
GET /api/enrollments/my-enrollments?page=1&limit=10&status=ACTIVE
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Get Enrollment Details
GET /api/enrollments/:enrollmentId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Unenroll from Course
DELETE /api/enrollments/course/:courseId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Get All Enrollments
GET /api/enrollments?page=1&limit=10&status=ACTIVE&courseId=course-uuid&userId=user-uuid
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## 📊 **6. PROGRESS TRACKING APIs**

### **User Routes (Auth Required):**
```bash
# Mark Lesson Complete
POST /api/progress/complete
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "lessonId": "lesson-uuid", "watchTime": 300 }

# Get Enrollment Progress
GET /api/enrollments/:enrollmentId/progress
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Get User Progress
GET /api/progress/user
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## 📝 **7. QUIZ & ASSESSMENT APIs**

### **User Routes (Auth Required):**
```bash
# Get Quiz by Lesson
GET /api/quizzes/lesson/:lessonId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Submit Quiz Answers
POST /api/quizzes/:quizId/submit
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "answers": {
    "question1": "option_a",
    "question2": "option_b"
  }
}

# Get Quiz Attempts
GET /api/quizzes/:quizId/attempts
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Create Quiz
POST /api/quizzes
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "lessonId": "lesson-uuid",
  "title": "Quiz Title",
  "passingScore": 70,
  "timeLimit": 1800,
  "questions": [
    {
      "question": "What is Vastu?",
      "questionType": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "points": 10
    }
  ]
}

# Update Quiz
PUT /api/quizzes/:quizId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "title": "Updated Quiz", "passingScore": 80 }

# Delete Quiz
DELETE /api/quizzes/:quizId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## 📋 **8. ASSIGNMENT APIs**

### **User Routes (Auth Required):**
```bash
# Submit Assignment
POST /api/assignments/submit
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
FormData: {
  "assignmentId": "assignment-uuid",
  "content": "My assignment content",
  "file": [FILE] // Optional attachment
}
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Create Assignment
POST /api/assignments
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "courseId": "course-uuid",
  "title": "Assignment Title",
  "description": "Assignment description",
  "dueDate": "2024-02-15T23:59:59.000Z",
  "maxScore": 100
}

# Get Course Assignments
GET /api/assignments/course/:courseId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Update Assignment
PUT /api/assignments/:assignmentId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "title": "Updated Title", "dueDate": "2024-02-20T23:59:59.000Z" }

# Delete Assignment
DELETE /api/assignments/:assignmentId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Grade Submission
POST /api/assignments/:submissionId/grade
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "score": 85, "feedback": "Good work!" }
```

---

## 💳 **9. PAYMENT APIs**

### **Public Routes:**
```bash
# Get Available Payment Gateways
GET /api/payments/gateways

# eSewa Webhook (No Auth - Signature Verified)
POST /api/payments/webhook/esewa
```

### **User Routes (Auth Required):**
```bash
# Initiate Course Payment (eSewa)
POST /api/payments/initiate
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "amount": 99.99,
  "paymentMethod": "ESEWA",
  "courseId": "course-uuid",
  "successUrl": "https://yourapp.com/payment/success",
  "failureUrl": "https://yourapp.com/payment/failure"
}

# Verify Payment Status
POST /api/payments/verify
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "paymentId": "payment-uuid" }

# Get Payment History
GET /api/payments/history?page=1&limit=10
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Retry Failed Payment
POST /api/payments/retry
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "paymentId": "payment-uuid" }
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Get All Payments
GET /api/payments/admin?page=1&limit=10&status=COMPLETED
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Refund Payment
POST /api/payments/refund
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "paymentId": "payment-uuid", "amount": 50.00, "reason": "Customer request" }

# Payment Analytics
GET /api/payments/analytics
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Payment Trends
GET /api/payments/analytics/trends?days=30
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## 🛒 **10. E-COMMERCE APIs**

### **Public Routes:**
```bash
# Get All Products
GET /api/products?page=1&limit=10

# Get Product by ID
GET /api/products/:productId

# Get Product Reviews
GET /api/products/:productId/reviews
```

### **User Routes (Auth Required):**
```bash
# Add to Cart
POST /api/cart/add
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "productId": "product-uuid", "quantity": 1 }

# Get Cart Items
GET /api/cart
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Update Cart Item
PUT /api/cart/:cartItemId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "quantity": 2 }

# Remove from Cart
DELETE /api/cart/:cartItemId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Clear Cart
DELETE /api/cart
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Create Order
POST /api/orders
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "paymentMethod": "ESEWA",
  "shippingAddress": { "street": "123 Main St", "city": "Kathmandu" },
  "billingAddress": { "street": "123 Main St", "city": "Kathmandu" }
}

# Get Order History
GET /api/orders?page=1&limit=10
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Get Order Details
GET /api/orders/:orderId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Create Product
POST /api/products
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
FormData: { "name": "Vastu Yantra", "price": 25.99, "images": [FILE] }

# Update Product
PUT /api/products/:productId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
FormData: { "name": "Updated Name", "price": 29.99 }

# Delete Product
DELETE /api/products/:productId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## 🏷️ **11. COUPON APIs**

### **Public Routes:**
```bash
# Validate Coupon Code
POST /api/coupons/validate
Body: { "code": "SAVE20", "amount": 100.00 }

# Get Active Coupons
GET /api/coupons/active
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Get All Coupons
GET /api/coupons/admin?page=1&limit=10&status=ACTIVE
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Create Coupon
POST /api/coupons
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "code": "WELCOME20",
  "couponType": "PERCENTAGE",
  "discountValue": 20.00,
  "minPurchase": 50.00,
  "usageLimit": 1000,
  "validFrom": "2024-01-01T00:00:00.000Z",
  "validUntil": "2024-12-31T23:59:59.000Z"
}

# Update Coupon
PUT /api/coupons/:couponId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "discountValue": 25.00, "usageLimit": 500 }

# Delete Coupon
DELETE /api/coupons/:couponId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## ❤️ **12. WISHLIST APIs**

### **User Routes (Auth Required):**
```bash
# Get My Wishlist
GET /api/wishlist
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Add to Wishlist
POST /api/wishlist
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "courseId": "course-uuid" } // OR { "productId": "product-uuid" }

# Remove from Wishlist
DELETE /api/wishlist/:wishlistItemId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Clear Wishlist
DELETE /api/wishlist
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## 🔔 **13. NOTIFICATION APIs**

### **User Routes (Auth Required):**
```bash
# Get My Notifications
GET /api/notifications/me?page=1&limit=20&isRead=false
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Get Unread Count
GET /api/notifications/me/unread-count
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Mark as Read
POST /api/notifications/:notificationId/read
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Mark All as Read
POST /api/notifications/mark-all-read
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Delete Notification
DELETE /api/notifications/:notificationId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Send Notification to User
POST /api/notifications
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "userId": "user-uuid",
  "title": "Course Update",
  "message": "New lesson added!",
  "type": "INFO",
  "link": "/courses/course-id"
}

# Send Bulk Notifications
POST /api/notifications/bulk
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "userIds": ["user-1", "user-2"],
  "title": "System Maintenance",
  "message": "Scheduled maintenance tonight",
  "type": "WARNING"
}
```

---

## 🤝 **14. AFFILIATE APIs**

### **User Routes (Auth Required):**
```bash
# Register as Affiliate
POST /api/affiliates/register
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "bankName": "Global IME Bank",
  "accountNumber": "123456789012",
  "commissionRate": 10.00
}

# Get My Affiliate Info
GET /api/affiliates/me
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Get All Affiliates
GET /api/affiliates?page=1&limit=10&status=PENDING
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Update Affiliate Status
PUT /api/affiliates/:userId/status
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "status": "APPROVED", "commissionRate": 15.00 }

# Get Affiliate Earnings
GET /api/affiliates/earnings?page=1&limit=20
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Mark Earnings as Paid
POST /api/affiliates/earnings/mark-paid
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "earningIds": ["earning-1", "earning-2"] }
```

---

## 📝 **15. BLOG & CONTENT APIs**

### **Public Routes:**
```bash
# Get All Blogs
GET /api/blogs?page=1&limit=10

# Get Blog by Slug
GET /api/blogs/:slug

# Get Blogs by Category
GET /api/blogs/category/:categoryId
```

### **Admin Routes (Auth + Admin Required):**
```bash
# Create Blog Post
POST /api/blogs
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
FormData: {
  "title": "Vastu Tips",
  "content": "Blog content...",
  "featuredImage": [FILE],
  "categoryId": "category-uuid",
  "tags": "vastu,tips",
  "status": "PUBLISHED"
}
```

---

## 👑 **16. ADMIN DASHBOARD APIs**

### **All Admin Routes (Auth + Admin Required):**

#### **User Management:**
```bash
# Get All Users
GET /api/admin/users?page=1&limit=10
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Get User by ID
GET /api/admin/users/:userId
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Block User
POST /api/admin/users/block
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "userId": "user-uuid" }

# Unblock User
POST /api/admin/users/unblock
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "userId": "user-uuid" }
```

#### **Dashboard & Analytics:**
```bash
# Get Dashboard Stats
GET /api/admin/dashboard/stats
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

#### **Financial Management:**
```bash
# Financial Overview
GET /api/admin/finance/overview
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Income Breakdown
GET /api/admin/finance/income
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Expense Breakdown
GET /api/admin/finance/expenses
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Profit & Loss
GET /api/admin/finance/profit-loss
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# All Payments
GET /api/admin/finance/payments
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

#### **Instructor Management:**
```bash
# Get Instructor Earnings
GET /api/admin/instructors/earnings?page=1&limit=10
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Update Commission Rate
PUT /api/admin/instructors/:instructorId/commission
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "commissionRate": 35.00 }

# Mark Earnings as Paid
POST /api/admin/instructors/earnings/mark-paid
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: { "earningIds": ["earning-1", "earning-2"] }
```

#### **Expense Management:**
```bash
# Create Expense
POST /api/admin/expenses
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "title": "Office Rent",
  "amount": 50000.00,
  "category": "OFFICE_RENT",
  "instructorId": "instructor-uuid"
}

# Get All Expenses
GET /api/admin/expenses?page=1&limit=10&status=PENDING
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Approve Expense
POST /api/admin/expenses/:expenseId/approve
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Mark as Paid
POST /api/admin/expenses/:expenseId/mark-paid
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

#### **Audit & Security:**
```bash
# Get Audit Logs
GET /api/admin/audit?page=1&limit=20&entityType=USER
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## 🏆 **CERTIFICATE APIs**

### **User Routes (Auth Required):**
```bash
# Get My Certificates
GET /api/certificates/my-certificates
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }

# Download Certificate
GET /api/certificates/:certificateId/download
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

---

## ⭐ **REVIEW & RATING APIs**

### **Public Routes:**
```bash
# Get Course Reviews
GET /api/reviews?courseId=course-uuid&page=1&limit=10
```

### **User Routes (Auth Required):**
```bash
# Submit Course Review
POST /api/reviews
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body: {
  "courseId": "course-uuid",
  "rating": 5,
  "comment": "Excellent course!"
}
```

---

## 📞 **SUPPORT & CONTACT APIs**

### **Public Routes:**
```bash
# Submit Contact Form
POST /api/contact
Body: {
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Course Inquiry",
  "message": "I need help with..."
}
```

### **Newsletter:**
```bash
# Subscribe to Newsletter
POST /api/newsletter/subscribe
Body: { "email": "user@example.com", "name": "John Doe" }

# Unsubscribe
POST /api/newsletter/unsubscribe
Body: { "email": "user@example.com" }
```

---

## 🎯 **TESTING CHECKLIST FOR DEVELOPERS:**

### **Authentication Flow:**
- [ ] Register user
- [ ] Verify OTP
- [ ] Login and get tokens
- [ ] Refresh token
- [ ] Get user profile

### **Course Management:**
- [ ] Create course (admin)
- [ ] Create chapters (admin)
- [ ] Create lessons (admin)
- [ ] Enroll in course
- [ ] Mark lessons complete
- [ ] Track progress

### **Payment Integration:**
- [ ] Initiate eSewa payment
- [ ] Complete test payment
- [ ] Verify payment callback
- [ ] Check enrollment after payment

### **Admin Features:**
- [ ] Access admin dashboard
- [ ] Manage users
- [ ] View analytics
- [ ] Manage content

---

## 🚀 **QUICK START FOR DEVELOPERS:**

1. **Import Postman Collection:** `Vaastu_LMS_Postman_Collection.json`
2. **Set Environment:** Base URL = `https://goldfish-app-d9t4j.ondigitalocean.app`
3. **Test Health Check:** `GET /health`
4. **Create Test User:** Use registration endpoints
5. **Test Full Flow:** Auth → Course → Payment → Enrollment

---

## 📋 **API RESPONSE FORMAT:**

### **Success Response:**
```json
{
  "success": true,
  "data": { /* Response data */ },
  "message": "Operation successful"
}
```

### **Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ /* Validation errors */ ]
}
```

---

## 🔐 **AUTHENTICATION HEADERS:**

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Expiry:**
- Access Token: 15 minutes
- Refresh Token: 7 days

---

## 📊 **RATE LIMITS:**

- **Authenticated:** 300 requests per 15 minutes
- **Unauthenticated:** 100 requests per 15 minutes

---

## 🎉 **READY FOR DEVELOPMENT!**

**Your app developers now have:**

- ✅ **80+ API endpoints** fully documented
- ✅ **Complete Postman collection** ready to import
- ✅ **Production API** live and tested
- ✅ **Authentication flows** working
- ✅ **Payment integration** ready
- ✅ **File upload** capabilities
- ✅ **Real-time features** implemented

**Start building your mobile/web apps with confidence!** 🚀

**Questions? The API documentation is complete and ready!** 💻
