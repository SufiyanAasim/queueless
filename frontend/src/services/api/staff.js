import { api } from './client.js';

// Staff portal (authenticated as a staff member).
export const apiStaffQueue          = () => api.get('/staff/queue').then(r => r.data);
export const apiStaffCallNext       = () => api.post('/staff/queue/call-next', {}).then(r => r.data);
export const apiStaffPinLogin       = (pin) => api.post('/staff/login/pin', { pin }).then(r => r.data);
export const apiStaffProfile        = () => api.get('/staff/profile').then(r => r.data);
export const apiUpdateStaffProfile  = (data) => api.put('/staff/profile', data).then(r => r.data);
export const apiStaffChangePassword = (currentPassword, newPassword) =>
  api.post('/staff/change-password', { currentPassword, newPassword }).then(r => r.data);

// Staff administration (admin-managed).
export const apiListStaff       = () => api.get('/admin/staff').then(r => r.data);
export const apiCreateStaff     = (data) => api.post('/admin/staff', data).then(r => r.data);
export const apiDeleteStaff     = (username) => api.delete(`/admin/staff/${username}`).then(r => r.data);
export const apiAssignStaffQueue = (username, service) => api.put(`/admin/staff/${username}/service`, { service }).then(r => r.data);
