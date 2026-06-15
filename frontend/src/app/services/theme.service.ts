import { Injectable } from '@angular/core';

export type AppTheme = 'midnight' | 'graphite' | 'ocean' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly themes: AppTheme[] = ['midnight', 'graphite', 'ocean', 'light'];
  current: AppTheme = 'midnight';

  constructor() {
    const saved = localStorage.getItem('agentqa-theme') as AppTheme | null;
    this.apply(this.themes.includes(saved as AppTheme) ? saved as AppTheme : 'midnight');
  }

  apply(theme: AppTheme) {
    this.current = theme;
    document.documentElement.dataset['theme'] = theme;
    localStorage.setItem('agentqa-theme', theme);
  }
}
