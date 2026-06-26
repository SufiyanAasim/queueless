import { api } from './client.js';

// Organisation config.
export const apiAdminConfig  = () => api.get('/admin/config').then(r => r.data);
export const apiUpdateConfig = (industry, orgName, location, displayMessage, slaMinutes, autoResetTime) =>
  api.put('/admin/config', {
    industry, orgName, location,
    displayMessage: displayMessage || null,
    slaMinutes: slaMinutes || null,
    autoResetTime: autoResetTime || null,
  }).then(r => r.data);

// Admin accounts.
export const apiListAdmins  = () => api.get('/admin/admins').then(r => r.data);
export const apiCreateAdmin = (data) => api.post('/admin/admins', data).then(r => r.data);
export const apiDeleteAdmin = (username) => api.delete(`/admin/admins/${username}`).then(r => r.data);
export const apiSetAdminRole = (username, role) => api.put(`/admin/admins/${username}/role`, { role }).then(r => r.data);

// Admin profile.
export const apiAdminProfile       = () => api.get('/admin/profile').then(r => r.data);
export const apiUpdateAdminProfile = (data) => api.put('/admin/profile', data).then(r => r.data);

// Announcements.
export const apiSetAnnouncement   = (message) => api.put('/admin/announcement', { message }).then(r => r.data);
export const apiClearAnnouncement = () => api.delete('/admin/announcement').then(r => r.data);

// Appointments (admin side).
export const apiListAppointments   = () => api.get('/admin/appointments').then(r => r.data);
export const apiConfirmAppointment = (id) => api.put(`/admin/appointments/${id}/confirm`).then(r => r.data);
export const apiCancelAppointment  = (id) => api.put(`/admin/appointments/${id}/cancel`).then(r => r.data);
