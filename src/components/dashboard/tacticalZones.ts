import type { LucideIcon } from 'lucide-react';
import { Dumbbell, Waves, ChefHat, UtensilsCrossed, Building2, DoorOpen } from 'lucide-react';
import type { Incident } from '../../types/shers';
import type { ZoneStatus } from './ZoneTile';

export type TacticalZoneDef = {
  id: string;
  name: string;
  keywords: string[];
  icon: LucideIcon;
};

export const TACTICAL_ZONES: TacticalZoneDef[] = [
  { id: 'gym', name: 'Gym', keywords: ['gym', 'fitness'], icon: Dumbbell },
  { id: 'pool', name: 'Pool', keywords: ['pool', 'spa'], icon: Waves },
  { id: 'kitchen', name: 'Kitchen', keywords: ['kitchen', 'galley'], icon: ChefHat },
  { id: 'restaurant', name: 'Restaurant', keywords: ['restaurant', 'dining', 'bar'], icon: UtensilsCrossed },
  { id: 'floors', name: 'Floors', keywords: ['floor', 'hall', 'corridor', 'suite', 'room'], icon: Building2 },
  { id: 'lobby', name: 'Lobby', keywords: ['lobby', 'reception', 'entrance'], icon: DoorOpen },
];

function locMatches(location: string, keywords: string[]) {
  const l = location.toLowerCase();
  return keywords.some((k) => l.includes(k));
}

export function zoneStatusFor(
  zone: TacticalZoneDef,
  activeIncidents: Incident[],
  riskByLocation: Record<string, number>
): { status: ZoneStatus; hasActiveAlert: boolean } {
  const open = activeIncidents.filter((i) => i.status !== 'resolved');
  const hit = open.find((i) => locMatches(i.location || '', zone.keywords));
  if (hit && (hit.severity === 'critical' || hit.severity === 'urgent')) {
    return { status: 'critical', hasActiveAlert: true };
  }
  if (hit) {
    return { status: 'warn', hasActiveAlert: true };
  }

  let maxRisk = 0;
  for (const [loc, score] of Object.entries(riskByLocation)) {
    if (locMatches(loc, zone.keywords)) maxRisk = Math.max(maxRisk, score);
  }
  if (maxRisk >= 70) return { status: 'critical', hasActiveAlert: false };
  if (maxRisk >= 40) return { status: 'warn', hasActiveAlert: false };

  return { status: 'safe', hasActiveAlert: false };
}
