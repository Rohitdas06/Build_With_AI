import type { AnalyticsData, Incident, Message, SensorEvent, TeamMember, ThreatIntelReport, User } from '../types/shers';
import { getAuthToken } from '../lib/authStorage';

async function fetcher(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(endpoint, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { error?: string }).error || 'API Request failed');
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  get: (url: string) => fetcher(url),
  post: (url: string, data?: unknown) =>
    fetcher(url, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: (url: string, data?: unknown) =>
    fetcher(url, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined }),

  login: (username: string, password: string) =>
    fetcher('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }) as Promise<{
      access_token: string;
      token: string;
      role: string;
      user: User;
    }>,

  getMe: () => fetcher('/api/auth/me') as Promise<User>,

  getIncidents: (status?: string) =>
    fetcher(status ? `/api/incidents?status=${encodeURIComponent(status)}` : '/api/incidents') as Promise<Incident[]>,

  createIncident: (data: Partial<Incident> & { location: string; severity: string; type?: string; title?: string }) =>
    fetcher('/api/incidents', { method: 'POST', body: JSON.stringify(data) }) as Promise<Incident>,

  updateIncident: (id: string, data: Partial<Incident> & { status?: string }) =>
    fetcher(`/api/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }) as Promise<Incident>,

  generateNarrative: (id: string) =>
    fetcher(`/api/incidents/${id}/generate-narrative`, { method: 'POST' }) as Promise<{ narrative: string; generated_at: string }>,

  getNarrative: (id: string) =>
    fetcher(`/api/incidents/${id}/narrative`) as Promise<{ narrative: string | null; generated_at: string | null }>,

  getRecentSensors: () => fetcher('/api/sensors/recent') as Promise<SensorEvent[]>,

  getTeam: () => fetcher('/api/team') as Promise<TeamMember[]>,

  updateTeamStatus: (userId: string, status: string, location?: string) =>
    fetcher(`/api/team/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, current_location: location }),
    }) as Promise<{ ok: boolean }>,

  getMessages: (channel = 'general') =>
    fetcher(`/api/messages?channel=${encodeURIComponent(channel)}`) as Promise<Message[]>,

  sendMessage: (content: string, channel = 'general', msg_type = 'staff', sender?: string) =>
    fetcher('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ content, channel, msg_type, ...(sender ? { sender } : {}) }),
    }) as Promise<Message>,

  getAnalytics: () => fetcher('/api/analytics') as Promise<AnalyticsData>,

  getLatestThreatIntel: () => fetcher('/api/threat-intel/latest') as Promise<ThreatIntelReport>,

  sendGuestMessage: (message: string, sessionId: string, history: { role: string; content: string }[]) =>
    fetcher('/api/guest/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId, history }),
    }) as Promise<{ reply: string; escalated: boolean; incidentId?: string }>,
};
