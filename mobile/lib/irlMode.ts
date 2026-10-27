export type IrlMood = 'chill' | 'adventurous' | 'active' | 'chaotic';

export const IRL_MOODS: { id: IrlMood; label: string; hint: string; category: string; icon: string }[] = [
  { id: 'chill', label: 'Chill', hint: 'Coffee, study, easy company', category: 'coffee', icon: 'cafe-outline' },
  { id: 'adventurous', label: 'Curious', hint: 'Fresh air and new places', category: 'outdoors', icon: 'compass-outline' },
  { id: 'active', label: 'Active', hint: 'Move, play, get outside', category: 'sports', icon: 'basketball-outline' },
  { id: 'chaotic', label: 'Spontaneous', hint: 'Food, games, anything goes', category: 'party', icon: 'sparkles-outline' },
];

export const MISSION_CHALLENGES = [
  'Meet three new people and find a neighborhood favorite.',
  'Teach the group one small skill you know.',
  'Try a new pickup game together.',
  'Find the best iced coffee in the neighborhood.',
  'Take an optional group photo at a public landmark.',
];

const MISSION_MARKER = '\n\n[Hangout mission:';

export function encodeMissionDescription(description: string, challenge: string, mystery: boolean) {
  if (!challenge.trim() && !mystery) return description.trim();
  return `${description.trim()}${MISSION_MARKER}${encodeURIComponent(JSON.stringify({ challenge: challenge.trim(), mystery }))}]`;
}

export function parseMissionDescription(value: string | null | undefined) {
  const text = value || '';
  const index = text.lastIndexOf(MISSION_MARKER);
  if (index < 0) return { description: text, challenge: '', mystery: false };
  const suffix = text.slice(index + MISSION_MARKER.length).replace(/]$/, '');
  try {
    const mission = JSON.parse(decodeURIComponent(suffix));
    return {
      description: text.slice(0, index).trim(),
      challenge: typeof mission.challenge === 'string' ? mission.challenge : '',
      mystery: mission.mystery === true,
    };
  } catch {
    return { description: text, challenge: '', mystery: false };
  }
}

export function distanceInKm(latA: number, lngA: number, latB: number, lngB: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(latB - latA);
  const dLng = radians(lngB - lngA);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(latA)) * Math.cos(radians(latB)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
