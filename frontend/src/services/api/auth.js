import { api } from './client.js';

export const apiLogin = (u, p) =>
  api.post('/auth/login', { username: u, password: p }).then(r => r.data);
