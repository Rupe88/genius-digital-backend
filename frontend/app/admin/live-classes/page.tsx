'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import * as liveClassApi from '@/lib/api/liveClasses';
import { LiveClass } from '@/lib/api/liveClasses';
import * as instructorApi from '@/lib/api/instructors';
import * as courseApi from '@/lib/api/courses';

export default function AdminLiveClassesPage() {
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    instructorId: '',
    scheduledAt: '',
    duration: 60,
    meetingUrl: '',
    meetingProvider: 'OTHER',
    autoGenerateMeeting: false,
    meetingPassword: '',
  });

  useEffect(() => {
    fetchLiveClasses();
    fetchInstructors();
    fetchCourses();
  }, []);

  const fetchLiveClasses = async () => {
    try {
      setLoading(true);
      const response = await liveClassApi.getAllLiveClasses({ limit: 50 });
      setLiveClasses(response.data || []);
    } catch (error) {
      console.error('Error fetching live classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      const response = await instructorApi.getAllInstructors();
      setInstructors(response.data || []);
    } catch (error) {
      console.error('Error fetching instructors:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await courseApi.getAllCourses({ limit: 100 });
      setCourses(response.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await liveClassApi.updateLiveClass(editingClass.id, formData);
        alert('Live class updated successfully');
      } else {
        await liveClassApi.createLiveClass(formData);
        alert('Live class created successfully');
      }
      setShowForm(false);
      setEditingClass(null);
      resetForm();
      fetchLiveClasses();
    } catch (error) {
      console.error('Error saving live class:', error);
      alert('Failed to save live class');
    }
  };

  const handleEdit = (liveClass: LiveClass) => {
    setEditingClass(liveClass);
    setFormData({
      title: liveClass.title,
      description: liveClass.description || '',
      courseId: liveClass.courseId || '',
      instructorId: liveClass.instructorId,
      scheduledAt: new Date(liveClass.scheduledAt).toISOString().slice(0, 16),
      duration: liveClass.duration,
      meetingUrl: liveClass.meetingUrl || '',
      meetingProvider: liveClass.meetingProvider || 'OTHER',
      autoGenerateMeeting: liveClass.autoGenerateMeeting || false,
      meetingPassword: liveClass.meetingPassword || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this live class?')) {
      return;
    }
    try {
      await liveClassApi.deleteLiveClass(id);
      alert('Live class deleted successfully');
      fetchLiveClasses();
    } catch (error) {
      console.error('Error deleting live class:', error);
      alert('Failed to delete live class');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      courseId: '',
      instructorId: '',
      scheduledAt: '',
      duration: 60,
      meetingUrl: '',
      meetingProvider: 'OTHER',
      autoGenerateMeeting: false,
      meetingPassword: '',
    });
  };

  const meetingProviders = [
    { value: 'ZOOM', label: 'Zoom' },
    { value: 'GOOGLE_MEET', label: 'Google Meet' },
    { value: 'OTHER', label: 'Other' },
  ];

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Live Classes Management</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Manage live classes and meetings</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingClass(null);
            resetForm();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-none hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Create Live Class'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card padding="lg" className="mb-6">
          <h2 className="text-xl font-bold mb-4">{editingClass ? 'Edit Live Class' : 'Create Live Class'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Instructor *</label>
                <select
                  value={formData.instructorId}
                  onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-none"
                >
                  <option value="">Select Instructor</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Course (Optional)</label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-none"
                >
                  <option value="">No Course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes) *</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  required
                  min={1}
                  className="w-full px-3 py-2 border rounded-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Meeting Provider</label>
                <select
                  value={formData.meetingProvider}
                  onChange={(e) => setFormData({ ...formData, meetingProvider: e.target.value })}
                  className="w-full px-3 py-2 border rounded-none"
                >
                  {meetingProviders.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-none"
              />
            </div>

            {/* Zoom Integration Options */}
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoGenerate"
                  checked={formData.autoGenerateMeeting}
                  onChange={(e) => setFormData({ ...formData, autoGenerateMeeting: e.target.checked })}
                  disabled={formData.meetingProvider !== 'ZOOM'}
                  className="mr-2"
                />
                <label htmlFor="autoGenerate" className={formData.meetingProvider !== 'ZOOM' ? 'opacity-50' : ''}>
                  Auto-generate Zoom meeting
                </label>
              </div>

              {!formData.autoGenerateMeeting && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Meeting URL</label>
                    <input
                      type="url"
                      value={formData.meetingUrl}
                      onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                      placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                      className="w-full px-3 py-2 border rounded-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Meeting Password (Optional)</label>
                    <input
                      type="text"
                      value={formData.meetingPassword}
                      onChange={(e) => setFormData({ ...formData, meetingPassword: e.target.value })}
                      className="w-full px-3 py-2 border rounded-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-none hover:bg-blue-700"
              >
                {editingClass ? 'Update' : 'Create'} Live Class
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingClass(null);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-none hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Live Classes Table */}
      <Card padding="lg">
        {loading ? (
          <p className="text-center py-8">Loading live classes...</p>
        ) : liveClasses.length === 0 ? (
          <p className="text-center py-8 text-[var(--muted-foreground)]">No live classes found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Instructor</th>
                  <th className="text-left py-3 px-4">Scheduled</th>
                  <th className="text-left py-3 px-4">Provider</th>
                  <th className="text-left py-3 px-4">Meeting Link</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {liveClasses.map((liveClass) => (
                  <tr key={liveClass.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{liveClass.title}</td>
                    <td className="py-3 px-4">{liveClass.instructor?.name || 'N/A'}</td>
                    <td className="py-3 px-4">
                      {new Date(liveClass.scheduledAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {liveClass.meetingProvider || 'OTHER'}
                    </td>
                    <td className="py-3 px-4">
                      {liveClass.zoomJoinUrl || liveClass.meetingUrl ? (
                        <a
                          href={liveClass.zoomJoinUrl || liveClass.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Join Meeting
                        </a>
                      ) : (
                        <span className="text-[var(--muted-foreground)] text-sm">No link</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-none text-xs ${
                          liveClass.status === 'LIVE'
                            ? 'bg-red-100 text-red-800'
                            : liveClass.status === 'COMPLETED'
                            ? 'bg-gray-100 text-gray-800'
                            : liveClass.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {liveClass.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(liveClass)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(liveClass.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

