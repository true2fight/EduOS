/**
 * NetworkApp: Мережеве оточення для EduOS
 * Моделює локальну комп'ютерну мережу класу, 6 навчальних віртуальних комп'ютерів
 * (Teacher, Library, Server, PC-01, PC-02, PC-03), спільні мережеві ресурси та утиліту Ping.
 */
import { BaseApp } from './base-app.js';
import { eventBus } from '../core/event-bus.js';

export class NetworkApp extends BaseApp {
  constructor(win, params) {
    super(win, params);

    this.devices = [
      {
        id: 'teacher',
        name: 'Teacher',
        label: 'Комп\'ютер вчителя',
        ip: '192.168.1.10',
        unc: '\\\\Teacher',
        icon: '👩‍🏫',
        iconSvg: 'assets/icons/this-pc.svg',
        role: 'Робоче місце викладача',
        desc: 'Спільні папки завдань, критеріїв оцінювання та інструкцій',
        path: 'NET:\\Teacher',
        sharedFolders: ['Завдання_та_інструкції', 'Спільна_папка_Вчителя']
      },
      {
        id: 'library',
        name: 'Library',
        label: 'Комп\'ютер бібліотеки',
        ip: '192.168.1.20',
        unc: '\\\\Library',
        icon: '📚',
        iconSvg: 'assets/icons/browser.svg',
        role: 'Шкільна медіатека',
        desc: 'Каталог електронних підручників та енциклопедії',
        path: 'NET:\\Library',
        sharedFolders: ['Електронні_книги', 'Медіатека']
      },
      {
        id: 'server',
        name: 'Server',
        label: 'Шкільний загальний сервер',
        ip: '192.168.1.1',
        unc: '\\\\Server',
        icon: '🗄️',
        iconSvg: 'assets/icons/network.svg',
        role: 'Центральний файловий сервер',
        desc: 'Спільні підручники, рекомендоване ПЗ та загальний обмін',
        path: 'NET:\\Server',
        sharedFolders: ['Спільні_ресурси', 'Загальний_обмін']
      },
      {
        id: 'pc01',
        name: 'PC-01',
        label: 'Учнівський ПК 1',
        ip: '192.168.1.101',
        unc: '\\\\PC-01',
        icon: '💻',
        iconSvg: 'assets/icons/this-pc.svg',
        role: 'Навчальне місце №1',
        desc: 'Спільні проєкти та документи учнівської групи 1',
        path: 'NET:\\PC-01',
        sharedFolders: ['Спільні_документи']
      },
      {
        id: 'pc02',
        name: 'PC-02',
        label: 'Учнівський ПК 2',
        ip: '192.168.1.102',
        unc: '\\\\PC-02',
        icon: '💻',
        iconSvg: 'assets/icons/this-pc.svg',
        role: 'Навчальне місце №2',
        desc: 'Спільні презентації та звіти учнівської групи 2',
        path: 'NET:\\PC-02',
        sharedFolders: ['Спільні_документи']
      },
      {
        id: 'pc03',
        name: 'PC-03',
        label: 'Учнівський ПК 3',
        ip: '192.168.1.103',
        unc: '\\\\PC-03',
        icon: '💻',
        iconSvg: 'assets/icons/this-pc.svg',
        role: 'Навчальне місце №3',
        desc: 'Звіти практичних робіт учнівського місця №3',
        path: 'NET:\\PC-03',
        sharedFolders: ['Спільні_документи']
      }
    ];
  }

  async init() {
    this.renderLayout();
    this.setTitle('Мережа — Локальна мережа комп\'ютерного класу');
  }

  renderLayout() {
    const devicesHtml = this.devices.map((dev) => `
      <div class="network-card" data-device="${dev.id}" data-path="${dev.path}" data-ip="${dev.ip}" role="button" tabindex="0">
        <div class="net-card-top">
          <span class="net-status-pill online"><span class="net-status-dot"></span> В мережі</span>
          <span class="net-ip-badge" title="Віртуальна IP-адреса">${dev.ip}</span>
        </div>
        <div class="net-icon-box">
          <img src="${dev.iconSvg}" width="42" height="42" alt="${dev.name}" class="net-device-img" />
        </div>
        <div class="net-title">${dev.name}</div>
        <div class="net-label">${dev.label}</div>
        <div class="net-unc-tag" title="Шлях UNC для Провідника">${dev.unc}</div>
        <div class="net-desc">${dev.desc}</div>
        <div class="net-folders-preview">
          ${dev.sharedFolders.map(f => `<span class="net-folder-chip">📁 ${f}</span>`).join('')}
        </div>
        <button class="net-open-btn" data-path="${dev.path}">
          <span>📂 Відкрити ресурси</span>
        </button>
      </div>
    `).join('');

    this.container.innerHTML = `
      <div class="network-layout">
        <div class="network-header acrylic-panel">
          <div class="net-header-info">
            <h3>🌐 Локальна мережа віртуального класу</h3>
            <p>Робоча група: <strong>SCHOOL-NET</strong> &bull; Підмережа: <strong>192.168.1.0/24</strong> &bull; Підключено комп'ютерів: <strong>6</strong></p>
          </div>
          <div class="net-header-actions">
            <button class="net-browse-root-btn" id="net-open-all-shares">
              <img src="assets/icons/explorer.svg" width="16" height="16" alt="" />
              <span>Переглянути всі спільні папки (NET:\\)</span>
            </button>
          </div>
        </div>

        <div class="network-devices-grid">
          ${devicesHtml}
        </div>

        <!-- Ping утиліта -->
        <div class="network-ping-box">
          <div class="ping-box-header">
            <h4>📡 Діагностика мережевого з'єднання (Ping)</h4>
            <span class="ping-help-text">Перевірте зв'язок із будь-яким комп'ютером за іменем або IP-адресою</span>
          </div>
          <div class="ping-quick-buttons">
            <span class="ping-quick-label">Швидкий вибір:</span>
            ${this.devices.map(d => `<button class="ping-pill-btn" data-target="${d.ip}">${d.name} (${d.ip})</button>`).join('')}
          </div>
          <div class="ping-input-row">
            <input type="text" id="ping-target" value="192.168.1.1" placeholder="IP-адреса (наприклад, 192.168.1.10) або ім'я (Teacher, Server, PC-01)..." />
            <button id="ping-run-btn">🚀 Перевірити зв'язок</button>
          </div>
          <div class="ping-output" id="ping-output">Виберіть комп'ютер вище або введіть його адресу та натисніть «Перевірити зв'язок».</div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Відкриття ресурсів окремого комп'ютера
    this.container.querySelectorAll('.network-card').forEach((card) => {
      const path = card.dataset.path;

      // Клік по кнопці
      const btn = card.querySelector('.net-open-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          eventBus.emit('app:launch', { appId: 'explorer', params: { path } });
        });
      }

      // Клік або подвійний клік по самій картці
      card.addEventListener('click', () => {
        eventBus.emit('app:launch', { appId: 'explorer', params: { path } });
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          eventBus.emit('app:launch', { appId: 'explorer', params: { path } });
        }
      });
    });

    // Кнопка відкриття всього кореня мережі NET:\
    const openAllBtn = this.container.querySelector('#net-open-all-shares');
    if (openAllBtn) {
      openAllBtn.addEventListener('click', () => {
        eventBus.emit('app:launch', { appId: 'explorer', params: { path: 'NET:\\' } });
      });
    }

    // Ping утиліта
    const pingBtn = this.container.querySelector('#ping-run-btn');
    const pingOutput = this.container.querySelector('#ping-output');
    const pingTarget = this.container.querySelector('#ping-target');

    // Кнопки швидкого вибору
    this.container.querySelectorAll('.ping-pill-btn').forEach((pBtn) => {
      pBtn.addEventListener('click', () => {
        pingTarget.value = pBtn.dataset.target;
        this.runPing(pingTarget.value, pingOutput);
      });
    });

    pingBtn.addEventListener('click', () => {
      const target = pingTarget.value.trim() || '192.168.1.1';
      this.runPing(target, pingOutput);
    });

    pingTarget.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const target = pingTarget.value.trim() || '192.168.1.1';
        this.runPing(target, pingOutput);
      }
    });
  }

  runPing(target, outputEl) {
    outputEl.textContent = `Обмін пакетами з ${target} за 32 байтами даних:\n`;

    let step = 1;
    const interval = setInterval(() => {
      const ms = Math.floor(Math.random() * 6) + 1;
      outputEl.textContent += `Відповідь від ${target}: число байтів=32 час=${ms}мс TTL=64\n`;
      step++;
      if (step > 4) {
        clearInterval(interval);
        outputEl.textContent += `\nСтатистика Ping для ${target}:\n    Пакетів: надіслано = 4, отримано = 4, втрачено = 0 (0% втрат).\nВузол доступний у мережі класу SCHOOL-NET та готовий до роботи.`;
      }
    }, 280);
  }
}
