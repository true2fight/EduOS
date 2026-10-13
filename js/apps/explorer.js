/**
 * ExplorerApp: Навчальний Провідник файлів для EduOS
 * Повнофункціональний файловий менеджер із деревом дисків, адресним рядком,
 * режимами перегляду, сортуванням, пошуком, властивостями, імпортом та експортом.
 */
import { BaseApp } from './base-app.js';
import { vfs } from '../core/filesystem.js';
import { eventBus } from '../core/event-bus.js';
import { contextMenu } from '../desktop/context-menu.js';
import { dialogs } from '../core/dialogs.js';

export class ExplorerApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.currentPath = params.path || 'C:\\Користувачі\\Учень';
    this.history = [this.currentPath];
    this.historyIndex = 0;
    this.viewMode = 'medium-icons'; // 'large-icons' | 'medium-icons' | 'list' | 'details'
    this.sortBy = 'name'; // 'name' | 'type' | 'size' | 'date'
    this.sortAsc = true;
    this.searchQuery = '';
    this.selectedNodeIds = new Set();
  }

  async init() {
    this.renderLayout();
    await this.navigateTo(this.currentPath, false);

    // Слухаємо оновлення файлової системи для автооновлення
    const unsub = eventBus.on('vfs:change', () => {
      this.refresh();
    });
    this.unsubscribers.push(unsub);
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="explorer-window-layout">
        <!-- Верхня панель інструментів -->
        <div class="explorer-toolbar">
          <div class="explorer-nav-buttons">
            <button class="nav-btn btn-back" title="Назад" disabled>
              <svg width="14" height="14" viewBox="0 0 16 16"><path d="M11 2L5 8l6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <button class="nav-btn btn-forward" title="Вперед" disabled>
              <svg width="14" height="14" viewBox="0 0 16 16"><path d="M5 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <button class="nav-btn btn-up" title="Вгору">
              <svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 3l5 5H9v6H7V8H3l5-5z" fill="currentColor"/></svg>
            </button>
            <button class="nav-btn btn-refresh" title="Оновити">
              <svg width="14" height="14" viewBox="0 0 16 16"><path d="M13.6 8A5.6 5.6 0 1 1 8 2.4V1l3 2.5-3 2.5V4a4 4 0 1 0 4 4h1.6z" fill="currentColor"/></svg>
            </button>
          </div>

          <!-- Адресний рядок -->
          <div class="explorer-address-bar-wrapper">
            <div class="explorer-breadcrumbs" id="exp-breadcrumbs"></div>
            <input type="text" class="explorer-address-input" id="exp-address-input" style="display:none;" />
          </div>

          <!-- Пошук -->
          <div class="explorer-search-wrapper">
            <input type="text" class="explorer-search-input" placeholder="Пошук у папці..." id="exp-search-input" />
          </div>
        </div>

        <!-- Командна панель дій -->
        <div class="explorer-command-bar">
          <button class="cmd-btn" id="exp-cmd-new-folder">
            <span class="cmd-icon">📁</span> Нова папка
          </button>
          <button class="cmd-btn" id="exp-cmd-new-file">
            <span class="cmd-icon">📄</span> Новий файл
          </button>
          <div class="cmd-separator"></div>
          <button class="cmd-btn" id="exp-cmd-cut">Вирізати</button>
          <button class="cmd-btn" id="exp-cmd-copy">Копіювати</button>
          <button class="cmd-btn" id="exp-cmd-paste">Вставити</button>
          <button class="cmd-btn" id="exp-cmd-delete">Видалити</button>
          <div class="cmd-separator"></div>
          <button class="cmd-btn" id="exp-cmd-import" title="Імпортувати файл із вашого комп'ютера">
            <span>📥</span> Імпорт
          </button>
          <button class="cmd-btn" id="exp-cmd-export" title="Зберегти обраний файл на ваш комп'ютер">
            <span>📤</span> Експорт
          </button>
          <input type="file" id="exp-file-input" style="display:none;" />
          <div class="cmd-separator"></div>

          <!-- Режим відображення -->
          <div class="view-mode-selector">
            <button class="view-btn ${this.viewMode === 'large-icons' ? 'active' : ''}" data-mode="large-icons" title="Великі значки">▦</button>
            <button class="view-btn ${this.viewMode === 'medium-icons' ? 'active' : ''}" data-mode="medium-icons" title="Середні значки">▤</button>
            <button class="view-btn ${this.viewMode === 'list' ? 'active' : ''}" data-mode="list" title="Список">☰</button>
            <button class="view-btn ${this.viewMode === 'details' ? 'active' : ''}" data-mode="details" title="Таблиця">☷</button>
          </div>
        </div>

        <!-- Головна робоча зона: дерево + вміст -->
        <div class="explorer-main-area">
          <aside class="explorer-sidebar" id="exp-sidebar"></aside>
          <main class="explorer-content-view" id="exp-content-view"></main>
        </div>

        <!-- Рядок стану -->
        <div class="explorer-statusbar" id="exp-statusbar">
          <span id="exp-status-count">0 елементів</span>
          <span id="exp-status-selected"></span>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderSidebar();
  }

  bindEvents() {
    const btnBack = this.container.querySelector('.btn-back');
    const btnFwd = this.container.querySelector('.btn-forward');
    const btnUp = this.container.querySelector('.btn-up');
    const btnRefresh = this.container.querySelector('.btn-refresh');

    btnBack.addEventListener('click', () => this.goBack());
    btnFwd.addEventListener('click', () => this.goForward());
    btnUp.addEventListener('click', () => this.goUp());
    btnRefresh.addEventListener('click', () => this.refresh());

    // Перемикання режимів перегляду
    this.container.querySelectorAll('.view-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.viewMode = btn.dataset.mode;
        this.renderFolderContent();
      });
    });

    // Пошук
    const searchInput = this.container.querySelector('#exp-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      this.renderFolderContent();
    });

    // Адресний рядок
    const breadcrumbs = this.container.querySelector('#exp-breadcrumbs');
    const addrInput = this.container.querySelector('#exp-address-input');

    breadcrumbs.addEventListener('click', () => {
      breadcrumbs.style.display = 'none';
      addrInput.style.display = 'block';
      addrInput.value = this.currentPath;
      addrInput.focus();
      addrInput.select();
    });

    addrInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = addrInput.value.trim();
        addrInput.style.display = 'none';
        breadcrumbs.style.display = 'flex';
        this.navigateTo(val);
      } else if (e.key === 'Escape') {
        addrInput.style.display = 'none';
        breadcrumbs.style.display = 'flex';
      }
    });

    addrInput.addEventListener('blur', () => {
      addrInput.style.display = 'none';
      breadcrumbs.style.display = 'flex';
    });

    // Командні кнопки
    this.container.querySelector('#exp-cmd-new-folder').addEventListener('click', () => this.createNewFolder());
    this.container.querySelector('#exp-cmd-new-file').addEventListener('click', () => this.createNewFile());
    this.container.querySelector('#exp-cmd-cut').addEventListener('click', () => this.actionCut());
    this.container.querySelector('#exp-cmd-copy').addEventListener('click', () => this.actionCopy());
    this.container.querySelector('#exp-cmd-paste').addEventListener('click', () => this.actionPaste());
    this.container.querySelector('#exp-cmd-delete').addEventListener('click', () => this.actionDelete());

    // Імпорт та експорт
    const fileInput = this.container.querySelector('#exp-file-input');
    this.container.querySelector('#exp-cmd-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFileImport(e));
    this.container.querySelector('#exp-cmd-export').addEventListener('click', () => this.handleFileExport());
  }

  async renderSidebar() {
    const sidebar = this.container.querySelector('#exp-sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
      <div class="sidebar-section">
        <div class="sidebar-section-title">Швидкий доступ</div>
        <div class="sidebar-item" data-path="C:\\Користувачі\\Учень\\Робочий стіл"><img src="assets/icons/this-pc.svg" width="16" height="16" style="vertical-align:middle;margin-right:6px;" /> Робочий стіл</div>
        <div class="sidebar-item" data-path="C:\\Користувачі\\Учень\\Документи"><img src="assets/icons/explorer.svg" width="16" height="16" style="vertical-align:middle;margin-right:6px;" /> Документи</div>
        <div class="sidebar-item" data-path="C:\\Користувачі\\Учень\\Зображення"><img src="assets/icons/paint.svg" width="16" height="16" style="vertical-align:middle;margin-right:6px;" /> Зображення</div>
        <div class="sidebar-item" data-path="C:\\Користувачі\\Учень\\Завантаження"><img src="assets/icons/browser.svg" width="16" height="16" style="vertical-align:middle;margin-right:6px;" /> Завантаження</div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Цей комп'ютер</div>
        <div class="sidebar-item" data-path="C:\\"><img src="assets/icons/disk.svg" width="16" height="16" style="vertical-align:middle;margin-right:6px;" /> Локальний диск (C:)</div>
        <div class="sidebar-item" data-path="D:\\"><img src="assets/icons/disk.svg" width="16" height="16" style="vertical-align:middle;margin-right:6px;" /> Навчальний диск (D:)</div>
        <div class="sidebar-item" data-path="NET:\\"><img src="assets/icons/network.svg" width="16" height="16" style="vertical-align:middle;margin-right:6px;" /> Мережеве оточення</div>
        <div class="sidebar-item" data-path="Кошик"><img src="assets/icons/recycle-bin.svg" width="16" height="16" style="vertical-align:middle;margin-right:6px;" /> Кошик</div>
      </div>
    `;

    sidebar.querySelectorAll('.sidebar-item').forEach((item) => {
      item.addEventListener('click', () => {
        sidebar.querySelectorAll('.sidebar-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        this.navigateTo(item.dataset.path);
      });
    });
  }

  async navigateTo(path, recordHistory = true) {
    const targetNode = vfs.resolvePath(path);
    if (!targetNode) {
      await dialogs.alert(`Не вдалося знайти шлях: ${path}`, { icon: 'error', title: 'Провідник' });
      return;
    }

    const resolvedPath = vfs.getNodePath(targetNode.id);
    this.currentPath = resolvedPath || path;

    if (recordHistory) {
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(this.currentPath);
      this.historyIndex = this.history.length - 1;
    }

    this.updateNavButtons();
    this.updateBreadcrumbs();
    this.setTitle(`Провідник — ${targetNode.name}`);
    await this.renderFolderContent();
  }

  updateNavButtons() {
    const btnBack = this.container.querySelector('.btn-back');
    const btnFwd = this.container.querySelector('.btn-forward');
    if (btnBack) btnBack.disabled = this.historyIndex <= 0;
    if (btnFwd) btnFwd.disabled = this.historyIndex >= this.history.length - 1;
  }

  goBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.navigateTo(this.history[this.historyIndex], false);
    }
  }

  goForward() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.navigateTo(this.history[this.historyIndex], false);
    }
  }

  goUp() {
    const curr = vfs.resolvePath(this.currentPath);
    if (curr && curr.parentId) {
      const parent = vfs.getNode(curr.parentId);
      if (parent) {
        this.navigateTo(vfs.getNodePath(parent.id));
      }
    }
  }

  refresh() {
    this.renderFolderContent();
  }

  updateBreadcrumbs() {
    const bcContainer = this.container.querySelector('#exp-breadcrumbs');
    if (!bcContainer) return;
    bcContainer.innerHTML = '';

    const parts = this.currentPath.split('\\').filter(Boolean);
    let accum = '';

    parts.forEach((part, idx) => {
      accum += (idx === 0 ? part : `\\${part}`);
      const stepPath = accum.includes('\\') ? accum : `${accum}\\`;

      const crumb = document.createElement('span');
      crumb.className = 'breadcrumb-segment';
      crumb.textContent = (part === 'NET:' || part === 'NET') ? 'Мережа' : part;
      crumb.dataset.path = stepPath;

      crumb.addEventListener('click', (e) => {
        e.stopPropagation();
        this.navigateTo(stepPath);
      });

      bcContainer.appendChild(crumb);

      if (idx < parts.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-separator';
        sep.textContent = ' › ';
        bcContainer.appendChild(sep);
      }
    });
  }

  async renderFolderContent() {
    const contentEl = this.container.querySelector('#exp-content-view');
    const statusCount = this.container.querySelector('#exp-status-count');
    const statusSelected = this.container.querySelector('#exp-status-selected');
    if (!contentEl) return;

    this.selectedNodeIds.clear();
    if (statusSelected) statusSelected.textContent = '';

    const currentNode = vfs.resolvePath(this.currentPath);
    if (!currentNode) {
      contentEl.innerHTML = `<div class="explorer-empty">Каталог не знайдено</div>`;
      return;
    }

    let items = vfs.listChildren(currentNode.id);

    // Фільтрація пошуку
    if (this.searchQuery) {
      items = items.filter((item) => item.name.toLowerCase().includes(this.searchQuery.toLowerCase()));
    }

    // Сортування
    items.sort((a, b) => {
      if (a.type !== b.type) {
        if (a.type === 'directory' || a.type === 'drive') return -1;
        if (b.type === 'directory' || b.type === 'drive') return 1;
      }
      if (this.sortBy === 'name') {
        const cmp = a.name.localeCompare(b.name, 'uk', { sensitivity: 'base' });
        return this.sortAsc ? cmp : -cmp;
      }
      if (this.sortBy === 'size') {
        return this.sortAsc ? a.size - b.size : b.size - a.size;
      }
      if (this.sortBy === 'date') {
        return this.sortAsc ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
      }
      return 0;
    });

    if (statusCount) statusCount.textContent = `${items.length} елементів`;

    if (items.length === 0) {
      contentEl.innerHTML = `<div class="explorer-empty">Папка порожня</div>`;
      this.setupContextMenuOnEmpty(contentEl, currentNode);
      return;
    }

    contentEl.className = `explorer-content-view view-${this.viewMode}`;
    contentEl.innerHTML = '';

    if (this.viewMode === 'details') {
      const table = document.createElement('table');
      table.className = 'explorer-details-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th data-sort="name">Ім'я</th>
            <th data-sort="date">Дата зміни</th>
            <th data-sort="type">Тип</th>
            <th data-sort="size">Розмір</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector('tbody');
      items.forEach((item) => {
        const tr = document.createElement('tr');
        tr.className = 'explorer-file-row';
        tr.dataset.id = item.id;

        const sizeStr = item.type === 'directory' ? '' : `${Math.ceil((item.size || 0) / 1024)} КБ`;
        const dateStr = new Date(item.updatedAt).toLocaleString('uk-UA');
        const typeStr = item.metadata && item.metadata.isComputer
          ? `Мережевий комп'ютер (${item.metadata.ip || ''})`
          : (item.type === 'directory' ? 'Папка з файлами' : `${(item.extension || 'Файл').toUpperCase()}`);

        tr.innerHTML = `
          <td class="col-name"><span class="table-icon">${this.getItemIcon(item)}</span> ${item.name}</td>
          <td>${dateStr}</td>
          <td>${typeStr}</td>
          <td>${sizeStr}</td>
        `;

        this.attachItemInteractions(tr, item);
        tbody.appendChild(tr);
      });

      contentEl.appendChild(table);
    } else {
      // Режими значків
      items.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'explorer-item-card';
        card.dataset.id = item.id;
        card.innerHTML = `
          <div class="item-icon-wrapper">${this.getItemIcon(item)}</div>
          <div class="item-name" title="${item.name}">${item.name}</div>
          ${item.metadata && item.metadata.ip ? `<div class="item-ip-tag">${item.metadata.ip}</div>` : ''}
        `;

        this.attachItemInteractions(card, item);
        contentEl.appendChild(card);
      });
    }

    this.setupContextMenuOnEmpty(contentEl, currentNode);
  }

  attachItemInteractions(element, item) {
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!e.ctrlKey) {
        this.container.querySelectorAll('.explorer-item-card.selected, .explorer-file-row.selected').forEach((el) => {
          el.classList.remove('selected');
        });
        this.selectedNodeIds.clear();
      }
      element.classList.toggle('selected');
      if (element.classList.contains('selected')) {
        this.selectedNodeIds.add(item.id);
      } else {
        this.selectedNodeIds.delete(item.id);
      }
      this.updateSelectionStatus();
    });

    element.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.openItem(item);
    });

    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showItemContextMenu(item, e.clientX, e.clientY);
    });
  }

  setupContextMenuOnEmpty(container, currentNode) {
    container.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.explorer-item-card') || e.target.closest('.explorer-file-row')) return;
      e.preventDefault();

      const hasClipboard = !!window.__eduosClipboard;
      const items = [
        { label: 'Оновити', action: () => this.refresh() },
        { separator: true },
        { label: 'Створити папку', action: () => this.createNewFolder() },
        { label: 'Створити текстовий документ', action: () => this.createNewFile() },
        { separator: true },
        {
          label: 'Вставити',
          shortcut: 'Ctrl+V',
          disabled: !hasClipboard,
          action: () => this.actionPaste()
        },
        { separator: true },
        {
          label: 'Властивості папки',
          action: () => eventBus.emit('app:show_properties', { node: currentNode })
        }
      ];

      contextMenu.show(items, e.clientX, e.clientY);
    });
  }

  updateSelectionStatus() {
    const statusSelected = this.container.querySelector('#exp-status-selected');
    if (statusSelected) {
      const count = this.selectedNodeIds.size;
      statusSelected.textContent = count > 0 ? `Виділено: ${count}` : '';
    }
  }

  openItem(item) {
    if (item.type === 'directory' || item.type === 'drive') {
      this.navigateTo(vfs.getNodePath(item.id));
    } else {
      const ext = (item.extension || '').toLowerCase();
      if (['txt', 'log', 'json', 'csv', 'bat', 'sh'].includes(ext)) {
        eventBus.emit('app:launch', { appId: 'notepad', params: { fileId: item.id } });
      } else if (['png', 'jpg', 'jpeg', 'svg', 'bmp'].includes(ext)) {
        eventBus.emit('app:launch', { appId: 'image-viewer', params: { fileId: item.id } });
      } else if (['zip', '7z', 'gz'].includes(ext)) {
        eventBus.emit('app:launch', { appId: 'archiver', params: { fileId: item.id } });
      } else {
        eventBus.emit('app:launch', { appId: 'notepad', params: { fileId: item.id } });
      }
    }
  }

  showItemContextMenu(item, x, y) {
    const isTrash = this.currentPath.toLowerCase().includes('кошик');
    let menuItems = [];

    if (isTrash) {
      menuItems = [
        {
          label: 'Відновити',
          action: async () => {
            try {
              await vfs.restoreFromTrash(item.id);
            } catch (err) {
              await dialogs.alert(err.message, { icon: 'error' });
            }
          }
        },
        {
          label: 'Видалити остаточно',
          action: async () => {
            const confirmed = await dialogs.confirm(`Остаточно видалити «${item.name}»?`, {
              title: 'Остаточне видалення',
              danger: true,
              confirmText: 'Видалити',
              cancelText: 'Скасувати'
            });
            if (confirmed) {
              await vfs.deleteNode(item.id, true);
            }
          }
        }
      ];
    } else {
      menuItems = [
        { label: 'Відкрити', action: () => this.openItem(item) },
        { separator: true },
        {
          label: 'Вирізати',
          shortcut: 'Ctrl+X',
          action: () => { window.__eduosClipboard = { action: 'cut', node: item }; }
        },
        {
          label: 'Копіювати',
          shortcut: 'Ctrl+C',
          action: () => { window.__eduosClipboard = { action: 'copy', node: item }; }
        },
        { separator: true },
        {
          label: 'Перейменувати',
          shortcut: 'F2',
          action: async () => {
            const newName = await dialogs.showRenameDialog({
              currentName: item.name,
              isDirectory: item.type === 'directory'
            });
            if (newName && newName !== item.name) {
              try {
                await vfs.renameNode(item.id, newName);
              } catch (e) {
                await dialogs.alert(e.message, { icon: 'error', title: 'Перейменування' });
              }
            }
          }
        },
        {
          label: 'Видалити',
          shortcut: 'Del',
          action: () => this.actionDelete(item.id)
        },
        { separator: true },
        {
          label: 'Властивості',
          action: () => eventBus.emit('app:show_properties', { node: item })
        }
      ];
    }

    contextMenu.show(menuItems, x, y);
  }

  async createNewFolder() {
    const currentNode = vfs.resolvePath(this.currentPath);
    if (!currentNode) return;
    const name = await dialogs.showNewFolderDialog({ parentName: currentNode.name });
    if (name) {
      try {
        await vfs.createDirectory(currentNode.id, name);
      } catch (err) {
        await dialogs.alert(err.message, { icon: 'error', title: 'Створення папки' });
      }
    }
  }

  async createNewFile() {
    const currentNode = vfs.resolvePath(this.currentPath);
    if (!currentNode) return;
    const name = await dialogs.prompt('Введіть назву файлу:', 'Текстовий документ.txt', {
      title: 'Створення нового файлу'
    });
    if (name) {
      try {
        await vfs.createFile(currentNode.id, name, '');
      } catch (err) {
        await dialogs.alert(err.message, { icon: 'error', title: 'Створення файлу' });
      }
    }
  }

  actionCut() {
    if (this.selectedNodeIds.size === 0) return;
    const id = Array.from(this.selectedNodeIds)[0];
    const node = vfs.getNode(id);
    if (node) {
      window.__eduosClipboard = { action: 'cut', node };
    }
  }

  actionCopy() {
    if (this.selectedNodeIds.size === 0) return;
    const id = Array.from(this.selectedNodeIds)[0];
    const node = vfs.getNode(id);
    if (node) {
      window.__eduosClipboard = { action: 'copy', node };
    }
  }

  async actionPaste() {
    if (!window.__eduosClipboard) return;
    const currentNode = vfs.resolvePath(this.currentPath);
    if (!currentNode) return;

    const { action, node } = window.__eduosClipboard;
    try {
      if (action === 'cut') {
        await vfs.moveNode(node.id, currentNode.id);
        window.__eduosClipboard = null;
      } else if (action === 'copy') {
        await vfs.copyNode(node.id, currentNode.id);
      }
    } catch (err) {
      await dialogs.alert(err.message, { icon: 'error', title: 'Помилка вставки' });
    }
  }

  async actionDelete(specificId = null) {
    const ids = specificId ? [specificId] : Array.from(this.selectedNodeIds);
    if (ids.length === 0) return;

    const confirmed = await dialogs.confirm(
      `Ви дійсно бажаєте видалити ${ids.length} елемент(ів) у Кошик?`,
      { title: 'Видалення до Кошика', danger: true, confirmText: 'Видалити', cancelText: 'Скасувати' }
    );
    if (confirmed) {
      for (const id of ids) {
        try {
          await vfs.deleteNode(id, false);
        } catch (err) {
          await dialogs.alert(err.message, { icon: 'error' });
        }
      }
    }
  }

  async handleFileImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const currentNode = vfs.resolvePath(this.currentPath);
    if (!currentNode) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target.result;
        await vfs.createFile(currentNode.id, file.name, content);
      } catch (err) {
        await dialogs.alert(`Помилка імпорту: ${err.message}`, { icon: 'error', title: 'Імпорт файлу' });
      }
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  }

  async handleFileExport() {
    if (this.selectedNodeIds.size === 0) {
      await dialogs.alert('Будь ласка, виділіть файл для експорту.', { icon: 'warning', title: 'Експорт' });
      return;
    }
    const id = Array.from(this.selectedNodeIds)[0];
    const node = vfs.getNode(id);
    if (!node || node.type !== 'file') {
      await dialogs.alert('Експортувати можна лише файли.', { icon: 'warning', title: 'Експорт' });
      return;
    }

    const blob = new Blob([node.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = node.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getItemIcon(item) {
    if (item.metadata && (item.metadata.isComputer || item.metadata.ip)) {
      if (item.metadata.role === 'server') {
        return `<img src="assets/icons/network.svg" alt="" width="26" height="26" style="vertical-align:middle;pointer-events:none;" />`;
      }
      return `<img src="assets/icons/this-pc.svg" alt="" width="26" height="26" style="vertical-align:middle;pointer-events:none;" />`;
    }
    if (item.type === 'drive') {
      if (item.metadata && item.metadata.driveLetter === 'NET:') {
        return `<img src="assets/icons/network.svg" alt="" width="26" height="26" style="vertical-align:middle;pointer-events:none;" />`;
      }
      return `<img src="assets/icons/disk.svg" alt="" width="26" height="26" style="vertical-align:middle;pointer-events:none;" />`;
    }
    if (item.type === 'directory') {
      return `<img src="assets/icons/explorer.svg" alt="" width="26" height="26" style="vertical-align:middle;pointer-events:none;" />`;
    }

    const ext = (item.extension || '').toLowerCase();
    if (['txt', 'log', 'csv', 'json', 'bat', 'sh'].includes(ext)) {
      return `<img src="assets/icons/notepad.svg" alt="" width="26" height="26" style="vertical-align:middle;pointer-events:none;" />`;
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'bmp', 'webp'].includes(ext)) {
      return `<img src="assets/icons/paint.svg" alt="" width="26" height="26" style="vertical-align:middle;pointer-events:none;" />`;
    }
    if (['zip', '7z', 'gz', 'tar'].includes(ext)) {
      return `<img src="assets/icons/archiver.svg" alt="" width="26" height="26" style="vertical-align:middle;pointer-events:none;" />`;
    }
    return `<img src="assets/icons/notepad.svg" alt="" width="26" height="26" style="vertical-align:middle;pointer-events:none;" />`;
  }
}
