/**
 * DesktopManager: Керування робочим столом EduOS
 * Відображає системні та користувацькі значки, реалізує гумове виділення (Rubberband Selection),
 * шпалери та контекстне меню робочого столу.
 */
import { vfs } from '../core/filesystem.js';
import { eventBus } from '../core/event-bus.js';
import { contextMenu } from './context-menu.js';
import { profileManager } from '../core/profiles.js';
import { dialogs } from '../core/dialogs.js';

class DesktopManager {
  constructor() {
    this.container = null;
    this.wallpaperEl = null;
    this.iconsGridEl = null;
    this.selectionBoxEl = null;
    this.selectedIcons = new Set();
    this.iconPositions = {};
    this.isInitialized = false;
  }

  loadIconPositions() {
    const profile = profileManager.currentProfile;
    const key = `eduos_desktop_pos_${profile ? profile.profileId : 'default'}`;
    try {
      const saved = localStorage.getItem(key);
      this.iconPositions = saved ? JSON.parse(saved) : {};
    } catch {
      this.iconPositions = {};
    }
  }

  saveIconPositions() {
    const profile = profileManager.currentProfile;
    const key = `eduos_desktop_pos_${profile ? profile.profileId : 'default'}`;
    try {
      localStorage.setItem(key, JSON.stringify(this.iconPositions));
    } catch {}
  }

  resetIconPositions() {
    this.iconPositions = {};
    this.saveIconPositions();
    this.renderIcons();
  }

  init(containerElement) {
    this.container = containerElement || document.getElementById('desktop');
    this.wallpaperEl = document.getElementById('desktop-wallpaper');
    this.iconsGridEl = document.getElementById('desktop-icons');

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.setupRubberbandSelection();
      this.setupDesktopContextMenu();

      // Підписка на оновлення VFS та налаштувань
      eventBus.on('vfs:change', () => this.renderIcons());
      eventBus.on('vfs:ready', () => this.renderIcons());
      eventBus.on('settings:updated', () => this.applyWallpaper());
      eventBus.on('profile:login', () => {
        this.loadIconPositions();
        this.renderIcons();
      });
    }

    this.applyWallpaper();
    this.loadIconPositions();
    this.renderIcons();
  }

  applyWallpaper() {
    if (!this.wallpaperEl) return;
    const settings = profileManager.currentProfile ? profileManager.currentProfile.settings : null;
    const wallpaperUrl = settings && settings.wallpaper
      ? settings.wallpaper
      : 'assets/wallpapers/default_fluent.jpg';

    this.wallpaperEl.style.backgroundImage = `url("${wallpaperUrl}")`;

    // Застосування теми
    const theme = settings && settings.theme ? settings.theme : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }

  async getDesktopItems() {
    // 1. Системні постійні значки (Цей комп'ютер, Мережа, Кошик)
    const systemShortcuts = [
      {
        id: 'sys_this_pc',
        isSystem: true,
        name: 'Цей комп\'ютер',
        appId: 'explorer',
        iconType: 'this-pc',
        action: () => eventBus.emit('app:launch', { appId: 'explorer' })
      },
      {
        id: 'sys_network',
        isSystem: true,
        name: 'Мережа',
        appId: 'network',
        iconType: 'network',
        action: () => eventBus.emit('app:launch', { appId: 'network' })
      },
      {
        id: 'sys_recycle_bin',
        isSystem: true,
        name: 'Кошик',
        appId: 'recycle-bin',
        iconType: 'recycle-bin',
        action: () => eventBus.emit('app:launch', { appId: 'recycle-bin' })
      }
    ];

    // 2. Реальні файли та папки з каталогу робочого столу
    const desktopNode = vfs.resolvePath('C:\\Користувачі\\Учень\\Робочий стіл');
    let userItems = [];

    if (desktopNode) {
      const children = vfs.listChildren(desktopNode.id);
      userItems = children.map((node) => ({
        id: node.id,
        isSystem: false,
        name: node.name,
        type: node.type,
        extension: node.extension,
        node,
        action: () => this.openVFSItem(node)
      }));
    }

    return [...systemShortcuts, ...userItems];
  }

  async renderIcons() {
    if (!this.iconsGridEl) return;
    this.iconsGridEl.innerHTML = '';
    const items = await this.getDesktopItems();

    const cellWidth = 92;
    const cellHeight = 96;
    const availableH = (this.container?.clientHeight || window.innerHeight - 56) - 40;
    const maxRows = Math.max(1, Math.floor(availableH / cellHeight));

    items.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'desktop-icon-item';
      el.dataset.id = item.id;
      el.dataset.type = item.type || (item.isSystem ? 'system' : 'file');
      el.tabIndex = 0;

      let posX, posY;
      if (this.iconPositions && this.iconPositions[item.id]) {
        posX = this.iconPositions[item.id].x;
        posY = this.iconPositions[item.id].y;
      } else {
        const col = Math.floor(index / maxRows);
        const row = index % maxRows;
        posX = 14 + col * cellWidth;
        posY = 14 + row * cellHeight;
      }

      el.style.left = `${posX}px`;
      el.style.top = `${posY}px`;

      const iconSvg = this.getIconSvg(item);
      el.innerHTML = `
        <div class="icon-graphic">${iconSvg}</div>
        <div class="icon-label" title="${item.name}">${item.name}</div>
      `;

      this.setupIconInteractions(el, item);
      this.iconsGridEl.appendChild(el);
    });
  }

  setupIconInteractions(el, item) {
    let isDragging = false;
    let hasMoved = false;
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;

    // Події виділення та запуску (миша)
    el.addEventListener('click', (e) => {
      if (hasMoved) return;
      e.stopPropagation();
      if (!e.ctrlKey) this.clearSelection();
      this.selectIcon(el);
    });

    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      item.action();
    });

    // Контекстне меню для окремого значка (миша)
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.selectIcon(el);
      this.showItemContextMenu(item, e.clientX, e.clientY);
    });

    // Сенсорне керування (планшет / смартфон):
    // 1. Короткий дотик (Tap) — відкрити файл чи програму
    // 2. Утримання пальця (Long Press, 500мс) — виклик контекстного меню дій з об'єктом
    let touchTimer = null;
    let touchStartX = 0, touchStartY = 0;
    let touchMoved = false;
    let isTouchLongPress = false;
    let touchStartTime = 0;

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = Date.now();
      touchMoved = false;
      isTouchLongPress = false;

      touchTimer = setTimeout(() => {
        isTouchLongPress = true;
        if (navigator.vibrate) {
          try { navigator.vibrate(35); } catch {}
        }
        this.clearSelection();
        this.selectIcon(el);
        this.showItemContextMenu(item, touchStartX, touchStartY);
      }, 500);
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - touchStartX) > 10 || Math.abs(t.clientY - touchStartY) > 10) {
        touchMoved = true;
        if (touchTimer) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
      }
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }

      if (isTouchLongPress) {
        e.preventDefault();
        return;
      }

      // Якщо це був короткий дотик (Tap)
      if (!touchMoved && (Date.now() - touchStartTime < 500)) {
        e.preventDefault();
        this.clearSelection();
        this.selectIcon(el);
        item.action();
      }
    });

    el.addEventListener('touchcancel', () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    });

    // Перетягування значків (Drag & Drop)
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Тільки ліва кнопка миші
      e.stopPropagation();

      startX = e.clientX;
      startY = e.clientY;
      initialX = parseInt(el.style.left, 10) || el.offsetLeft;
      initialY = parseInt(el.style.top, 10) || el.offsetTop;
      hasMoved = false;
      isDragging = false;

      const onMouseMove = (moveEvt) => {
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;

        if (!isDragging && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          isDragging = true;
          hasMoved = true;
          el.classList.add('is-dragging');
          el.style.zIndex = '500';
          this.clearSelection();
          this.selectIcon(el);
        }

        if (isDragging) {
          let newX = initialX + dx;
          let newY = initialY + dy;

          const maxW = (this.container.clientWidth || window.innerWidth) - 90;
          const maxH = (this.container.clientHeight || window.innerHeight - 56) - 90;
          newX = Math.max(6, Math.min(newX, maxW));
          newY = Math.max(6, Math.min(newY, maxH));

          el.style.left = `${newX}px`;
          el.style.top = `${newY}px`;

          // Визначення елемента під курсором (drop target)
          el.style.pointerEvents = 'none';
          const elemUnder = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY);
          el.style.pointerEvents = '';

          const targetIconEl = elemUnder ? elemUnder.closest('.desktop-icon-item') : null;

          // Знімаємо підсвічування цілей
          this.iconsGridEl.querySelectorAll('.desktop-icon-item.drop-target').forEach((icon) => {
            if (icon !== targetIconEl) icon.classList.remove('drop-target');
          });

          if (targetIconEl && targetIconEl !== el) {
            const targetId = targetIconEl.dataset.id;
            const targetType = targetIconEl.dataset.type;

            const canDropToRecycle = (targetId === 'sys_recycle_bin' && !item.isSystem);
            const canDropToFolder = (targetType === 'directory' && !item.isSystem);

            if (canDropToRecycle || canDropToFolder) {
              targetIconEl.classList.add('drop-target');
            }
          }
        }
      };

      const onMouseUp = async (upEvt) => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (isDragging) {
          el.classList.remove('is-dragging');
          el.style.zIndex = '';

          el.style.pointerEvents = 'none';
          const elemUnder = document.elementFromPoint(upEvt.clientX, upEvt.clientY);
          el.style.pointerEvents = '';

          const targetIconEl = elemUnder ? elemUnder.closest('.desktop-icon-item') : null;
          this.iconsGridEl.querySelectorAll('.desktop-icon-item.drop-target').forEach((icon) => {
            icon.classList.remove('drop-target');
          });

          // 1. Переміщення у Кошик (Видалення не-системного файлу/папки)
          if (targetIconEl && targetIconEl !== el && targetIconEl.dataset.id === 'sys_recycle_bin' && !item.isSystem) {
            try {
              await vfs.deleteNode(item.id, false);
            } catch (err) {
              console.error('[Desktop DnD] Error moving to trash:', err);
            }
            return;
          }

          // 2. Переміщення у папку на робочому столі
          if (targetIconEl && targetIconEl !== el && targetIconEl.dataset.type === 'directory' && !item.isSystem) {
            try {
              await vfs.moveNode(item.id, targetIconEl.dataset.id);
            } catch (err) {
              console.error('[Desktop DnD] Error moving node:', err);
              this.renderIcons();
            }
            return;
          }

          // 3. Звичайне переміщення значка по Робочому столу з вирівнюванням за сіткою
          const curLeft = parseInt(el.style.left, 10);
          const curTop = parseInt(el.style.top, 10);

          const snapX = Math.max(14, Math.round((curLeft - 14) / 92) * 92 + 14);
          const snapY = Math.max(14, Math.round((curTop - 14) / 96) * 96 + 14);

          el.style.left = `${snapX}px`;
          el.style.top = `${snapY}px`;

          this.iconPositions[item.id] = { x: snapX, y: snapY };
          this.saveIconPositions();
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  openVFSItem(node) {
    if (node.type === 'directory') {
      eventBus.emit('app:launch', { appId: 'explorer', params: { path: vfs.getNodePath(node.id) } });
    } else if (node.type === 'file') {
      const ext = (node.extension || '').toLowerCase();
      if (['txt', 'log', 'json', 'csv', 'bat', 'sh'].includes(ext)) {
        eventBus.emit('app:launch', { appId: 'notepad', params: { fileId: node.id } });
      } else if (['png', 'jpg', 'jpeg', 'svg', 'bmp'].includes(ext)) {
        eventBus.emit('app:launch', { appId: 'image-viewer', params: { fileId: node.id } });
      } else if (['zip', '7z', 'gz'].includes(ext)) {
        eventBus.emit('app:launch', { appId: 'archiver', params: { fileId: node.id } });
      } else {
        eventBus.emit('app:launch', { appId: 'notepad', params: { fileId: node.id } });
      }
    }
  }

  showItemContextMenu(item, x, y) {
    if (item.isSystem) {
      contextMenu.show([
        { label: 'Відкрити', action: () => item.action() }
      ], x, y);
      return;
    }

    const node = item.node;
    const menuItems = [
      { label: 'Відкрити', action: () => item.action() },
      { separator: true },
      {
        label: 'Вирізати',
        shortcut: 'Ctrl+X',
        action: () => { window.__eduosClipboard = { action: 'cut', node }; }
      },
      {
        label: 'Копіювати',
        shortcut: 'Ctrl+C',
        action: () => { window.__eduosClipboard = { action: 'copy', node }; }
      },
      { separator: true },
      {
        label: 'Перейменувати',
        shortcut: 'F2',
        action: async () => {
          const newName = await dialogs.showRenameDialog({
            currentName: node.name,
            isDirectory: node.type === 'directory'
          });
          if (newName && newName !== node.name) {
            try {
              await vfs.renameNode(node.id, newName);
            } catch (err) {
              await dialogs.alert(err.message, { icon: 'error', title: 'Перейменування' });
            }
          }
        }
      },
      {
        label: 'Видалити',
        shortcut: 'Del',
        action: async () => {
          const confirmed = await dialogs.confirm(
            `Ви дійсно бажаєте перемістити «${node.name}» у Кошик?`,
            { title: 'Видалення до Кошика', danger: true, confirmText: 'Видалити', cancelText: 'Скасувати' }
          );
          if (confirmed) {
            await vfs.deleteNode(node.id, false);
          }
        }
      },
      { separator: true },
      {
        label: 'Властивості',
        action: () => eventBus.emit('app:show_properties', { node })
      }
    ];

    contextMenu.show(menuItems, x, y);
  }

  showDesktopContextMenu(x, y) {
    const desktopDir = vfs.resolvePath('C:\\Користувачі\\Учень\\Робочий стіл');
    const hasClipboard = !!window.__eduosClipboard;

    const items = [
      {
        label: 'Оновити',
        action: () => this.renderIcons()
      },
      {
        label: 'Впорядкувати значки за сіткою',
        action: () => this.resetIconPositions()
      },
      { separator: true },
      {
        label: 'Створити папку',
        action: async () => {
          const name = await dialogs.showNewFolderDialog({ parentName: 'Робочому столі' });
          if (name && desktopDir) {
            try {
              await vfs.createDirectory(desktopDir.id, name);
            } catch (err) {
              await dialogs.alert(err.message, { icon: 'error', title: 'Створення папки' });
            }
          }
        }
      },
      {
        label: 'Створити текстовий документ',
        action: async () => {
          const name = await dialogs.prompt('Введіть назву файлу:', 'Новий документ.txt', {
            title: 'Створення текстового документа'
          });
          if (name && desktopDir) {
            try {
              await vfs.createFile(desktopDir.id, name, '');
            } catch (err) {
              await dialogs.alert(err.message, { icon: 'error', title: 'Створення файлу' });
            }
          }
        }
      },
      { separator: true },
      {
        label: 'Вставити',
        shortcut: 'Ctrl+V',
        disabled: !hasClipboard,
        action: async () => {
          if (window.__eduosClipboard && desktopDir) {
            const { action, node } = window.__eduosClipboard;
            try {
              if (action === 'cut') {
                await vfs.moveNode(node.id, desktopDir.id);
                window.__eduosClipboard = null;
              } else if (action === 'copy') {
                await vfs.copyNode(node.id, desktopDir.id);
              }
            } catch (err) {
              await dialogs.alert(err.message, { icon: 'error', title: 'Помилка вставки' });
            }
          }
        }
      },
      { separator: true },
      {
        label: 'Персоналізація...',
        action: () => eventBus.emit('app:launch', { appId: 'settings', params: { tab: 'personalization' } })
      }
    ];

    contextMenu.show(items, x, y);
  }

  setupDesktopContextMenu() {
    this.container.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.desktop-icon-item') || e.target.closest('.edu-window')) return;
      e.preventDefault();
      this.showDesktopContextMenu(e.clientX, e.clientY);
    });

    // Очищення виділення при кліку на порожній області
    this.container.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.desktop-icon-item') && !e.target.closest('.edu-context-menu')) {
        this.clearSelection();
      }
    });

    // Сенсорний виклик контекстного меню робочого столу при утриманні пальця
    let emptyTouchTimer = null;
    let emptyTouchStartX = 0, emptyTouchStartY = 0;
    let emptyTouchMoved = false;

    this.container.addEventListener('touchstart', (e) => {
      if (e.target.closest('.desktop-icon-item') || e.target.closest('.edu-window') || e.target.closest('.edu-context-menu')) return;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      emptyTouchStartX = t.clientX;
      emptyTouchStartY = t.clientY;
      emptyTouchMoved = false;

      emptyTouchTimer = setTimeout(() => {
        if (navigator.vibrate) {
          try { navigator.vibrate(35); } catch {}
        }
        this.clearSelection();
        this.showDesktopContextMenu(emptyTouchStartX, emptyTouchStartY);
      }, 500);
    }, { passive: true });

    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - emptyTouchStartX) > 10 || Math.abs(t.clientY - emptyTouchStartY) > 10) {
        emptyTouchMoved = true;
        if (emptyTouchTimer) {
          clearTimeout(emptyTouchTimer);
          emptyTouchTimer = null;
        }
      }
    }, { passive: true });

    this.container.addEventListener('touchend', () => {
      if (emptyTouchTimer) {
        clearTimeout(emptyTouchTimer);
        emptyTouchTimer = null;
      }
      if (!emptyTouchMoved) {
        this.clearSelection();
      }
    });
  }

  setupRubberbandSelection() {
    this.selectionBoxEl = document.createElement('div');
    this.selectionBoxEl.className = 'desktop-rubberband-box';
    this.selectionBoxEl.style.display = 'none';
    this.container.appendChild(this.selectionBoxEl);

    let isSelecting = false;
    let startX = 0, startY = 0;

    this.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.desktop-icon-item') || e.target.closest('.edu-window') || e.button !== 0) return;
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;

      this.selectionBoxEl.style.left = `${startX}px`;
      this.selectionBoxEl.style.top = `${startY}px`;
      this.selectionBoxEl.style.width = '0px';
      this.selectionBoxEl.style.height = '0px';
      this.selectionBoxEl.style.display = 'block';

      if (!e.ctrlKey) this.clearSelection();

      const onMouseMove = (moveEvt) => {
        if (!isSelecting) return;
        const curX = moveEvt.clientX;
        const curY = moveEvt.clientY;

        const left = Math.min(startX, curX);
        const top = Math.min(startY, curY);
        const width = Math.abs(curX - startX);
        const height = Math.abs(curY - startY);

        this.selectionBoxEl.style.left = `${left}px`;
        this.selectionBoxEl.style.top = `${top}px`;
        this.selectionBoxEl.style.width = `${width}px`;
        this.selectionBoxEl.style.height = `${height}px`;

        // Перевірка перетину зі значками
        const boxRect = { left, top, right: left + width, bottom: top + height };
        const iconEls = this.iconsGridEl.querySelectorAll('.desktop-icon-item');

        iconEls.forEach((iconEl) => {
          const r = iconEl.getBoundingClientRect();
          const overlap = !(r.right < boxRect.left || r.left > boxRect.right || r.bottom < boxRect.top || r.top > boxRect.bottom);
          if (overlap) {
            this.selectIcon(iconEl);
          }
        });
      };

      const onMouseUp = () => {
        if (!isSelecting) return;
        isSelecting = false;
        this.selectionBoxEl.style.display = 'none';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  selectIcon(iconEl) {
    iconEl.classList.add('selected');
    this.selectedIcons.add(iconEl.dataset.id);
  }

  clearSelection() {
    this.selectedIcons.clear();
    const els = this.iconsGridEl.querySelectorAll('.desktop-icon-item.selected');
    els.forEach((el) => el.classList.remove('selected'));
  }

  getIconSvg(item) {
    if (item.isSystem) {
      return `<img class="desktop-icon-img" src="assets/icons/${item.iconType}.svg" alt="" width="42" height="42" />`;
    }

    if (item.type === 'directory') {
      return `<img class="desktop-icon-img" src="assets/icons/explorer.svg" alt="" width="42" height="42" />`;
    }

    // Файли за розширенням
    const ext = (item.extension || '').toLowerCase();
    if (['txt', 'log', 'csv', 'json', 'bat', 'sh'].includes(ext)) {
      return `<img class="desktop-icon-img" src="assets/icons/notepad.svg" alt="" width="42" height="42" />`;
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'bmp', 'webp'].includes(ext)) {
      return `<img class="desktop-icon-img" src="assets/icons/image-viewer.svg" alt="" width="42" height="42" />`;
    }
    if (['zip', '7z', 'gz', 'tar'].includes(ext)) {
      return `<img class="desktop-icon-img" src="assets/icons/archiver.svg" alt="" width="42" height="42" />`;
    }

    return `<img class="desktop-icon-img" src="assets/icons/notepad.svg" alt="" width="42" height="42" />`;
  }
}

export const desktop = new DesktopManager();
