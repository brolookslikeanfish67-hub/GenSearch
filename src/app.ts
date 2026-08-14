class GenSearchEngine {
  private readonly searchInput: HTMLInputElement;
  private readonly suggestionsList: HTMLUListElement;
  private readonly clearBtn: HTMLButtonElement;
  private readonly historyTagsContainer: HTMLDivElement;
  private readonly themeToggleBtn: HTMLButtonElement;
  
  private history: string[] = [];
  private activeSuggestionIndex: number = -1;

  private readonly STORAGE_KEY = 'gensearch_history';
  private readonly MOCK_DATABASE = [
    'gensearch engine documentation',
    'typescript full tutorial',
    'github trending repositories',
    'modern css styling tips',
    'web dev projects 2026'
  ];

  constructor() {
    this.searchInput = this.getRequiredElement<HTMLInputElement>('search-input');
    this.suggestionsList = this.getRequiredElement<HTMLUListElement>('suggestions-list');
    this.clearBtn = this.getRequiredElement<HTMLButtonElement>('clear-btn');
    this.historyTagsContainer = this.getRequiredElement<HTMLDivElement>('history-tags');
    this.themeToggleBtn = this.getRequiredElement<HTMLButtonElement>('theme-toggle');

    this.init();
  }

  private init(): void {
    this.loadHistory();
    this.bindEvents();
    this.renderHistory();
    this.syncInitialThemeIcon();
  }

  /**
   * Safe DOM assertion layer to fail early if structural HTML breaks
   */
  private getRequiredElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`[GenSearchEngine] Required DOM Element #${id} missing.`);
    return el as T;
  }

  private bindEvents(): void {
    // Input interaction
    this.searchInput.addEventListener('input', () => this.handleInput());
    this.searchInput.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeyboardNavigation(e));
    
    // Clear field control
    this.clearBtn.addEventListener('click', () => this.resetSearchField());

    // Search actions
    document.getElementById('search-btn')?.addEventListener('click', () => this.submitSearch());
    document.getElementById('lucky-btn')?.addEventListener('click', () => this.executeSearch('TypeScript web apps'));

    // Theme toggle
    this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

    // Global Hotkeys
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== this.searchInput) {
        e.preventDefault();
        this.searchInput.focus();
      }
      if (e.key === 'Escape') {
        this.hideSuggestions();
      }
    });

    // Close recommendations panel if clicking outside the wrapper
    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.searchInput.contains(e.target as Node) && !this.suggestionsList.contains(e.target as Node)) {
        this.hideSuggestions();
      }
    });
  }

  private handleInput(): void {
    const query = this.searchInput.value.trim();
    if (query.length > 0) {
      this.clearBtn.classList.remove('hidden');
      this.fetchSuggestions(query);
    } else {
      this.clearBtn.classList.add('hidden');
      this.hideSuggestions();
    }
  }

  /**
   * Adds complete accessibility support to control recommendations with keyboard arrows
   */
  private handleKeyboardNavigation(e: KeyboardEvent): void {
    const items = this.suggestionsList.querySelectorAll('li');
    
    if (this.suggestionsList.classList.contains('hidden') || items.length === 0) {
      if (e.key === 'Enter') this.submitSearch();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeSuggestionIndex = (this.activeSuggestionIndex + 1) % items.length;
      this.highlightSuggestion(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeSuggestionIndex = (this.activeSuggestionIndex - 1 + items.length) % items.length;
      this.highlightSuggestion(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.activeSuggestionIndex >= 0 && this.activeSuggestionIndex < items.length) {
        const selectedText = items[this.activeSuggestionIndex].textContent || '';
        this.searchInput.value = selectedText;
        this.executeSearch(selectedText);
      } else {
        this.submitSearch();
      }
    }
  }

  private highlightSuggestion(items: NodeListOf<HTMLLIElement>): void {
    items.forEach((item, idx) => {
      if (idx === this.activeSuggestionIndex) {
        item.classList.add('selected'); // Make sure to add styling for .suggestions li.selected in your CSS
        item.scrollIntoView({ block: 'nearest' });
        this.searchInput.value = item.textContent || '';
      } else {
        item.classList.remove('selected');
      }
    });
  }

  private fetchSuggestions(query: string): void {
    const normalized = query.toLowerCase();
    const matches = this.MOCK_DATABASE.filter(item => item.toLowerCase().includes(normalized));
    this.renderSuggestions(matches);
  }

  private renderSuggestions(items: string[]): void {
    if (items.length === 0) {
      this.hideSuggestions();
      return;
    }

    // Document fragment implementation preserves DOM stability and updates faster than loop injections
    const fragment = document.createDocumentFragment();
    this.suggestionsList.innerHTML = '';
    this.activeSuggestionIndex = -1;

    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      li.addEventListener('click', () => {
        this.searchInput.value = item;
        this.executeSearch(item);
      });
      fragment.appendChild(li);
    });

    this.suggestionsList.appendChild(fragment);
    this.suggestionsList.classList.remove('hidden');
  }

  private hideSuggestions(): void {
    this.suggestionsList.classList.add('hidden');
    this.activeSuggestionIndex = -1;
  }

  private resetSearchField(): void {
    this.searchInput.value = '';
    this.clearBtn.classList.add('hidden');
    this.hideSuggestions();
    this.searchInput.focus();
  }

  private submitSearch(): void {
    this.executeSearch(this.searchInput.value);
  }

  private executeSearch(query: string): void {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    this.saveToHistory(cleanQuery);
    this.hideSuggestions();

    // Verify validity before routing web destinations
    try {
      if (/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(cleanQuery)) {
        const absoluteUrl = cleanQuery.match(/^https?:\/\//) ? cleanQuery : `https://${cleanQuery}`;
        window.location.href = absoluteUrl;
        return;
      }
    } catch {
      // Fallback directly to regular execution engine if string conversion fails
    }

    const targetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}`;
    window.open(targetUrl, '_blank');
  }

  private saveToHistory(query: string): void {
    this.history = this.history.filter(item => item !== query);
    this.history.unshift(query);
    
    if (this.history.length > 4) {
      this.history.pop();
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.history));
    this.renderHistory();
  }

  private loadHistory(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        this.history = parsed.filter(item => typeof item === 'string');
      }
    } catch {
      this.history = [];
    }
  }

  private renderHistory(): void {
    if (this.history.length === 0) {
      this.historyTagsContainer.innerHTML = '<em>No recent searches</em>';
      return;
    }

    this.historyTagsContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    this.history.forEach(term => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = term;
      span.addEventListener('click', () => {
        this.searchInput.value = term;
        this.executeSearch(term);
      });
      fragment.appendChild(span);
    });

    this.historyTagsContainer.appendChild(fragment);
  }

  private toggleTheme(): void {
    const isDark = document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme', !isDark);
    this.themeToggleBtn.textContent = isDark ? '🌙' : '☀️';
  }

  private syncInitialThemeIcon(): void {
    const isLight = document.body.classList.contains('light-theme');
    this.themeToggleBtn.textContent = isLight ? '☀️' : '🌙';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GenSearchEngine();
});
