/**
 * StartMenuManager: Керування меню «Пуск» у стилі Windows 11 / Fluent UI
 * Включає структурування програм за категоріями, пошук, запуск «Про систему»
 * та команду виходу з системи (зміна користувача).
 */
import { eventBus } from '../core/event-bus.js';
import { profileManager } from '../core/profiles.js';
import { dialogs } from '../core/dialogs.js';

class StartMenuManager {
  constructor() {
    this.menuEl = null;
    this.isOpen = false;
    this.searchInput = null;
    this.categoriesContainerEl = null;
    this.profileCardEl = null;
    this.isInitialized = false;

    // 4 категорії програм згідно з навчальним планом EduOS:
    this.categories = [
      {
        id: 'programs',
        title: 'Програми',
        icon: '💻',
        apps: [
          { id: 'notepad', name: 'Блокнот', desc: 'Текстовий редактор та процесор', icon: 'notepad' },
          { id: 'paint', name: 'Paint', desc: 'Графічний редактор зображень', icon: 'paint' },
          { id: 'archiver', name: 'Архіватор', desc: 'Робота з архівами ZIP, 7Z, TAR', icon: 'archiver' },
          { id: 'browser', name: 'Браузер', desc: 'Шкільний вебпортал та інтернет', icon: 'browser' }
        ]
      },
      {
        id: 'utilities',
        title: 'Службові',
        icon: '🛠️',
        apps: [
          { id: 'settings', name: 'Налаштування', desc: 'Параметри навчальної системи', icon: 'settings' },
          { id: 'task-manager', name: 'Диспетчер завдань', desc: 'Процеси та продуктивність', icon: 'tasks' },
          { id: 'disk-manager', name: 'Керування дисками', desc: 'Розділи та форматування', icon: 'disk' },
          { id: 'cmd', name: 'Командний рядок', desc: 'Консоль Windows CMD', icon: 'cmd' },
          { id: 'bash', name: 'Термінал Linux', desc: 'Оболонка Linux Bash', icon: 'bash' }
        ]
      },
      {
        id: 'system',
        title: 'Система',
        icon: '🖥️',
        apps: [
          { id: 'explorer', name: 'Провідник', desc: 'Керування файлами та папками', icon: 'explorer' },
          { id: 'network', name: 'Мережа', desc: 'Локальна мережа віртуального класу', icon: 'network' },
          { id: 'recycle-bin', name: 'Кошик', desc: 'Видалені файли та відновлення', icon: 'recycle-bin' },
          { id: 'about-system', name: 'Про систему', desc: 'Інформація про операційну систему EduOS та автора', icon: 'about-system' }
        ]
      },
      {
        id: 'education',
        title: 'Завдання',
        icon: '📚',
        apps: [
          { id: 'learning-catalog', name: 'Навчальні завдання', desc: 'Практичні роботи 5-11 класів', icon: 'learning' },
          { id: 'task-editor', name: 'Конструктор навчальних завдань', desc: 'Створення та редагування завдань', icon: 'editor' }
        ]
      }
    ];

    this.allApps = this.categories.flatMap((cat) =>
      cat.apps.map((app) => ({ ...app, categoryId: cat.id, categoryTitle: cat.title }))
    );
  }

  init(menuElement) {
    this.menuEl = menuElement || document.getElementById('start-menu');
    this.searchInput = this.menuEl ? this.menuEl.querySelector('#start-search-input') : null;
    this.categoriesContainerEl = this.menuEl ? this.menuEl.querySelector('#start-categories-container') : null;
    this.profileCardEl = this.menuEl ? this.menuEl.querySelector('#start-profile-card') : null;

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.setupListeners();

      eventBus.on('profile:login', () => {
        this.updateProfileCard();
      });
      eventBus.on('profile:logout', () => {
        this.close();
        this.updateProfileCard();
      });
    }

    this.renderCategories();
    this.updateProfileCard();
  }

  setupListeners() {
    eventBus.on('startmenu:toggle', () => this.toggle());
    eventBus.on('startmenu:close', () => this.close());

    // Закриття при кліку поза меню
    window.addEventListener('mousedown', (e) => {
      if (this.isOpen && !this.menuEl.contains(e.target) && !e.target.closest('#start-button')) {
        this.close();
      }
    });

    // Живий пошук програм
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        const query = (e.target.value || '').trim().toLowerCase();
        if (!query) {
          this.renderCategories();
        } else {
          this.renderSearchResults(query);
        }
      });
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.menuEl.classList.add('visible');
    const startBtn = document.getElementById('start-button');
    if (startBtn) startBtn.classList.add('active');
    if (this.searchInput) {
      this.searchInput.value = '';
      this.searchInput.focus();
      this.renderCategories();
    }
  }

  close() {
    this.isOpen = false;
    this.menuEl.classList.remove('visible');
    const startBtn = document.getElementById('start-button');
    if (startBtn) startBtn.classList.remove('active');
  }

  renderCategories() {
    if (!this.categoriesContainerEl) return;
    this.categoriesContainerEl.innerHTML = '';

    this.categories.forEach((cat) => {
      const section = document.createElement('div');
      section.className = 'start-category-section';

      const header = document.createElement('div');
      header.className = 'start-category-header';
      header.innerHTML = `
        <span class="start-category-icon">${cat.icon}</span>
        <span class="start-category-title">${cat.title}</span>
        <span class="start-category-count">${cat.apps.length}</span>
      `;
      section.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'start-category-grid';

      cat.apps.forEach((app) => {
        const item = this.createAppItem(app);
        grid.appendChild(item);
      });

      section.appendChild(grid);
      this.categoriesContainerEl.appendChild(section);
    });
  }

  renderSearchResults(query) {
    if (!this.categoriesContainerEl) return;
    this.categoriesContainerEl.innerHTML = '';

    const filtered = this.allApps.filter((app) =>
      app.name.toLowerCase().includes(query) ||
      app.desc.toLowerCase().includes(query) ||
      app.categoryTitle.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      this.categoriesContainerEl.innerHTML = `
        <div class="start-no-results">
          <div class="start-no-results-icon">🔍</div>
          <div class="start-no-results-text">За запитом «${query}» програм не знайдено</div>
        </div>
      `;
      return;
    }

    const section = document.createElement('div');
    section.className = 'start-category-section';

    const header = document.createElement('div');
    header.className = 'start-category-header';
    header.innerHTML = `
      <span class="start-category-icon">🔍</span>
      <span class="start-category-title">Результати пошуку</span>
      <span class="start-category-count">${filtered.length}</span>
    `;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'start-category-grid';

    filtered.forEach((app) => {
      const item = this.createAppItem(app);
      grid.appendChild(item);
    });

    section.appendChild(grid);
    this.categoriesContainerEl.appendChild(section);
  }

  createAppItem(app) {
    const btn = document.createElement('div');
    btn.className = 'start-app-item';
    btn.title = `${app.name} — ${app.desc}`;
    btn.innerHTML = `
      <div class="start-app-icon" data-icon="${app.icon}"></div>
      <div class="start-app-name">${app.name}</div>
    `;

    btn.addEventListener('click', () => {
      this.close();
      eventBus.emit('app:launch', { appId: app.id });
    });

    return btn;
  }

  updateProfileCard() {
    if (!this.profileCardEl) return;
    const profile = profileManager.currentProfile;

    const avatarLetters = profile
      ? `${profile.lastName[0] || ''}${profile.firstName[0] || ''}`.toUpperCase()
      : 'У';
    const profileName = profile
      ? `${profile.lastName} ${profile.firstName}`
      : 'Учень';
    const gradeClass = profile ? `Клас: ${profile.gradeClass}` : '';

    this.profileCardEl.innerHTML = `
      <div class="profile-avatar">${avatarLetters}</div>
      <div class="profile-info">
        <div class="profile-name">${profileName}</div>
        <div class="profile-class">${gradeClass}</div>
      </div>
      <div class="start-footer-buttons">
        <button id="start-about-btn" class="start-footer-cmd" title="Про систему EduOS">
          <span class="start-cmd-icon">ℹ️</span>
          <span class="start-cmd-text">Про систему</span>
        </button>
        <button id="start-logout-btn" class="start-footer-cmd start-cmd-logout" title="Вийти з системи (змінити користувача)">
          <span class="start-cmd-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          <span class="start-cmd-text">Вийти з системи</span>
        </button>
      </div>
    `;

    const aboutBtn = this.profileCardEl.querySelector('#start-about-btn');
    if (aboutBtn) {
      aboutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
        eventBus.emit('app:launch', { appId: 'about-system' });
      });
    }

    const logoutBtn = this.profileCardEl.querySelector('#start-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.close();
        const confirmed = await dialogs.confirm(
          'Ви дійсно бажаєте вийти з системи та змінити користувача?',
          {
            title: 'Вихід із системи',
            confirmText: 'Вийти з системи',
            cancelText: 'Скасувати',
            danger: true
          }
        );
        if (confirmed) {
          profileManager.logout();
        }
      });
    }
  }
}

export const startMenu = new StartMenuManager();
