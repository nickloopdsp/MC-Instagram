export interface DiscoveryDetection {
  shouldDiscover: boolean;
  role?: string;
  city?: string;
}

export const discoveryAgent = {
  detect(message: string): DiscoveryDetection {
    const lower = (message || '').toLowerCase();
    const rolePatterns = [
      /\bvenues?\b/, /\bclubs?\b/, /\bproducers?\b/, /\bengineers?\b/, /\bbookers?\b/, /\bpromoters?\b/, /\bmanagers?\b/, /\blabels?\b/
    ];
    const hasRole = rolePatterns.some(r => r.test(lower));
    const hasIn = /\b(in|at)\s+([a-z\-\s]+)$/.test(lower) || /\bnyc\b|\bla\b|\bberlin\b|\blondon\b|\bparis\b/.test(lower);
    const shouldDiscover = hasRole && (hasIn || true); // be permissive; model will add genre
    
    let role: string | undefined;
    if (/venues?/.test(lower) || /clubs?/.test(lower)) role = 'venue';
    else if (/producers?/.test(lower)) role = 'producer';
    else if (/engineers?/.test(lower)) role = 'engineer';
    else if (/bookers?/.test(lower)) role = 'booker';
    else if (/promoters?/.test(lower)) role = 'promoter';
    else if (/managers?/.test(lower)) role = 'manager';
    else if (/labels?/.test(lower)) role = 'label';

    let city: string | undefined;
    const cityMatch = lower.match(/\b(?:in|at)\s+([a-z\s]+)\b/);
    if (cityMatch && cityMatch[1]) {
      city = cityMatch[1].trim();
    } else if (/\bnyc\b/.test(lower)) city = 'NYC';
    else if (/\bla\b/.test(lower)) city = 'LA';
    else if (/\bberlin\b/.test(lower)) city = 'Berlin';
    else if (/\blondon\b/.test(lower)) city = 'London';
    else if (/\bparis\b/.test(lower)) city = 'Paris';

    return { shouldDiscover, role, city };
  },

  buildQuery(message: string, context: Array<{ messageText: string | null; responseText: string | null; intent: string | null }>): string {
    const detection = this.detect(message);
    let genre: string | undefined;
    // Try to heuristically find a genre in the current message
    const genreList = [
      'hip-hop','rap','indie','pop','rock','electronic','edm','house','techno','jazz','r&b','metal','folk','punk'
    ];
    const lower = (message || '').toLowerCase();
    genre = genreList.find(g => lower.includes(g));

    // Build phrase: "<role> <city> <genre>"
    const parts: string[] = [];
    if (detection.role) parts.push(detection.role);
    if (detection.city) parts.push(detection.city);
    if (genre) parts.push(genre);

    const query = parts.join(' ').trim() || message.trim();
    return query;
  }
};

export type DiscoveryAgent = typeof discoveryAgent;


