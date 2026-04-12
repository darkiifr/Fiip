export interface IconMapping {
    sfSymbol: string;
    mdIcon: string;
    color?: string;
    backgroundColor?: string;
  }
  
  // Mapping general Lucide names (used often by Desktop users) to SF Symbols (iOS) and Material Design 3 (Android)
  export const mapLucideToNative = (lucideName: string): IconMapping => {
    const map: Record<string, IconMapping> = {
      // Essentials
      'star': { sfSymbol: 'star.fill', mdIcon: 'star', color: '#FF9500', backgroundColor: 'rgba(255, 149, 0, 0.1)' },
      'alert-circle': { sfSymbol: 'exclamationmark.circle.fill', mdIcon: 'alert-circle', color: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.1)' },
      'check-circle': { sfSymbol: 'checkmark.circle.fill', mdIcon: 'check-circle', color: '#34C759', backgroundColor: 'rgba(52, 199, 89, 0.1)' },
      'info': { sfSymbol: 'info.circle.fill', mdIcon: 'information', color: '#007AFF', backgroundColor: 'rgba(0, 122, 255, 0.1)' },
      
      // Development & Tech
      'code': { sfSymbol: 'chevron.left.forwardslash.chevron.right', mdIcon: 'code-tags', color: '#AF52DE', backgroundColor: 'rgba(175, 82, 222, 0.1)' },
      'cpu': { sfSymbol: 'cpu', mdIcon: 'cpu-64-bit', color: '#5856D6', backgroundColor: 'rgba(88, 86, 214, 0.1)' },
      'database': { sfSymbol: 'cylinder.split.1x2', mdIcon: 'database', color: '#FF9500', backgroundColor: 'rgba(255, 149, 0, 0.1)' },
      'globe': { sfSymbol: 'globe', mdIcon: 'earth', color: '#007AFF', backgroundColor: 'rgba(0, 122, 255, 0.1)' },
      'zap': { sfSymbol: 'bolt.fill', mdIcon: 'lightning-bolt', color: '#FFCC00', backgroundColor: 'rgba(255, 204, 0, 0.1)' },
      'smartphone': { sfSymbol: 'iphone', mdIcon: 'cellphone', color: '#34C759', backgroundColor: 'rgba(52, 199, 89, 0.1)' },
      'monitor': { sfSymbol: 'desktopcomputer', mdIcon: 'monitor', color: '#007AFF', backgroundColor: 'rgba(0, 122, 255, 0.1)' },
      'laptop': { sfSymbol: 'laptopcomputer', mdIcon: 'laptop', color: '#5856D6', backgroundColor: 'rgba(88, 86, 214, 0.1)' },
      'server': { sfSymbol: 'server.rack', mdIcon: 'server', color: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.1)' },
      'cloud': { sfSymbol: 'cloud.fill', mdIcon: 'cloud', color: '#5AC8FA', backgroundColor: 'rgba(90, 200, 250, 0.1)' },
      
      // Features & UI
      'settings': { sfSymbol: 'gearshape.fill', mdIcon: 'cog', color: '#8E8E93', backgroundColor: 'rgba(142, 142, 147, 0.1)' },
      'user': { sfSymbol: 'person.fill', mdIcon: 'account', color: '#007AFF', backgroundColor: 'rgba(0, 122, 255, 0.1)' },
      'users': { sfSymbol: 'person.2.fill', mdIcon: 'account-group', color: '#007AFF', backgroundColor: 'rgba(0, 122, 255, 0.1)' },
      'bell': { sfSymbol: 'bell.fill', mdIcon: 'bell', color: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.1)' },
      'moon': { sfSymbol: 'moon.fill', mdIcon: 'weather-night', color: '#5856D6', backgroundColor: 'rgba(88, 86, 214, 0.1)' },
      'sun': { sfSymbol: 'sun.max.fill', mdIcon: 'white-balance-sunny', color: '#FF9500', backgroundColor: 'rgba(255, 149, 0, 0.1)' },
      'palette': { sfSymbol: 'paintpalette.fill', mdIcon: 'palette', color: '#FF2D55', backgroundColor: 'rgba(255, 45, 85, 0.1)' },
      'lock': { sfSymbol: 'lock.fill', mdIcon: 'lock', color: '#34C759', backgroundColor: 'rgba(52, 199, 89, 0.1)' },
      'unlock': { sfSymbol: 'lock.open.fill', mdIcon: 'lock-open', color: '#8E8E93', backgroundColor: 'rgba(142, 142, 147, 0.1)' },
      'shield': { sfSymbol: 'shield.fill', mdIcon: 'shield', color: '#34C759', backgroundColor: 'rgba(52, 199, 89, 0.1)' },
      'shield-alert': { sfSymbol: 'shield.lefthalf.fill', mdIcon: 'shield-alert', color: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.1)' },
      'heart': { sfSymbol: 'heart.fill', mdIcon: 'heart', color: '#FF2D55', backgroundColor: 'rgba(255, 45, 85, 0.1)' },
      'file-text': { sfSymbol: 'doc.text.fill', mdIcon: 'file-document', color: '#007AFF', backgroundColor: 'rgba(0, 122, 255, 0.1)' },
      'folder': { sfSymbol: 'folder.fill', mdIcon: 'folder', color: '#34C759', backgroundColor: 'rgba(52, 199, 89, 0.1)' },
      'camera': { sfSymbol: 'camera.fill', mdIcon: 'camera', color: '#FF9500', backgroundColor: 'rgba(255, 149, 0, 0.1)' },
      'mic': { sfSymbol: 'mic.fill', mdIcon: 'microphone', color: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.1)' },
      'pen-tool': { sfSymbol: 'pencil.tip', mdIcon: 'draw-pen', color: '#AF52DE', backgroundColor: 'rgba(175, 82, 222, 0.1)' },
      
      // Default icon if no match
      'default': { sfSymbol: 'tag.fill', mdIcon: 'tag', color: '#8E8E93', backgroundColor: 'rgba(142, 142, 147, 0.1)' },
    };
    
    return map[lucideName.toLowerCase()] || map['default'];
  };
  
  // Automatically deduce mapping based on Badge string contents (fallback logic)
  export const getBadgeIconMapping = (badgeText: string): IconMapping => {
     // First try to see if it EXACTLY matches a Lucide name
     const directMap = mapLucideToNative(badgeText);
     if (badgeText.toLowerCase() !== 'default' && directMap.sfSymbol !== 'tag.fill') {
         return directMap;
     }

     const lower = badgeText.toLowerCase();
     
     if (lower.includes('urgent') || lower.includes('error') || lower.includes('bug')) return mapLucideToNative('alert-circle');
     if (lower.includes('dev') || lower.includes('code') || lower.includes('react') || lower.includes('typescript')) return mapLucideToNative('code');
     if (lower.includes('db') || lower.includes('sql') || lower.includes('supabase')) return mapLucideToNative('database');
     if (lower.includes('ia') || lower.includes('ai') || lower.includes('spark')) return mapLucideToNative('zap');
     if (lower.includes('mobile') || lower.includes('ios') || lower.includes('android') || lower.includes('app')) return mapLucideToNative('smartphone');
     if (lower.includes('desktop') || lower.includes('web') || lower.includes('pc')) return mapLucideToNative('monitor');
     if (lower.includes('done') || lower.includes('ok') || lower.includes('fix')) return mapLucideToNative('check-circle');
     if (lower.includes('server') || lower.includes('backend') || lower.includes('api')) return mapLucideToNative('server');
     
     return mapLucideToNative('default');
  }