# Frontend Integration Guide - Referral System

Complete integration guide for the Vaastu LMS referral system with your frontend application.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install express-useragent cookie-parser
```

### 2. Include the API Integration

```javascript
import { ReferralAPI, SocialSharing } from './path/to/referral-api.js';

// Initialize API
const referralAPI = new ReferralAPI();
referralAPI.setAuthToken('your-jwt-token');
```

### 3. Basic Usage

```javascript
// Generate sharing links
const result = await referralAPI.generateSharingLinks('course-id');
if (result.success) {
  console.log('Sharing URLs:', result.data);
}

// Share on social media
SocialSharing.shareOnPlatform(result.data.shareUrl, 'facebook');
```

## 📱 React Integration

### Setup Provider

```jsx
import { ReferralProvider } from './ReferralProvider.jsx';

function App() {
  return (
    <ReferralProvider authToken={user?.token}>
      {/* Your app components */}
    </ReferralProvider>
  );
}
```

### Use Share Button

```jsx
import { ShareButton } from './components/ShareButton.jsx';

function CourseCard({ course }) {
  return (
    <div>
      <h3>{course.title}</h3>
      <ShareButton
        courseId={course.id}
        course={course}
        variant="primary"
        size="medium"
      >
        Share & Earn 10%
      </ShareButton>
    </div>
  );
}
```

### User Dashboard

```jsx
import { ReferralDashboard } from './components/ReferralDashboard.jsx';

function UserDashboard() {
  return (
    <div>
      <ReferralDashboard />
    </div>
  );
}
```

### Admin Dashboard

```jsx
import { AdminReferralDashboard } from './components/AdminReferralDashboard.jsx';

function AdminPanel() {
  return (
    <div>
      <AdminReferralDashboard />
    </div>
  );
}
```

## 🔧 Vue.js Integration

### Setup Plugin

```javascript
// plugins/referral.js
import { ReferralAPI } from '@/api/referral-api.js';

export default {
  install(app) {
    const referralAPI = new ReferralAPI();

    app.config.globalProperties.$referral = referralAPI;
    app.provide('referral', referralAPI);
  }
}
```

### Use in Components

```vue
<template>
  <div>
    <button @click="shareCourse" :disabled="loading">
      {{ loading ? 'Generating...' : 'Share Course' }}
    </button>

    <div v-if="sharingData">
      <input :value="sharingData.shareUrl" readonly />
      <button @click="copyLink">Copy Link</button>
      <button @click="shareOnFacebook">Share on Facebook</button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue';
import { SocialSharing } from '@/api/referral-api.js';

const referralAPI = inject('referral');
const loading = ref(false);
const sharingData = ref(null);

const shareCourse = async () => {
  loading.value = true;
  try {
    const result = await referralAPI.generateSharingLinks('course-id');
    if (result.success) {
      sharingData.value = result.data;
    }
  } finally {
    loading.value = false;
  }
};

const copyLink = () => {
  SocialSharing.copyToClipboard(sharingData.value.shareUrl);
};

const shareOnFacebook = () => {
  SocialSharing.shareOnPlatform(sharingData.value.shareUrl, 'facebook');
};
</script>
```

## ⚛️ Angular Integration

### Create Service

```typescript
// services/referral.service.ts
import { Injectable } from '@angular/core';
import { ReferralAPI } from '../api/referral-api.js';

@Injectable({
  providedIn: 'root'
})
export class ReferralService {
  private api = new ReferralAPI();

  setAuthToken(token: string) {
    this.api.setAuthToken(token);
  }

  generateSharingLinks(courseId: string) {
    return this.api.generateSharingLinks(courseId);
  }

  getReferralStats() {
    return this.api.getReferralStats();
  }

  // ... other methods
}
```

### Use in Components

```typescript
// components/share-button.component.ts
import { Component, Input } from '@angular/core';
import { ReferralService } from '../services/referral.service';
import { SocialSharing } from '../api/referral-api.js';

@Component({
  selector: 'app-share-button',
  template: `
    <button
      (click)="shareCourse()"
      [disabled]="loading"
      class="share-btn">
      {{ loading ? 'Generating...' : 'Share & Earn' }}
    </button>

    <div *ngIf="sharingData" class="share-modal">
      <input [value]="sharingData.shareUrl" readonly />
      <button (click)="copyLink()">Copy</button>
      <button (click)="shareOnPlatform('facebook')">Facebook</button>
    </div>
  `
})
export class ShareButtonComponent {
  @Input() courseId!: string;
  @Input() course: any;

  loading = false;
  sharingData: any = null;

  constructor(private referralService: ReferralService) {}

  async shareCourse() {
    this.loading = true;
    try {
      const result = await this.referralService.generateSharingLinks(this.courseId);
      if (result.success) {
        this.sharingData = result.data;
      }
    } finally {
      this.loading = false;
    }
  }

  copyLink() {
    SocialSharing.copyToClipboard(this.sharingData.shareUrl);
  }

  shareOnPlatform(platform: string) {
    SocialSharing.shareOnPlatform(this.sharingData.shareUrl, platform);
  }
}
```

## 🌐 Vanilla JavaScript Integration

### Basic Setup

```html
<!DOCTYPE html>
<html>
<head>
  <title>Referral System</title>
</head>
<body>
  <button id="shareBtn">Share Course</button>
  <div id="shareModal" style="display: none;">
    <input id="shareUrl" readonly />
    <button id="copyBtn">Copy</button>
    <button id="facebookBtn">Facebook</button>
  </div>

  <script type="module">
    import { ReferralAPI, SocialSharing } from './referral-api.js';

    const api = new ReferralAPI();
    api.setAuthToken(localStorage.getItem('authToken'));

    const shareBtn = document.getElementById('shareBtn');
    const shareModal = document.getElementById('shareModal');
    const shareUrl = document.getElementById('shareUrl');
    const copyBtn = document.getElementById('copyBtn');
    const facebookBtn = document.getElementById('facebookBtn');

    let sharingData = null;

    shareBtn.addEventListener('click', async () => {
      shareBtn.disabled = true;
      shareBtn.textContent = 'Generating...';

      try {
        const result = await api.generateSharingLinks('your-course-id');
        if (result.success) {
          sharingData = result.data;
          shareUrl.value = result.data.shareUrl;
          shareModal.style.display = 'block';
        }
      } finally {
        shareBtn.disabled = false;
        shareBtn.textContent = 'Share Course';
      }
    });

    copyBtn.addEventListener('click', () => {
      SocialSharing.copyToClipboard(sharingData.shareUrl);
    });

    facebookBtn.addEventListener('click', () => {
      SocialSharing.shareOnPlatform(sharingData.shareUrl, 'facebook');
    });
  </script>
</body>
</html>
```

## 🔗 API Endpoints Reference

### User Endpoints
```javascript
// Generate sharing links
GET /api/referrals/share/:courseId

// Get referral stats
GET /api/referrals/stats

// Get referral links
GET /api/referrals/links?page=1&limit=10

// Deactivate link
PATCH /api/referrals/links/:linkId/deactivate

// Reactivate link
PATCH /api/referrals/links/:linkId/reactivate
```

### Public Endpoints
```javascript
// Handle referral clicks (redirects)
GET /api/referrals/click/:referralCode
```

### Admin Endpoints
```javascript
// Get analytics
GET /api/referrals/admin/analytics

// Get conversions
GET /api/referrals/admin/conversions

// Mark commissions as paid
POST /api/referrals/admin/commissions/mark-paid
```

## 🎨 Styling Examples

### CSS Classes for Share Button

```css
.share-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.share-btn:hover {
  background: #2563eb;
}

.share-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.share-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}
```

## 🔐 Authentication Setup

### JWT Token Management

```javascript
// Set token on login
referralAPI.setAuthToken(userToken);

// Clear token on logout
referralAPI.setAuthToken(null);
```

### Automatic Token Refresh

```javascript
// If using refresh tokens
const refreshTokenIfNeeded = async () => {
  const newToken = await refreshAuthToken();
  referralAPI.setAuthToken(newToken);
};
```

## 🚨 Error Handling

### Global Error Handler

```javascript
const handleApiError = (error) => {
  switch (error.code) {
    case 'NETWORK_ERROR':
      showToast('Network error. Please check your connection.');
      break;
    case 'AUTH_ERROR':
      redirectToLogin();
      break;
    case 'VALIDATION_ERROR':
      showFormErrors(error.details);
      break;
    default:
      showToast('Something went wrong. Please try again.');
  }
};

// Use with API calls
try {
  const result = await api.generateSharingLinks(courseId);
  if (!result.success) {
    handleApiError(result.error);
  }
} catch (error) {
  handleApiError(error);
}
```

## 📊 Analytics Integration

### Track Sharing Events

```javascript
// Google Analytics example
const trackShareEvent = (platform, courseId) => {
  gtag('event', 'share', {
    method: platform,
    content_type: 'course',
    content_id: courseId
  });
};

// Facebook Pixel example
const trackFacebookShare = (courseId) => {
  fbq('track', 'Share', {
    content_type: 'course',
    content_id: courseId
  });
};
```

## 🔄 Real-time Updates

### WebSocket Integration (Optional)

```javascript
// Connect to WebSocket for real-time updates
const ws = new WebSocket('wss://your-backend.com/referrals');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'conversion_update') {
    // Update UI with new conversion
    updateReferralStats(data.stats);
  }
};
```

## 📱 Mobile App Integration

### React Native Example

```javascript
import { ReferralAPI, SocialSharing } from './referral-api.js';

const shareCourse = async (courseId) => {
  const api = new ReferralAPI();
  api.setAuthToken(token);

  const result = await api.generateSharingLinks(courseId);
  if (result.success) {
    // Use React Native Share API
    await Share.share({
      message: `Check out this course: ${result.data.shareUrl}`,
      url: result.data.shareUrl,
    });
  }
};
```

## 🧪 Testing Integration

### Unit Tests

```javascript
import { ReferralAPI } from './referral-api.js';

describe('ReferralAPI', () => {
  let api;

  beforeEach(() => {
    api = new ReferralAPI();
    api.setAuthToken('test-token');
  });

  test('generateSharingLinks returns sharing data', async () => {
    const result = await api.generateSharingLinks('course-123');
    expect(result.success).toBe(true);
    expect(result.data.shareUrl).toBeDefined();
  });
});
```

## 🚀 Production Deployment Checklist

- [ ] Update production backend with referral routes
- [ ] Run database migration: `prisma migrate deploy`
- [ ] Install dependencies: `express-useragent`, `cookie-parser`
- [ ] Test all endpoints with production URL
- [ ] Update CORS settings if needed
- [ ] Configure environment variables
- [ ] Set up monitoring for referral analytics
- [ ] Test social sharing on different platforms

## 📞 Support

For integration issues:

1. Check browser console for errors
2. Verify JWT token is valid
3. Test API endpoints directly with curl/Postman
4. Check network connectivity to backend
5. Review CORS configuration

---

**🎉 Your referral system is now fully integrated! Users can share courses and earn commissions seamlessly.**
