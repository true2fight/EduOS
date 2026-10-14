/**
 * WindowManager: Керування вікнами операційної системи EduOS
 * Відповідає за створення вікон, фокус, Z-Index, перетягування (Drag), зміну розміру (Resize),
 * згортання (Minimize), розгортання (Maximize) та безпеку меж екрана (Boundary Clamping).
 */
import { eventBus } from './event-bus.js';

class WindowManager {
  constructor() {
    this.windows = new Map(); // id -> WindowInstance
    this.activeWindowId = null;
    this.baseZIndex = 100;
    this.topZIndex = 100;
    this.container = null;
  }

  init(containerElement) {
    this.container = containerElement || document.getElementById('windows-container');

    // Обробка зміни розміру вікна браузера для збереження вікон у видимій зоні
    window.addEventListener('resize', () => {
      this.windows.forEach((win) => {
        this.clampWindowToBounds(win);
      });
    });
  }

  createWindow(options = {}) {
    const id = 'win_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    const title = options.title || 'Нове вікно';
    const icon = options.icon || 'window';

    const isDialog = options.isDialog || false;
    const canMaximize = options.canMaximize !== false && !isDialog;
    const isResizable = options.isResizable !== false && !isDialog;

    // Отримуємо актуальні розміри робочого простору учня
    const taskbarEl = document.getElementById('taskbar');
    const taskbarH = taskbarEl ? taskbarEl.offsetHeight : (window.innerWidth <= 768 ? 44 : 48);
    const availableW = window.innerWidth;
    const availableH = Math.max(200, window.innerHeight - taskbarH);

    // Адаптація розмірів під мобільні телефони, планшети та настільні ПК
    const isSmallScreen = availableW <= 640 || availableH <= 520;
    const isTablet = availableW > 640 && availableW <= 1024;

    let width, height;
    if (isSmallScreen) {
      if (isDialog) {
        width = Math.min(options.width || 480, availableW - 16);
        height = Math.min(options.height || 400, availableH - 16);
      } else {
        // На смартфонах звичайні вікна адаптуються під доступний простір екрана
        width = Math.min(options.width || availableW, availableW - 8);
        height = Math.min(options.height || availableH, availableH - 8);
      }
    } else if (isTablet) {
      width = Math.min(options.width || 760, availableW - 32);
      height = Math.min(options.height || 520, availableH - 32);
    } else {
      width = Math.min(options.width || 760, availableW - 40);
      height = Math.min(options.height || 500, availableH - 40);
    }

    // Точний розрахунок початкової позиції СТРОГО ПО ЦЕНТРУ робочого столу учня
    const x = Math.max(isSmallScreen ? 4 : 10, Math.round((availableW - width) / 2));
    const y = Math.max(isSmallScreen ? 4 : 10, Math.round((availableH - height) / 2));

    const minWidth = Math.min(options.minWidth || 360, width, Math.max(200, availableW - 8));
    const minHeight = Math.min(options.minHeight || 260, height, Math.max(160, availableH - 8));

    const winInstance = {
      id,
      appId: options.appId || 'app',
      title,
      icon,
      x,
      y,
      width,
      height,
      minWidth,
      minHeight,
      isMinimized: false,
      isMaximized: false,
      isModal: options.isModal || false,
      isDialog,
      canMaximize,
      isResizable,
      zIndex: ++this.topZIndex,
      prevBounds: null,
      domElement: null,
      contentElement: null,
      appInstance: null,
      params: options.params || {}
    };

    // Створюємо DOM-елемент вікна
    const winEl = this.buildWindowDOM(winInstance);
    winInstance.domElement = winEl;
    winInstance.contentElement = winEl.querySelector('.window-body');

    this.container.appendChild(winEl);
    this.windows.set(id, winInstance);

    this.setupWindowInteractions(winInstance);
    this.focusWindow(id);

    // На смартфонах звичайні вікна автоматично розгортаються на весь екран для зручності
    if (isSmallScreen && availableW <= 520 && canMaximize && !isDialog) {
      this.toggleMaximizeWindow(id);
    }

    eventBus.emit('window:created', winInstance);
    return winInstance;
  }

  buildWindowDOM(win) {
    const el = document.createElement('div');
    el.className = `edu-window acrylic-window ${win.isDialog ? 'window-dialog' : ''}`;
    el.id = win.id;
    el.style.left = `${win.x}px`;
    el.style.top = `${win.y}px`;
    el.style.width = `${win.width}px`;
    el.style.height = `${win.height}px`;
    el.style.zIndex = win.zIndex;

    const maxBtnHtml = win.canMaximize
      ? `
          <button class="win-btn win-btn-maximize" title="Розгорнути" aria-label="Розгорнути">
            <svg class="icon-max" width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
            <svg class="icon-restore" width="10" height="10" viewBox="0 0 10 10" style="display:none;"><path d="M3 1h6v6H7M1 3h6v6H1z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
        `
      : '';

    const resizeHandlesHtml = win.isResizable
      ? `
          <div class="window-resize-handle handle-n"></div>
          <div class="window-resize-handle handle-s"></div>
          <div class="window-resize-handle handle-e"></div>
          <div class="window-resize-handle handle-w"></div>
          <div class="window-resize-handle handle-ne"></div>
          <div class="window-resize-handle handle-nw"></div>
          <div class="window-resize-handle handle-se"></div>
          <div class="window-resize-handle handle-sw"></div>
        `
      : '';

    el.innerHTML = `
      <div class="window-titlebar">
        <div class="window-title-group">
          <span class="window-icon-badge" data-icon="${win.icon}"></span>
          <span class="window-title-text">${win.title}</span>
        </div>
        <div class="window-controls">
          <button class="win-btn win-btn-minimize" title="Згорнути" aria-label="Згорнути">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
          ${maxBtnHtml}
          <button class="win-btn win-btn-close" title="Закрити" aria-label="Закрити">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
        </div>
      </div>
      <div class="window-body"></div>
      ${resizeHandlesHtml}
    `;

    return el;
  }

  setupWindowInteractions(win) {
    const el = win.domElement;
    const titlebar = el.querySelector('.window-titlebar');
    const btnMin = el.querySelector('.win-btn-minimize');
    const btnMax = el.querySelector('.win-btn-maximize');
    const btnClose = el.querySelector('.win-btn-close');

    // Клік або дотик для активації (фокусування) вікна
    const onActivate = () => this.focusWindow(win.id);
    el.addEventListener('mousedown', onActivate);
    el.addEventListener('touchstart', onActivate, { passive: true });

    // Згортання
    if (btnMin) {
      btnMin.addEventListener('click', (e) => {
        e.stopPropagation();
        this.minimizeWindow(win.id);
      });
    }

    // Розгортання / Відновлення
    if (btnMax && win.canMaximize) {
      btnMax.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMaximizeWindow(win.id);
      });
    }

    // Подвійний клік на тайтлбар розгортає вікно (тільки якщо canMaximize)
    titlebar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.window-controls')) return;
      if (win.canMaximize) {
        this.toggleMaximizeWindow(win.id);
      }
    });

    // Закриття
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeWindow(win.id);
      });
    }

    // Перетягування (Drag) з підтримкою миші та сенсорного екрана
    this.setupDraggable(win, titlebar);

    // Зміна розмірів (Resize)
    if (win.isResizable) {
      this.setupResizable(win);
    }
  }

  setupDraggable(win, handle) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialWinX = 0, initialWinY = 0;

    const startDrag = (clientX, clientY) => {
      if (win.isMaximized) return false;
      isDragging = true;
      startX = clientX;
      startY = clientY;
      initialWinX = win.x;
      initialWinY = win.y;

      document.body.classList.add('user-is-dragging');
      win.domElement.classList.add('is-dragging');
      this.focusWindow(win.id);
      return true;
    };

    const moveDrag = (clientX, clientY) => {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      let newX = initialWinX + dx;
      let newY = initialWinY + dy;

      const taskbarEl = document.getElementById('taskbar');
      const taskbarH = taskbarEl ? taskbarEl.offsetHeight : 48;
      const maxY = window.innerHeight - taskbarH - 40;

      newY = Math.max(0, Math.min(newY, maxY));
      newX = Math.max(-win.width + 100, Math.min(newX, window.innerWidth - 100));

      win.x = newX;
      win.y = newY;
      win.domElement.style.left = `${newX}px`;
      win.domElement.style.top = `${newY}px`;
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('user-is-dragging');
      win.domElement.classList.remove('is-dragging');
    };

    // Миша
    const onMouseDown = (e) => {
      if (e.target.closest('.window-controls')) return;
      if (e.button !== 0) return;
      if (startDrag(e.clientX, e.clientY)) {
        const onMouseMove = (moveEvt) => moveDrag(moveEvt.clientX, moveEvt.clientY);
        const onMouseUp = () => {
          endDrag();
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      }
    };

    // Сенсорний екран (планшет / смартфон)
    const onTouchStart = (e) => {
      if (e.target.closest('.window-controls')) return;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (startDrag(t.clientX, t.clientY)) {
          const onTouchMove = (moveEvt) => {
            if (moveEvt.touches.length === 1) {
              const mt = moveEvt.touches[0];
              moveDrag(mt.clientX, mt.clientY);
              moveEvt.preventDefault();
            }
          };
          const onTouchEnd = () => {
            endDrag();
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchEnd);
          };
          window.addEventListener('touchmove', onTouchMove, { passive: false });
          window.addEventListener('touchend', onTouchEnd);
          window.addEventListener('touchcancel', onTouchEnd);
        }
      }
    };

    handle.addEventListener('mousedown', onMouseDown);
    handle.addEventListener('touchstart', onTouchStart, { passive: true });
  }

  setupResizable(win) {
    const handles = win.domElement.querySelectorAll('.window-resize-handle');

    handles.forEach((handle) => {
      const direction = handle.className.replace('window-resize-handle handle-', '');

      const moveResize = (clientX, clientY, startX, startY, startW, startH, startLeft, startTop) => {
        const dx = clientX - startX;
        const dy = clientY - startY;

        let newW = startW;
        let newH = startH;
        let newX = startLeft;
        let newY = startTop;

        if (direction.includes('e')) newW = Math.max(win.minWidth, startW + dx);
        if (direction.includes('s')) newH = Math.max(win.minHeight, startH + dy);
        if (direction.includes('w')) {
          const proposedW = startW - dx;
          if (proposedW >= win.minWidth) {
            newW = proposedW;
            newX = startLeft + dx;
          }
        }
        if (direction.includes('n')) {
          const proposedH = startH - dy;
          if (proposedH >= win.minHeight && startTop + dy >= 0) {
            newH = proposedH;
            newY = startTop + dy;
          }
        }

        win.width = newW;
        win.height = newH;
        win.x = newX;
        win.y = newY;

        win.domElement.style.width = `${newW}px`;
        win.domElement.style.height = `${newH}px`;
        win.domElement.style.left = `${newX}px`;
        win.domElement.style.top = `${newY}px`;
      };

      // Миша
      handle.addEventListener('mousedown', (e) => {
        if (win.isMaximized) return;
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const startW = win.width;
        const startH = win.height;
        const startLeft = win.x;
        const startTop = win.y;

        win.domElement.classList.add('is-resizing');

        const onResizeMove = (moveEvt) => {
          moveResize(moveEvt.clientX, moveEvt.clientY, startX, startY, startW, startH, startLeft, startTop);
        };

        const onResizeUp = () => {
          win.domElement.classList.remove('is-resizing');
          window.removeEventListener('mousemove', onResizeMove);
          window.removeEventListener('mouseup', onResizeUp);
        };

        window.addEventListener('mousemove', onResizeMove);
        window.addEventListener('mouseup', onResizeUp);
      });

      // Сенсорний екран (планшет / смартфон)
      handle.addEventListener('touchstart', (e) => {
        if (win.isMaximized) return;
        if (e.touches.length !== 1) return;
        e.stopPropagation();

        const t = e.touches[0];
        const startX = t.clientX;
        const startY = t.clientY;
        const startW = win.width;
        const startH = win.height;
        const startLeft = win.x;
        const startTop = win.y;

        win.domElement.classList.add('is-resizing');

        const onTouchMove = (moveEvt) => {
          if (moveEvt.touches.length === 1) {
            const mt = moveEvt.touches[0];
            moveResize(mt.clientX, mt.clientY, startX, startY, startW, startH, startLeft, startTop);
            moveEvt.preventDefault();
          }
        };

        const onTouchEnd = () => {
          win.domElement.classList.remove('is-resizing');
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', onTouchEnd);
          window.removeEventListener('touchcancel', onTouchEnd);
        };

        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);
      }, { passive: true });
    });
  }

  clampWindowToBounds(win) {
    if (win.isMaximized) return;
    const taskbarEl = document.getElementById('taskbar');
    const taskbarH = taskbarEl ? taskbarEl.offsetHeight : 48;
    const maxW = window.innerWidth;
    const maxH = window.innerHeight - taskbarH;

    // Якщо екран зменшився (наприклад, поворот планшета)
    if (win.width > maxW - 16) {
      win.width = Math.max(win.minWidth, maxW - 16);
      win.domElement.style.width = `${win.width}px`;
    }
    if (win.height > maxH - 16) {
      win.height = Math.max(win.minHeight, maxH - 16);
      win.domElement.style.height = `${win.height}px`;
    }

    const maxX = maxW - 40;
    const maxY = maxH - 40;

    if (win.x > maxX) win.x = Math.max(8, maxX);
    if (win.y > maxY) win.y = Math.max(8, maxY);
    if (win.y < 0) win.y = 0;
    if (win.x < 0) win.x = 0;

    win.domElement.style.left = `${win.x}px`;
    win.domElement.style.top = `${win.y}px`;
  }

  focusWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    if (this.activeWindowId !== id) {
      if (this.activeWindowId) {
        const prev = this.windows.get(this.activeWindowId);
        if (prev && prev.domElement) {
          prev.domElement.classList.remove('active-window');
        }
      }

      this.activeWindowId = id;
      win.zIndex = ++this.topZIndex;
      win.domElement.style.zIndex = win.zIndex;
      win.domElement.classList.add('active-window');

      // Якщо вікно було згорнуте, відновлюємо його
      if (win.isMinimized) {
        win.isMinimized = false;
        win.domElement.style.display = 'flex';
      }

      eventBus.emit('window:focused', win);
    }
  }

  minimizeWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    win.isMinimized = true;
    win.domElement.style.display = 'none';

    if (this.activeWindowId === id) {
      this.activeWindowId = null;
      // Шукаємо інше активне вікно на екрані
      let nextTop = null;
      for (const w of this.windows.values()) {
        if (!w.isMinimized) {
          if (!nextTop || w.zIndex > nextTop.zIndex) {
            nextTop = w;
          }
        }
      }
      if (nextTop) {
        this.focusWindow(nextTop.id);
      }
    }

    eventBus.emit('window:minimized', win);
  }

  toggleMaximizeWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    const iconMax = win.domElement.querySelector('.icon-max');
    const iconRestore = win.domElement.querySelector('.icon-restore');

    if (!win.isMaximized) {
      win.prevBounds = { x: win.x, y: win.y, width: win.width, height: win.height };
      win.isMaximized = true;
      win.domElement.classList.add('maximized');
      if (iconMax) iconMax.style.display = 'none';
      if (iconRestore) iconRestore.style.display = 'block';
    } else {
      win.isMaximized = false;
      win.domElement.classList.remove('maximized');
      if (win.prevBounds) {
        win.x = win.prevBounds.x;
        win.y = win.prevBounds.y;
        win.width = win.prevBounds.width;
        win.height = win.prevBounds.height;
        win.domElement.style.left = `${win.x}px`;
        win.domElement.style.top = `${win.y}px`;
        win.domElement.style.width = `${win.width}px`;
        win.domElement.style.height = `${win.height}px`;
      }
      if (iconMax) iconMax.style.display = 'block';
      if (iconRestore) iconRestore.style.display = 'none';
    }

    this.focusWindow(id);
    eventBus.emit('window:maximized_changed', win);
  }

  closeWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    // Виклик методу завершення роботи програми
    if (win.appInstance && typeof win.appInstance.destroy === 'function') {
      try {
        win.appInstance.destroy();
      } catch (e) {
        console.error(`Error in app destroy for ${win.appId}:`, e);
      }
    }

    if (win.domElement && win.domElement.parentNode) {
      win.domElement.parentNode.removeChild(win.domElement);
    }

    this.windows.delete(id);

    if (this.activeWindowId === id) {
      this.activeWindowId = null;
      let nextTop = null;
      for (const w of this.windows.values()) {
        if (!w.isMinimized && (!nextTop || w.zIndex > nextTop.zIndex)) {
          nextTop = w;
        }
      }
      if (nextTop) this.focusWindow(nextTop.id);
    }

    eventBus.emit('window:closed', { id, appId: win.appId });
  }

  setTitle(id, newTitle) {
    const win = this.windows.get(id);
    if (win) {
      win.title = newTitle;
      const titleText = win.domElement.querySelector('.window-title-text');
      if (titleText) titleText.textContent = newTitle;
      eventBus.emit('window:title_changed', win);
    }
  }

  getWindow(id) {
    return this.windows.get(id) || null;
  }

  getAllWindows() {
    return Array.from(this.windows.values());
  }
}

export const windowManager = new WindowManager();
