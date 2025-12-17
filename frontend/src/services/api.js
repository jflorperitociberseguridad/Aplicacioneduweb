import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Courses API
export const coursesApi = {
  list: (params) => api.get('/courses', { params }),
  get: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.patch(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  duplicate: (id, shortname, fullname) => 
    api.post(`/courses/${id}/duplicate`, null, { params: { new_shortname: shortname, new_fullname: fullname } }),
  bulk: (ids, action) => api.post('/courses/bulk', { course_ids: ids, action }),
  stats: (id) => api.get(`/courses/${id}/stats`),
};

// Categories API
export const categoriesApi = {
  list: (params) => api.get('/categories', { params }),
  tree: () => api.get('/categories/tree'),
  get: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.patch(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Sections API
export const sectionsApi = {
  list: (courseId) => api.get(`/courses/${courseId}/sections`),
  get: (courseId, sectionId) => api.get(`/courses/${courseId}/sections/${sectionId}`),
  create: (courseId, data) => api.post(`/courses/${courseId}/sections`, data),
  update: (courseId, sectionId, data) => api.patch(`/courses/${courseId}/sections/${sectionId}`, data),
  delete: (courseId, sectionId, force = false) => 
    api.delete(`/courses/${courseId}/sections/${sectionId}`, { params: { force } }),
  move: (courseId, sectionId, newPosition) => 
    api.post(`/courses/${courseId}/sections/${sectionId}/move`, null, { params: { new_position: newPosition } }),
};

// Items API
export const itemsApi = {
  listBySection: (sectionId) => api.get(`/sections/${sectionId}/items`),
  get: (itemId) => api.get(`/items/${itemId}`),
  create: (sectionId, data) => api.post(`/sections/${sectionId}/items`, data),
  update: (itemId, data) => api.patch(`/items/${itemId}`, data),
  delete: (itemId) => api.delete(`/items/${itemId}`),
  duplicate: (itemId, targetSectionId) => 
    api.post(`/items/${itemId}/duplicate`, null, { params: { target_section_id: targetSectionId } }),
  move: (itemId, targetSectionId, newPosition) => 
    api.post(`/items/${itemId}/move`, null, { params: { target_section_id: targetSectionId, new_position: newPosition } }),
  toggleVisibility: (itemId, visible) => 
    api.patch(`/items/${itemId}/visibility`, null, { params: { visible } }),
};

// Users API
export const usersApi = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  bulk: (ids, action, role) => api.post('/users/bulk', { user_ids: ids, action, role }),
};

// Enrollments API
export const enrollmentsApi = {
  list: (courseId, params) => api.get(`/courses/${courseId}/enrollments`, { params }),
  create: (courseId, data) => api.post(`/courses/${courseId}/enrollments`, data),
  update: (enrollmentId, data) => api.patch(`/enrollments/${enrollmentId}`, data),
  delete: (enrollmentId) => api.delete(`/enrollments/${enrollmentId}`),
  bulk: (courseId, userIds, role) => 
    api.post(`/courses/${courseId}/enrollments/bulk`, { user_ids: userIds, role }),
  myEnrollments: () => api.get('/my-enrollments'),
  selfEnroll: (code) => api.post('/enroll/code', null, { params: { code } }),
};
