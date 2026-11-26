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
  getByIds: (ids) => api.post('/tours/tours/by-ids/', { ids }),
  create: (data) => api.post('/tours/tours/', data),
  update: (id, data) => api.put(`/tours/tours/${id}/`, data),
  delete: (id) => api.delete(`/tours/tours/${id}/`),
};

// ==================== FAVORITES ====================
export const favoriteAPI = {
  getAll: () => api.get('/tours/favorites/'),
  getIds: () => api.get('/tours/favorites/ids/'),
  toggle: (tourId) => api.post('/tours/favorites/toggle/', { tour_id: tourId }),
  sync: (tourIds) => api.post('/tours/favorites/sync/', { tour_ids: tourIds }),
  clear: () => api.post('/tours/favorites/clear/'),
  remove: (favoriteId) => api.delete(`/tours/favorites/${favoriteId}/`),
};

// ==================== TOURS (Admin) ====================
export const adminTourAPI = {
  getAll: (params) => api.get('/tours/admin/tours/', { params }),
  getById: (id) => api.get(`/tours/admin/tours/${id}/`),
  create: (data) => api.post('/tours/admin/tours/', data),
  update: (id, data) => api.patch(`/tours/admin/tours/${id}/`, data),
  delete: (id) => api.delete(`/tours/admin/tours/${id}/`),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/tours/admin/tours/upload-image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  toggleActive: (id) => api.post(`/tours/admin/tours/${id}/toggle/`),
  toggleFeatured: (id) => api.post(`/tours/admin/tours/${id}/toggle-featured/`),
  toggleHot: (id) => api.post(`/tours/admin/tours/${id}/toggle-hot/`),
  getGuideStats: (params) => api.get('/tours/admin/tours/guide-stats/', { params }),
  getManifest: (id) => api.get(`/tours/admin/tours/${id}/manifest/`),
  alertSale: (id, data = {}) => api.post(`/tours/admin/tours/${id}/alert-sale/`, data),
  clearPrioritySale: (id) => api.post(`/tours/admin/tours/${id}/clear-priority/`),
  togglePrioritySale: (id) => api.post(`/tours/admin/tours/${id}/toggle-priority/`),
  activateSale: (id, percent = 20) => api.post(`/tours/admin/tours/${id}/activate-sale/`, { sale_percent: percent }),
  deactivateSale: (id) => api.post(`/tours/admin/tours/${id}/deactivate-sale/`),
  getNotifications: () => api.get('/tours/admin/tours/notifications/'),
  markNotificationRead: (alertId) => api.post(`/tours/admin/tours/notifications/${alertId}/mark-read/`),
  markAllNotificationsRead: () => api.post('/tours/admin/tours/notifications/mark-all-read/'),
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
  cancel: (id, data = {}) => api.post(`/bookings/bookings/${id}/cancel/`, data),
  pay: (id, method) => api.post(`/bookings/bookings/${id}/pay/`, { method }),
  lookup: (params) => api.get('/bookings/bookings/lookup/', { params }),
};

// ==================== BOOKINGS (Admin) ====================
export const adminBookingAPI = {
  getAll: (params) => api.get('/bookings/admin/bookings/', { params }),
  getStatusCounts: (params) => api.get('/bookings/admin/bookings/status-counts/', { params }),
  getById: (id) => api.get(`/bookings/admin/bookings/${id}/`),
  confirm: (id) => api.post(`/bookings/admin/bookings/${id}/confirm/`),
  complete: (id) => api.post(`/bookings/admin/bookings/${id}/complete/`),
  cancel: (id) => api.post(`/bookings/admin/bookings/${id}/cancel/`),
  reassign: (id, guideId) => api.post(`/bookings/admin/bookings/${id}/reassign/`, { guide_id: guideId }),
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
  canReview: (tourId) => api.get('/reviews/reviews/can-review/', { params: { tour: tourId } }),
};

// ==================== USERS (Admin) ====================
export const adminUserAPI = {
  getAll: (params) => api.get('/auth/admin/users/', { params }),
  getById: (id) => api.get(`/auth/admin/users/${id}/`),
  create: (data) => api.post('/auth/admin/users/', data),
  update: (id, data) => api.patch(`/auth/admin/users/${id}/`, data),
  delete: (id) => api.delete(`/auth/admin/users/${id}/`),
  toggleActive: (id) => api.post(`/auth/admin/users/${id}/toggle-active/`),
  resetPassword: (id, newPassword = '123456', email = '') => api.post(`/auth/admin/users/${id}/reset-password/`, { new_password: newPassword, email }),
  getStats: () => api.get('/auth/admin/users/stats/'),
  getGuides: () => api.get('/auth/admin/users/guides/'),
};

// ==================== CONSULTATIONS (Customer) ====================
export const consultationAPI = {
  create: (data) => api.post('/bookings/consultations/', data),
  getAll: (params) => api.get('/bookings/consultations/', { params }),
};

// ==================== CONSULTATIONS (Admin & Guides) ====================
export const adminConsultationAPI = {
  getAll: (params) => api.get('/bookings/admin/consultations/', { params }),
  getStats: (params) => api.get('/bookings/admin/consultations/stats/', { params }),
  getById: (id) => api.get(`/bookings/admin/consultations/${id}/`),
  update: (id, data) => api.patch(`/bookings/admin/consultations/${id}/`, data),
  claim: (id) => api.post(`/bookings/admin/consultations/${id}/claim/`),
  delete: (id) => api.delete(`/bookings/admin/consultations/${id}/`),
};

// ==================== MINI CHAT (Customer) ====================
export const chatAPI = {
  initSession: (data) => api.post('/chat/init/', data),
  sendMessage: (data) => api.post('/chat/messages/', data),
  pollMessages: (params) => api.get('/chat/messages/poll/', { params }),
};

// ==================== LIVE CHAT (Admin & Guides) ====================
export const adminChatAPI = {
  getSessions: (params) => api.get('/chat/admin/sessions/', { params }),
  getStats: () => api.get('/chat/admin/sessions/stats/'),
  getSessionMessages: (id) => api.get(`/chat/admin/sessions/${id}/messages/`),
  replyMessage: (id, data) => api.post(`/chat/admin/sessions/${id}/reply/`, data),
  resolveSession: (id) => api.post(`/chat/admin/sessions/${id}/resolve/`),
};


