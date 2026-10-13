/**
 * StartMenuManager: Керування меню «Пуск» у стилі Windows 11 / Fluent UI
 * Включає пошук програм, закріплені застосунки та картку профілю учня.
 */
import { eventBus } from '../core/event-bus.js';
import { profileManager } from '../core/profiles.js';

class StartMenuManager {
  constructor() {
    this.menuEl = null;
    this.isOpen = false;
    this.searchInput = null;
    this.appsGridEl = null;
    this.profileCardEl = null;

    this.allApps = [
      { id: 'explorer', name: 'Провідник', desc: 'Керування файлами та папками', icon: 'explorer', category: 'system' },
      { id: 'learning-catalog', name: 'Навчальні завдання', desc: 'Практичні роботи 5-11 класів', icon: 'learning', category: 'education' },
      { id: 'task-editor', name: 'Конструктор завдань', desc: 'Створення практичних робіт', icon: 'editor', category: 'education' },
      { id: 'notepad', name: 'Блокнот', desc: 'Текстовий редактор', icon: 'notepad', category: 'accessories' },
      { id: 'paint', name: 'Paint', desc: 'Графічний редактор', icon: 'paint', category: 'accessories' },
      { id: 'archiver', name: 'Архіватор', desc: 'Робота з архівами ZIP, 7Z, TAR', icon: 'archiver', category: 'tools' },
      { id: 'cmd', name: 'Командний рядок Windows', desc: 'Консоль CMD', icon: 'cmd', category: 'terminal' },
      { id: 'bash', name: 'Термінал Linux', desc: 'Оболонка Bash', icon: 'bash', category: 'terminal' },
      { id: 'browser', name: 'Браузер', desc: 'Шкільний вебпортал', icon: 'browser', category: 'internet' },
      { id: 'settings', name: 'Налаштування', desc: 'Параметри системи', icon: 'settings', category: 'system' },
      { id: 'disk-manager', name: 'Керування дисками', desc: 'Розділи та форматування', icon: 'disk', category: 'system' },
      { id: 'task-manager', name: 'Диспетчер завдань', desc: 'Процеси та продуктивність', icon: 'tasks', category: 'system' },
      { id: 'network', name: 'Мережеве оточення', desc: 'Локальні комп\'ютери', icon: 'network', category: 'system' },
      { id: 'recycle-bin', name: 'Кошик', desc: 'Видалені файли', icon: 'recycle-bin', category: 'system' }
    ];
  }

  init(menuElement) {
    this.menuEl = menuElement || document.getElementById('start-menu');
    this.searchInput = this.menuEl.querySelector('#start-search-input');
    this.appsGridEl = this.menuEl.querySelector('#start-apps-grid');
    this.profileCardEl = this.menuEl.querySelector('#start-profile-card');

    this.setupListeners();
    this.renderApps(this.allApps);
    this.updateProfileCard();

    eventBus.on('profile:login', () => this.updateProfileCard());
    eventBus.on('profile:logout', () => this.updateProfileCard());
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
          this.renderApps(this.allApps);
        } else {
          const filtered = this.allApps.filter((app) =>
            app.name.toLowerCase().includes(query) || app.desc.toLowerCase().includes(query)
          );
          this.renderApps(filtered);
        }
      });
    }

    // Кнопка виходу з профілю
    const logoutBtn = this.menuEl.querySelector('#start-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.close();
        profileManager.logout();
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
      this.renderApps(this.allApps);
    }
  }

  close() {
    this.isOpen = false;
    this.menuEl.classList.remove('visible');
    const startBtn = document.getElementById('start-button');
    if (startBtn) startBtn.classList.remove('active');
  }

  renderApps(apps) {
    if (!this.appsGridEl) return;
    this.appsGridEl.innerHTML = '';

    const countEl = this.menuEl.querySelector('#start-category-count');
    if (countEl) {
      countEl.textContent = `${apps.length} ${apps.length === 1 ? 'програма' : (apps.length >= 2 && apps.length <= 4 ? 'програми' : 'програм')}`;
    }

    if (apps.length === 0) {
      this.appsGridEl.innerHTML = `<div class="start-no-results">Програм не знайдено</div>`;
      return;
    }

    apps.forEach((app) => {
      const btn = document.createElement('div');
      btn.className = 'start-app-item';
      btn.innerHTML = `
        <div class="start-app-icon" data-icon="${app.icon}"></div>
        <div class="start-app-name">${app.name}</div>
      `;

      btn.addEventListener('click', () => {
        this.close();
        eventBus.emit('app:launch', { appId: app.id });
      });

      this.appsGridEl.appendChild(btn);
    });
  }

  updateProfileCard() {
    if (!this.profileCardEl) return;
    const profile = profileManager.currentProfile;

    if (profile) {
      const avatarLetters = `${profile.lastName[0] || ''}${profile.firstName[0] || ''}`.toUpperCase();
      this.profileCardEl.innerHTML = `
        <div class="profile-avatar">${avatarLetters}</div>
        <div class="profile-info">
          <div class="profile-name">${profile.lastName} ${profile.firstName}</div>
          <div class="profile-class">Клас: ${profile.gradeClass}</div>
        </div>
        <button id="start-logout-btn" class="profile-power-btn" title="Змінити профіль / Вийти">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/>
          </svg>
        </button>
      `;

      const btn = this.profileCardEl.querySelector('#start-logout-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          this.close();
          profileManager.logout();
        });
      }
    }
  }
}

export const startMenu = new StartMenuManager();
