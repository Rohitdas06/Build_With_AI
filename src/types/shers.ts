export interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff' | 'security';
  full_name: string;
  department: string;
  phone?: string;
}

export interface Incident {
  id: string;
  type?: string;
  title?: string;
  severity: 'critical' | 'urgent' | 'security' | 'info';
  location: string;
  description?: string | null;
  status: 'active' | 'responding' | 'resolved';
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  reported_by?: string | null;
  resolution_notes?: string | null;
  ai_narrative?: string | null;
  narrative_generated_at?: string | null;
  created_at?: string;
  detected_at?: string;
  resolved_at?: string | null;
  response_time_seconds?: number | null;
}

export interface SensorEvent {
  id: string;
  sensor_type: string;
  location: string;
  value: number;
  unit: string;
  alert_level: 'normal' | 'warning' | 'critical';
  timestamp: string;
}

export interface Message {
  id: string;
  sender_id?: string | null;
  sender?: string;
  sender_name?: string;
  content: string;
  channel?: string;
  msg_type?: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  full_name: string;
  role: string;
  department: string;
  status: 'available' | 'responding' | 'off_duty' | 'break';
  current_location: string;
  last_updated: string;
}

export interface ThreatPrediction {
  location: string;
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  primaryThreat: string;
  reasoning: string;
  confidence: number;
  contributingFactors: string[];
}

export interface ThreatIntelReport {
  predictions: ThreatPrediction[];
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
  analysisTimestamp: string;
  recommendedActions: string[];
  analysisWindowMinutes: number;
}

export interface AnalyticsData {
  bySeverity: { severity: string; count: number }[];
  byLocation: { location: string; count: number }[];
  byDay: { date: string; count: number }[];
  byHour: { hour: number; day: number; count: number }[];
  avgResponseTimeMinutes: number;
  resolvedToday: number;
}

/** In-app toast for live sensor / WS alerts (Dashboard). */
export interface SensorAlertToast {
  id: string;
  sensor?: string;
  title: string;
  location: string;
  severity: 'critical' | 'urgent' | 'info';
}
