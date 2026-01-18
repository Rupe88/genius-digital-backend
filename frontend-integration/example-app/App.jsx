import React, { useState, useEffect } from 'react';
import { ReferralProvider, useReferral, ShareButton, ReferralDashboard, AdminReferralDashboard } from '../react/index.js';

/**
 * Complete App Example with Referral System Integration
 * This shows how to integrate the referral system into a full application
 */

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('courses');

  // Mock authentication - replace with your actual auth system
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || 'null');

    if (token && userData) {
      setUser({ ...userData, token });
    }
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('authToken', userData.token);
    localStorage.setItem('userData', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
    setCurrentView('courses');
  };

  return (
    <ReferralProvider authToken={user?.token}>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Vaastu LMS</h1>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentView('courses')}
                  className={`px-3 py-2 text-sm font-medium ${
                    currentView === 'courses'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Courses
                </button>

                {user && (
                  <>
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className={`px-3 py-2 text-sm font-medium ${
                        currentView === 'dashboard'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      My Referrals
                    </button>

                    {user.role === 'ADMIN' && (
                      <button
                        onClick={() => setCurrentView('admin')}
                        className={`px-3 py-2 text-sm font-medium ${
                          currentView === 'admin'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Admin Dashboard
                      </button>
                    )}
                  </>
                )}

                {user ? (
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Logout ({user.fullName})
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentView('login')}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-900"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {currentView === 'courses' && <CoursesView user={user} />}
            {currentView === 'dashboard' && user && <ReferralDashboard />}
            {currentView === 'admin' && user?.role === 'ADMIN' && <AdminReferralDashboard />}
            {currentView === 'login' && !user && <LoginView onLogin={handleLogin} />}
          </div>
        </main>
      </div>
    </ReferralProvider>
  );
}

/**
 * Courses View with Share Buttons
 */
function CoursesView({ user }) {
  // Mock courses data - replace with your actual course fetching
  const [courses] = useState([
    {
      id: 'course-1',
      title: 'Complete Web Development Bootcamp',
      description: 'Learn HTML, CSS, JavaScript, React, Node.js',
      price: 2999,
      thumbnail: '/course-1.jpg',
      instructor: 'John Doe'
    },
    {
      id: 'course-2',
      title: 'Data Science with Python',
      description: 'Master data analysis, machine learning, and AI',
      price: 3999,
      thumbnail: '/course-2.jpg',
      instructor: 'Jane Smith'
    }
  ]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Available Courses</h2>
        <p className="mt-2 text-gray-600">
          Share courses with friends and earn 10% commission on each enrollment!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} isLoggedIn={!!user} />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual Course Card with Share Functionality
 */
function CourseCard({ course, isLoggedIn }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <img
        className="w-full h-48 object-cover"
        src={course.thumbnail}
        alt={course.title}
      />

      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {course.title}
        </h3>

        <p className="text-gray-600 text-sm mb-4">
          {course.description}
        </p>

        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-gray-900">
            NPR {course.price}
          </span>
          <span className="text-sm text-gray-500">
            by {course.instructor}
          </span>
        </div>

        <div className="flex space-x-2">
          <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">
            Enroll Now
          </button>

          {isLoggedIn && (
            <ShareButton
              courseId={course.id}
              course={course}
              variant="outline"
              size="medium"
            />
          )}
        </div>

        {!isLoggedIn && (
          <p className="text-xs text-gray-500 mt-2">
            Login to share courses and earn commissions
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Simple Login Form (Replace with your actual auth system)
 */
function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Mock login - replace with your actual login API
      const response = await fetch('https://goldfish-app-d9t4j.ondigitalocean.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        onLogin({
          ...data.data.user,
          token: data.data.accessToken
        });
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white py-8 px-6 shadow rounded-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Demo credentials: any valid user from your system
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
