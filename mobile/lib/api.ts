import { Platform } from 'react-native';
import { Gathering, Profile, JoinRequest, Message } from './types';
import { readToken, writeToken } from './tokenStorage';

const BASE = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

let token: string | null = null;
export async function setToken(t: string | null) {
  await writeToken(t);
  token = t;
}
export async function restoreToken() {
  token = await readToken();
  return token;
}
export function getToken() { return token; }

async function request(path: string, opts: RequestInit = {}) {
  if (!__DEV__ && !BASE.startsWith('https://')) throw new Error('This production build needs a secure HTTPS API URL.');
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON error response */ }
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

export const api = {
  signup: (b: any) => request('/auth/signup', { method: 'POST', body: JSON.stringify(b) }),
  signin: (b: any) => request('/auth/signin', { method: 'POST', body: JSON.stringify(b) }),
  me: () => request('/me'),
  sharedLocations: () => request('/locations/shared'),
  updateMyLocation: (lat: number, lng: number) => request('/me/location', { method: 'POST', body: JSON.stringify({ lat, lng }) }),
  adminGatherings: () => request('/admin/gatherings'),
  adminInactiveHosts: () => request('/admin/hosts/inactive'),
  adminReports: () => request('/admin/reports'),
  adminCancellations: () => request('/admin/cancellations'),
  adminSetFoundingHost: (id: string, value: boolean) => request('/admin/profiles/' + id + '/founding-host', { method: 'PATCH', body: JSON.stringify({ value }) }),
  updateMe: (b: any) => request('/me', { method: 'PATCH', body: JSON.stringify(b) }),
  registerPushToken: (token: string, platform: string) => request('/me/push-token', { method: 'POST', body: JSON.stringify({ token, platform }) }),
  user: (id: string) => request('/u/' + id),
  gatherings: (q?: any) => request('/gatherings' + (q ? '?' + new URLSearchParams(q).toString() : '')),
  gathering: (id: string) => request('/gatherings/' + id),
  createGathering: (b: any) => request('/gatherings', { method: 'POST', body: JSON.stringify(b) }),
  updateGathering: (id: string, b: any) => request('/gatherings/' + id, { method: 'PATCH', body: JSON.stringify(b) }),
  requestJoin: (id: string) => request('/gatherings/' + id + '/requests', { method: 'POST' }),
  requests: (id: string) => request('/gatherings/' + id + '/requests'),
  decideRequest: (gid: string, rid: string, status: 'approved' | 'declined') =>
    request('/gatherings/' + gid + '/requests/' + rid, { method: 'PATCH', body: JSON.stringify({ status }) }),
  removeRequest: (gid: string, rid: string) => request('/gatherings/' + gid + '/requests/' + rid, { method: 'DELETE' }),
  messages: (id: string) => request('/gatherings/' + id + '/messages'),
  sendMessage: (id: string, body: string) => request('/gatherings/' + id + '/messages', { method: 'POST', body: JSON.stringify({ body }) }),
  block: (userId: string) => request('/blocks', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  report: (target_type: string, target_id: string, reason: string) =>
    request('/reports', { method: 'POST', body: JSON.stringify({ target_type, target_id, reason }) }),
  myGatherings: () => request('/me/gatherings'),
  feed: (userId?: string) => request('/feed' + (userId ? '?user_id=' + encodeURIComponent(userId) : '')),
  createPost: (b: any) => request('/feed', { method: 'POST', body: JSON.stringify(b) }),
  deletePost: (id: string) => request('/feed/' + id, { method: 'DELETE' }),
  likePost: (id: string) => request('/feed/' + id + '/like', { method: 'POST' }),
  unlikePost: (id: string) => request('/feed/' + id + '/like', { method: 'DELETE' }),
  notifications: () => request('/notifications'),
  markNotificationRead: (id: string) => request('/notifications/' + id + '/read', { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),
  notificationPrefs: () => request('/me/notification-prefs'),
  updateNotificationPrefs: (b: any) => request('/me/notification-prefs', { method: 'PATCH', body: JSON.stringify(b) }),
  followHost: (id: string) => request('/hosts/' + id + '/follow', { method: 'POST' }),
  unfollowHost: (id: string) => request('/hosts/' + id + '/follow', { method: 'DELETE' }),
  conversations: (q?: string) => request('/conversations' + (q ? '?q=' + encodeURIComponent(q) : '')),
  conversation: (id: string) => request('/conversations/' + id),
  createDirectConversation: (otherUserId: string) => request('/conversations/direct', { method: 'POST', body: JSON.stringify({ otherUserId }) }),
  conversationMessages: (id: string, before?: string, limit?: number) => request('/conversations/' + id + '/messages' + (before || limit ? '?' + new URLSearchParams({ ...(before ? { before } : {}), ...(limit ? { limit: String(limit) } : {}) }).toString() : '')),
  sendConversationMessage: (id: string, body: string) => request('/conversations/' + id + '/messages', { method: 'POST', body: JSON.stringify({ body }) }),
  markConversationRead: (id: string) => request('/conversations/' + id + '/read', { method: 'PATCH' }),
  muteConversation: (id: string, muted: boolean) => request('/conversations/' + id + '/mute', { method: 'PATCH', body: JSON.stringify({ muted }) }),
  conversationMembers: (id: string) => request('/conversations/' + id + '/members'),
  gatheringConversation: (id: string) => request('/gatherings/' + id + '/conversation'),
};
