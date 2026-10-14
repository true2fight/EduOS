/**
 * App (System Bootstrap): Головний координатор запуску системи EduOS
 * Ініціалізує сховище, профіль учня, ядро VFS, графічну оболонку та реєстр програм.
 */
import { storage } from './storage.js';
import { profileManager } from './profiles.js';
import { vfs } from './filesystem.js';
import { windowManager } from './window-manager.js';
import { eventBus } from './event-bus.js';
import { desktop } from '../desktop/desktop.js';
import { taskbar } from '../desktop/taskbar.js';
import { startMenu } from '../desktop/start-menu.js';
import { contextMenu } from '../desktop/context-menu.js';
import { taskEngine } from '../learning/task-engine.js';
import { inputLanguage } from './input-language.js';
import { dialogs } from './dialogs.js';

// Імпорт додатків
import { ExplorerApp } from '../apps/explorer.js';
import { NotepadApp } from '../apps/notepad.js';
import { PaintApp } from '../apps/paint.js';
import { ArchiverApp } from '../apps/archiver.js';
import { RecycleBinApp } from '../apps/recycle-bin.js';
import { ImageViewerApp } from '../apps/image-viewer.js';
import { CmdApp } from '../apps/cmd.js';
import { BashApp } from '../apps/bash.js';
import { SettingsApp } from '../apps/settings.js';
import { DiskManagerApp } from '../apps/disk-manager.js';
import { TaskManagerApp } from '../apps/task-manager.js';
import { NetworkApp } from '../apps/network.js';
import { BrowserApp } from '../apps/browser.js';
import { TaskCatalogApp } from '../learning/task-catalog.js';
import { PackageEditorApp } from '../editor/package-editor.js';
import { AboutSystemApp } from '../apps/about-system.js';

class EduOSBootstrap {
  constructor() {
    this.appsRegistry = new Map();
    this.loginScreenEl = null;
    this.desktopShellEl = null;
  }

  async start() {
    console.log('[EduOS] Starting Virtual Operating System v2.0...');

    // 1. Ініціалізація сховища
    await storage.init();

    this.loginScreenEl = document.getElementById('login-screen');
    this.desktopShellEl = document.getElementById('desktop-shell');

    // 2. Реєстрація прикладних програм
    this.registerApplications();

    // 3. Ініціалізація сервісів інтерфейсу
    windowManager.init(document.getElementById('windows-container'));
    contextMenu.init();
    taskEngine.init();
    inputLanguage.init();

    // 4. Підписка на системні події
    this.setupSystemEvents();

    // 5. Перевірка наявності останнього активного профілю
    const lastProfile = await profileManager.getLastProfile();
    if (lastProfile) {
      this.populateLoginScreen(lastProfile);
    } else {
      this.showLoginScreen();
    }
    window.__eduosBootstrapReady = true;
    window.__eduosEventBus = eventBus;
    window.__eduosDialogs = dialogs;
    window.__eduosWindowManager = windowManager;
    window.__eduosProfileManager = profileManager;
    eventBus.emit('system:ready');
  }

  registerApplications() {
    this.appsRegistry.set('explorer', {
      title: 'Провідник',
      icon: 'explorer',
      width: 820,
      height: 520,
      createApp: (win, params) => new ExplorerApp(win, params)
    });

    this.appsRegistry.set('notepad', {
      title: 'Блокнот',
      icon: 'notepad',
      width: 640,
      height: 440,
      createApp: (win, params) => new NotepadApp(win, params)
    });

    this.appsRegistry.set('paint', {
      title: 'Paint',
      icon: 'paint',
      width: 740,
      height: 520,
      createApp: (win, params) => new PaintApp(win, params)
    });

    this.appsRegistry.set('archiver', {
      title: 'Архіватор',
      icon: 'archiver',
      width: 680,
      height: 440,
      createApp: (win, params) => new ArchiverApp(win, params)
    });

    this.appsRegistry.set('recycle-bin', {
      title: 'Кошик',
      icon: 'recycle-bin',
      width: 720,
      height: 440,
      createApp: (win, params) => new RecycleBinApp(win, params)
    });

    this.appsRegistry.set('image-viewer', {
      title: 'Переглядач зображень',
      icon: 'image-viewer',
      width: 680,
      height: 480,
      createApp: (win, params) => new ImageViewerApp(win, params)
    });

    this.appsRegistry.set('cmd', {
      title: 'Командний рядок (CMD)',
      icon: 'cmd',
      width: 680,
      height: 420,
      createApp: (win, params) => new CmdApp(win, params)
    });

    this.appsRegistry.set('bash', {
      title: 'Термінал Linux (Bash)',
      icon: 'bash',
      width: 680,
      height: 420,
      createApp: (win, params) => new BashApp(win, params)
    });

    this.appsRegistry.set('settings', {
      title: 'Налаштування',
      icon: 'settings',
      width: 760,
      height: 500,
      createApp: (win, params) => new SettingsApp(win, params)
    });

    this.appsRegistry.set('disk-manager', {
      title: 'Керування дисками',
      icon: 'disk',
      width: 720,
      height: 420,
      createApp: (win, params) => new DiskManagerApp(win, params)
    });

    this.appsRegistry.set('task-manager', {
      title: 'Диспетчер завдань',
      icon: 'tasks',
      width: 640,
      height: 440,
      createApp: (win, params) => new TaskManagerApp(win, params)
    });

    this.appsRegistry.set('network', {
      title: 'Мережеве оточення',
      icon: 'network',
      width: 700,
      height: 460,
      createApp: (win, params) => new NetworkApp(win, params)
    });

    this.appsRegistry.set('browser', {
      title: 'Браузер',
      icon: 'browser',
      width: 840,
      height: 540,
      createApp: (win, params) => new BrowserApp(win, params)
    });

    this.appsRegistry.set('learning-catalog', {
      title: 'Навчальні завдання',
      icon: 'learning',
      width: 860,
      height: 560,
      createApp: (win, params) => new TaskCatalogApp(win, params)
    });

    this.appsRegistry.set('task-editor', {
      title: 'Конструктор навчальних завдань',
      icon: 'editor',
      width: 880,
      height: 580,
      createApp: (win, params) => new PackageEditorApp(win, params)
    });

    this.appsRegistry.set('about-system', {
      title: 'Про систему EduOS',
      icon: 'about-system',
      width: 540,
      height: 420,
      isDialog: true,
      canMaximize: false,
      isResizable: false,
      createApp: (win, params) => new AboutSystemApp(win, params)
    });
  }

  setupSystemEvents() {
    // Запуск програм
    eventBus.on('app:launch', (payload) => this.launchApp(payload.appId, payload.params));

    // Властивості об'єкта
    eventBus.on('app:show_properties', (payload) => this.showPropertiesDialog(payload.node));

    // Зміна профілю
    eventBus.on('profile:login', async (profile) => {
      this.loginScreenEl.style.display = 'none';
      this.desktopShellEl.style.display = 'block';

      await vfs.initForProfile(profile.profileId);
      desktop.init();
      taskbar.init();
      startMenu.init();
      inputLanguage.init();
    });

    eventBus.on('profile:logout', () => {
      // Закриваємо всі вікна
      windowManager.getAllWindows().forEach((w) => windowManager.closeWindow(w.id));
      this.desktopShellEl.style.display = 'none';
      this.showLoginScreen();
    });
  }

  launchApp(appId, params = {}) {
    const reg = this.appsRegistry.get(appId);
    if (!reg) {
      console.warn(`[EduOS] Unknown app ID: ${appId}`);
      return;
    }

    const win = windowManager.createWindow({
      appId,
      title: reg.title,
      icon: reg.icon,
      width: reg.width,
      height: reg.height,
      isDialog: reg.isDialog,
      canMaximize: reg.canMaximize,
      isResizable: reg.isResizable,
      params
    });

    const appInstance = reg.createApp(win, params);
    win.appInstance = appInstance;
    appInstance.init();
    return win;
  }

  showPropertiesDialog(node) {
    if (!node) return;
    const sizeStr = node.type === 'directory' ? 'Папка' : `${Math.ceil((node.size || 0) / 1024)} КБ (${node.size || 0} байтів)`;
    const createdDate = new Date(node.createdAt).toLocaleString('uk-UA');
    const updatedDate = new Date(node.updatedAt).toLocaleString('uk-UA');

    const modal = document.createElement('div');
    modal.className = 'edu-modal-overlay';
    modal.innerHTML = `
      <div class="properties-modal acrylic-panel">
        <div class="prop-header">
          <h3>Властивості: ${node.name}</h3>
          <button class="prop-close">✕</button>
        </div>
        <div class="prop-body">
          <div class="prop-row"><span>Тип об'єкта:</span><strong>${node.type.toUpperCase()}</strong></div>
          <div class="prop-row"><span>Розташування:</span><span>${vfs.getNodePath(node.id)}</span></div>
          <div class="prop-row"><span>Розмір:</span><span>${sizeStr}</span></div>
          <div class="prop-row"><span>Створено:</span><span>${createdDate}</span></div>
          <div class="prop-row"><span>Змінено:</span><span>${updatedDate}</span></div>
          <hr class="prop-divider"/>
          <div class="prop-attributes-group">
            <label><strong>Атрибути:</strong></label>
            <label class="prop-check-label">
              <input type="checkbox" id="prop-attr-readonly" ${node.attributes.readonly ? 'checked' : ''} />
              <span>Лише для читання (Read-only)</span>
            </label>
            <label class="prop-check-label">
              <input type="checkbox" id="prop-attr-hidden" ${node.attributes.hidden ? 'checked' : ''} />
              <span>Прихований (Hidden)</span>
            </label>
          </div>
        </div>
        <div class="prop-footer">
          <button class="prop-btn-ok" id="prop-btn-ok">ОК</button>
          <button class="prop-btn-cancel" id="prop-btn-cancel">Скасувати</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelector('.prop-close').addEventListener('click', close);
    modal.querySelector('#prop-btn-cancel').addEventListener('click', close);

    modal.querySelector('#prop-btn-ok').addEventListener('click', async () => {
      const ro = modal.querySelector('#prop-attr-readonly').checked;
      const hid = modal.querySelector('#prop-attr-hidden').checked;
      await vfs.setAttributes(node.id, { readonly: ro, hidden: hid });
      close();
    });
  }

  showLoginScreen() {
    this.loginScreenEl.style.display = 'flex';
    this.renderProfilesList();
    this.bindLoginScreen();
  }

  populateLoginScreen(profile) {
    this.showLoginScreen();
    document.getElementById('login-lastname').value = profile.lastName || '';
    document.getElementById('login-firstname').value = profile.firstName || '';
    document.getElementById('login-grade').value = profile.gradeClass || '6-А';
  }

  async renderProfilesList() {
    const listEl = document.getElementById('login-saved-profiles');
    if (!listEl) return;
    listEl.innerHTML = '';

    const profiles = await profileManager.listProfiles();
    if (profiles.length === 0) {
      listEl.style.display = 'none';
      return;
    }

    listEl.style.display = 'block';
    listEl.innerHTML = `<h4>Збережені профілі в цьому браузері:</h4><div class="profiles-chips-row"></div>`;
    const chipsRow = listEl.querySelector('.profiles-chips-row');

    profiles.forEach((p) => {
      const chip = document.createElement('button');
      chip.className = 'profile-chip';
      chip.textContent = `${p.lastName} ${p.firstName} (${p.gradeClass})`;
      chip.addEventListener('click', () => {
        document.getElementById('login-lastname').value = p.lastName;
        document.getElementById('login-firstname').value = p.firstName;
        document.getElementById('login-grade').value = p.gradeClass;
      });
      chipsRow.appendChild(chip);
    });
  }

  bindLoginScreen() {
    const form = document.getElementById('login-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const lName = document.getElementById('login-lastname').value.trim();
      const fName = document.getElementById('login-firstname').value.trim();
      const gClass = document.getElementById('login-grade').value.trim();

      try {
        await profileManager.login(lName, fName, gClass);
      } catch (err) {
        await dialogs.alert(err.message, { icon: 'error', title: 'Помилка входу' });
      }
    };
  }
}

// Запуск системи при завантаженні DOM
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    const os = new EduOSBootstrap();
    os.start();
  });
} else {
  const os = new EduOSBootstrap();
  os.start();
}

