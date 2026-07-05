export const GOOGLE_TRAVEL_MODES = ['driving', 'walking', 'bicycling', 'transit'];

export function buildGoogleMapsRoute({ origin = '', destination = '', stops = [], travelMode = 'driving' }) {
  const cleanDestination = destination.trim();
  if (!cleanDestination) throw new Error('Enter a destination to generate the route.');
  const cleanStops = stops.map(stop => stop.trim()).filter(Boolean).slice(0, 8);
  const mode = GOOGLE_TRAVEL_MODES.includes(travelMode) ? travelMode : 'driving';
  const params = new URLSearchParams({ api: '1', destination: cleanDestination, travelmode: mode });
  if (origin.trim()) params.set('origin', origin.trim());
  if (cleanStops.length) params.set('waypoints', cleanStops.join('|'));
  const url = `https://www.google.com/maps/dir/?${params.toString()}`;
  const summaryLines = [
    'Route:',
    `Start: ${origin.trim() || 'Current location'}`,
    ...cleanStops.map((stop, index) => `Stop ${index + 1}: ${stop}`),
    `Destination: ${cleanDestination}`,
    `Travel mode: ${mode[0].toUpperCase()}${mode.slice(1)}`,
  ];
  const summary = summaryLines.join('\n');
  return { url, summary, message: `${summary}\n\nOpen in Google Maps:\n${url}`, stops: cleanStops, mode };
}
