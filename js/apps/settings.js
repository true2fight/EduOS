/**
 * SettingsApp: Панель системних налаштувань EduOS
 * Дозволяє змінювати персоналізацію (шпалери, темна/світла тема), переглядати
 * інформацію про систему, керувати сховищем та профілем.
 */
import { BaseApp } from './base-app.js';
import { profileManager } from '../core/profiles.js';
import { vfs } from '../core/filesystem.js';
import { auditLogger } from '../core/audit-log.js';
import { dialogs } from '../core/dialogs.js';

export class SettingsApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.activeTab = params.tab || 'personalization';
  }

  async init() {
    this.renderLayout();
    this.selectTab(this.activeTab);
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="settings-layout">
        <!-- Бокова панель категорій -->
        <aside class="settings-sidebar">
          <div class="settings-nav-item active" data-tab="personalization">
            <span>🎨</span> Персоналізація
          </div>
          <div class="settings-nav-item" data-tab="system">
            <span>💻</span> Система
          </div>
          <div class="settings-nav-item" data-tab="storage">
            <span>💾</span> Сховище
          </div>
          <div class="settings-nav-item" data-tab="account">
            <span>👤</span> Обліковий запис
          </div>
        </aside>

        <!-- Основна робоча панель контенту -->
        <main class="settings-content-pane" id="settings-content"></main>
      </div>
    `;

    this.bindEvents();
    this.setTitle('Налаштування операційної системи');
  }

  bindEvents() {
    this.container.querySelectorAll('.settings-nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.container.querySelectorAll('.settings-nav-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        this.selectTab(item.dataset.tab);
      });
    });
  }

  selectTab(tabName) {
    this.activeTab = tabName;
    const content = this.container.querySelector('#settings-content');
    if (!content) return;

    if (tabName === 'personalization') {
      this.renderPersonalization(content);
    } else if (tabName === 'system') {
      this.renderSystem(content);
    } else if (tabName === 'storage') {
      this.renderStorage(content);
    } else if (tabName === 'account') {
      this.renderAccount(content);
    }
  }

  renderPersonalization(container) {
    const profile = profileManager.currentProfile;
    const currentTheme = profile && profile.settings ? profile.settings.theme : 'dark';

    container.innerHTML = `
      <div class="settings-section">
        <h2>Персоналізація</h2>
        <p class="settings-desc">Налаштуйте зовнішній вигляд робочого столу та тему оформлення.</p>

        <div class="settings-card">
          <h3>Тема оформлення</h3>
          <div class="settings-radio-group">
            <label class="radio-label">
              <input type="radio" name="set-theme" value="dark" ${currentTheme === 'dark' ? 'checked' : ''} />
              <span>🌙 Темна тема (Fluent Dark)</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="set-theme" value="light" ${currentTheme === 'light' ? 'checked' : ''} />
              <span>☀️ Світла тема (Fluent Light)</span>
            </label>
          </div>
        </div>

        <div class="settings-card">
          <h3>Фонове зображення (Шпалери)</h3>
          <div class="wallpapers-grid">
            <div class="wallpaper-thumb" data-wp="assets/wallpapers/default_fluent.jpg">
              <div class="wp-preview" style="background-image:url('assets/wallpapers/default_fluent.jpg')"></div>
              <span>Темний шовк</span>
            </div>
            <div class="wallpaper-thumb" data-wp="assets/wallpapers/light_fluent.jpg">
              <div class="wp-preview" style="background-image:url('assets/wallpapers/light_fluent.jpg')"></div>
              <span>Світлий кристал</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Зміна теми
    container.querySelectorAll('input[name="set-theme"]').forEach((radio) => {
      radio.addEventListener('change', async (e) => {
        const theme = e.target.value;
        await profileManager.updateSettings({ theme });
        await auditLogger.log('setting_changed', { category: 'personalization', theme });
      });
    });

    // Зміна шпалер
    container.querySelectorAll('.wallpaper-thumb').forEach((thumb) => {
      thumb.addEventListener('click', async () => {
        const wp = thumb.dataset.wp;
        await profileManager.updateSettings({ wallpaper: wp });
        await auditLogger.log('setting_changed', { category: 'personalization', wallpaper: wp });
      });
    });
  }

  renderSystem(container) {
    container.innerHTML = `
      <div class="settings-section">
        <h2>Про систему</h2>
        <div class="settings-card">
          <table class="system-specs-table">
            <tr><td>Операційна система:</td><td><strong>EduOS v2.0 Education Edition</strong></td></tr>
            <tr><td>Архітектура:</td><td>x64 Web-Virtual Engine</td></tr>
            <tr><td>Віртуальний процесор:</td><td>4 Cores Virtual CPU @ 3.2 GHz</td></tr>
            <tr><td>Пам'ять (RAM):</td><td>8.00 ГБ Віртуальної пам'яті</td></tr>
            <tr><td>Роздільна здатність:</td><td>${window.innerWidth} x ${window.innerHeight} пікселів</td></tr>
            <tr><td>Платформа хостингу:</td><td>GitHub Pages (Client-Side Vanilla JS)</td></tr>
          </table>
        </div>
      </div>
    `;
  }

  renderStorage(container) {
    const nodeCount = vfs.nodes.size;
    let totalBytes = 0;
    vfs.nodes.forEach((n) => totalBytes += (n.size || 0));

    container.innerHTML = `
      <div class="settings-section">
        <h2>Керування сховищем</h2>
        <div class="settings-card">
          <h3>Статистика віртуальної файлової системи</h3>
          <p>Всього вузлів у базі (IndexedDB): <strong>${nodeCount}</strong></p>
          <p>Загальний обсяг даних файлів: <strong>${Math.ceil(totalBytes / 1024)} КБ</strong></p>
          <div class="settings-actions">
            <button class="settings-danger-btn" id="set-btn-reset-vfs">Скинути файлову систему до початкового стану</button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#set-btn-reset-vfs').addEventListener('click', async () => {
      const confirmed = await dialogs.confirm(
        'УВАГА: Це скине файлову систему, очистить диск D: та відновить початкову структуру папок.\nПродовжити?',
        { title: 'Скидання файлової системи', danger: true, confirmText: 'Скинути', cancelText: 'Скасувати' }
      );
      if (confirmed) {
        const profile = profileManager.currentProfile;
        if (profile) {
          await vfs.formatDisk('D:');
          await dialogs.alert('Файлову систему оновлено до початкового стану.', { icon: 'success', title: 'Налаштування' });
          this.renderStorage(container);
        }
      }
    });
  }

  renderAccount(container) {
    const profile = profileManager.currentProfile;
    if (!profile) return;

    container.innerHTML = `
      <div class="settings-section">
        <h2>Обліковий запис</h2>
        <div class="settings-card">
          <p><strong>Прізвище:</strong> ${profile.lastName}</p>
          <p><strong>Ім'я:</strong> ${profile.firstName}</p>
          <p><strong>Клас:</strong> ${profile.gradeClass}</p>
          <p><strong>Ідентифікатор:</strong> ${profile.profileId}</p>
        </div>
      </div>
    `;
  }
}
