import api from './axiosConfig';

// ==================== AUTH ====================
export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  refreshToken: (refresh) => api.post('/auth/refresh/', { refresh }),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
};

// ==================== TOURS (Public) ====================
export const tourAPI = {
  getAll: (params) => api.get('/tours/tours/', { params }),
  getById: (id) => api.get(`/tours/tours/${id}/`),
  create: (data) => api.post('/tours/tours/', data),
  update: (id, data) => api.put(`/tours/tours/${id}/`, data),
  delete: (id) => api.delete(`/tours/tours/${id}/`),
};

// ==================== TOURS (Admin) ====================
export const adminTourAPI = {
  getAll: (params) => api.get('/tours/admin/tours/', { params }),
  getById: (id) => api.get(`/tours/admin/tours/${id}/`),
  create: (data) => api.post('/tours/admin/tours/', data),
  update: (id, data) => api.patch(`/tours/admin/tours/${id}/`, data),
  delete: (id) => api.delete(`/tours/admin/tours/${id}/`),
  toggleActive: (id) => api.post(`/tours/admin/tours/${id}/toggle/`),
  toggleFeatured: (id) => api.post(`/tours/admin/tours/${id}/toggle-featured/`),
  toggleHot: (id) => api.post(`/tours/admin/tours/${id}/toggle-hot/`),
};

// ==================== CATEGORIES ====================
export const categoryAPI = {
  getAll: () => api.get('/tours/categories/'),
  getById: (id) => api.get(`/tours/categories/${id}/`),
  create: (data) => api.post('/tours/categories/', data),
  update: (id, data) => api.put(`/tours/categories/${id}/`, data),
  delete: (id) => api.delete(`/tours/categories/${id}/`),
};

// ==================== DESTINATIONS ====================
export const destinationAPI = {
  getAll: () => api.get('/tours/destinations/'),
  getById: (id) => api.get(`/tours/destinations/${id}/`),
};

// ==================== BOOKINGS (Customer) ====================
export const bookingAPI = {
  getAll: (params) => api.get('/bookings/bookings/', { params }),
  getById: (id) => api.get(`/bookings/bookings/${id}/`),
  create: (data) => api.post('/bookings/bookings/', data),
  cancel: (id) => api.post(`/bookings/bookings/${id}/cancel/`),
  pay: (id, method) => api.post(`/bookings/bookings/${id}/pay/`, { method }),
};

// ==================== BOOKINGS (Admin) ====================
export const adminBookingAPI = {
  getAll: (params) => api.get('/bookings/admin/bookings/', { params }),
  getById: (id) => api.get(`/bookings/admin/bookings/${id}/`),
  confirm: (id) => api.post(`/bookings/admin/bookings/${id}/confirm/`),
  complete: (id) => api.post(`/bookings/admin/bookings/${id}/complete/`),
  cancel: (id) => api.post(`/bookings/admin/bookings/${id}/cancel/`),
};

// ==================== DASHBOARD STATS ====================
export const statsAPI = {
  getDashboard: () => api.get('/bookings/stats/'),
};

// ==================== REVIEWS ====================
export const reviewAPI = {
  getByTour: (tourId) => api.get('/reviews/reviews/', { params: { tour: tourId } }),
  create: (data) => api.post('/reviews/reviews/', data),
  delete: (id) => api.delete(`/reviews/reviews/${id}/`),
};

// ==================== USERS (Admin) ====================
export const adminUserAPI = {
  getAll: (params) => api.get('/auth/admin/users/', { params }),
  getById: (id) => api.get(`/auth/admin/users/${id}/`),
  create: (data) => api.post('/auth/admin/users/', data),
  update: (id, data) => api.patch(`/auth/admin/users/${id}/`, data),
  delete: (id) => api.delete(`/auth/admin/users/${id}/`),
  toggleActive: (id) => api.post(`/auth/admin/users/${id}/toggle-active/`),
  resetPassword: (id, newPassword) => api.post(`/auth/admin/users/${id}/reset-password/`, { new_password: newPassword }),
  getStats: () => api.get('/auth/admin/users/stats/'),
};
