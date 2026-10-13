/**
 * PaintApp: Графічний редактор Paint для EduOS
 * Реалізує малювання на Canvas: олівець, пензель, гумку, геометричні фігури,
 * заливку flood-fill, палітру кольорів, історію скасувань (Undo/Redo),
 * збереження у VFS (з вибором папки), експорт на ПК та підтримку гарячих клавіш (Ctrl+S).
 */
import { BaseApp } from './base-app.js';
import { vfs } from '../core/filesystem.js';
import { auditLogger } from '../core/audit-log.js';
import { dialogs } from '../core/dialogs.js';

export class PaintApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.canvas = null;
    this.ctx = null;
    this.currentTool = 'pencil'; // pencil, brush, eraser, line, rect, circle, fill
    this.currentColor = '#000000';
    this.strokeWidth = 3;
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.snapshot = null;
    this.undoStack = [];
    this.redoStack = [];
    this.fileId = params.fileId || null;
    this.fileName = 'Малюнок.png';
    this.isDirty = false;
    this.targetFolder = 'C:\\Користувачі\\Учень\\Зображення';
  }

  async init() {
    this.renderLayout();
    if (this.fileId) {
      await this.loadImageFile(this.fileId);
    }
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="paint-layout">
        <!-- Верхнє меню (Файл, Правка) -->
        <div class="paint-menubar">
          <span class="app-title-icon" data-icon="paint" title="Графічний редактор Paint"></span>
          <div class="menu-dropdown">
            <button class="menu-btn">Файл</button>
            <div class="menu-dropdown-content">
              <button id="paint-menu-new">📄 Новий (Ctrl+N)</button>
              <button id="paint-menu-open">📂 Відкрити малюнок... (Ctrl+O)</button>
              <button id="paint-menu-save">💾 Зберегти (Ctrl+S)</button>
              <button id="paint-menu-saveas">💾 Зберегти як...</button>
              <div class="context-menu-separator"></div>
              <button id="paint-menu-export">📥 Завантажити на комп'ютер (PNG)</button>
            </div>
          </div>

          <div class="menu-dropdown">
            <button class="menu-btn">Правка</button>
            <div class="menu-dropdown-content">
              <button id="paint-menu-undo">↩ Скасувати (Ctrl+Z)</button>
              <button id="paint-menu-redo">↪ Повторити (Ctrl+Y)</button>
              <div class="context-menu-separator"></div>
              <button id="paint-menu-clear">🗑️ Очистити полотно</button>
            </div>
          </div>

          <!-- Швидка кнопка збереження у шапці -->
          <div class="paint-quick-actions">
            <button class="paint-btn-save-main" id="paint-top-save-btn" title="Зберегти малюнок у системі (Ctrl+S)">
              💾 <span>Зберегти</span>
            </button>
            <button class="paint-btn-export-main" id="paint-top-export-btn" title="Завантажити файл на свій комп'ютер">
              📥 <span>Завантажити</span>
            </button>
          </div>
        </div>

        <!-- Тулбар інструментів та палітри -->
        <div class="paint-toolbar">
          <div class="paint-tools-group">
            <button class="tool-btn active" data-tool="pencil" title="Олівець">✏️</button>
            <button class="tool-btn" data-tool="brush" title="Пензель">🖌️</button>
            <button class="tool-btn" data-tool="eraser" title="Гумка">🧹</button>
            <button class="tool-btn" data-tool="fill" title="Заливка">🪣</button>
            <button class="tool-btn" data-tool="line" title="Лінія">╱</button>
            <button class="tool-btn" data-tool="rect" title="Прямокутник">▭</button>
            <button class="tool-btn" data-tool="circle" title="Коло">◯</button>
          </div>

          <div class="paint-separator"></div>

          <!-- Товщина лінії -->
          <div class="paint-stroke-selector">
            <label>Товщина:</label>
            <select id="paint-stroke-width">
              <option value="1">1 px</option>
              <option value="3" selected>3 px</option>
              <option value="6">6 px</option>
              <option value="12">12 px</option>
            </select>
          </div>

          <div class="paint-separator"></div>

          <!-- Палітра кольорів -->
          <div class="paint-palette">
            <div class="color-swatch active" style="background:#000000;" data-color="#000000" title="Чорний"></div>
            <div class="color-swatch" style="background:#ffffff;border:1px solid #ccc;" data-color="#ffffff" title="Білий"></div>
            <div class="color-swatch" style="background:#d13438;" data-color="#d13438" title="Червоний"></div>
            <div class="color-swatch" style="background:#ffaa44;" data-color="#ffaa44" title="Помаранчевий"></div>
            <div class="color-swatch" style="background:#107c41;" data-color="#107c41" title="Зелений"></div>
            <div class="color-swatch" style="background:#0078d4;" data-color="#0078d4" title="Синій"></div>
            <div class="color-swatch" style="background:#8764b8;" data-color="#8764b8" title="Фіолетовий"></div>
            <div class="color-swatch" style="background:#00b7c3;" data-color="#00b7c3" title="Бірюзовий"></div>
            <input type="color" id="paint-custom-color" value="#000000" title="Обрати власний колір" />
          </div>

          <div class="paint-separator"></div>

          <!-- Кнопки дій -->
          <div class="paint-actions">
            <button class="paint-action-btn" id="paint-btn-undo" title="Скасувати (Ctrl+Z)">↩</button>
            <button class="paint-action-btn" id="paint-btn-redo" title="Повторити (Ctrl+Y)">↪</button>
            <button class="paint-action-btn" id="paint-btn-clear" title="Очистити">🗑️</button>
          </div>
        </div>

        <!-- Полотно малювання -->
        <div class="paint-canvas-viewport">
          <canvas id="paint-canvas" width="680" height="420"></canvas>
        </div>

        <!-- Статусбар Paint -->
        <div class="paint-statusbar">
          <span id="paint-status-pos">Положення: 0, 0 px</span>
          <span id="paint-status-size">Розмір: 680 × 420 px</span>
          <span id="paint-status-dirty" class="paint-dirty-badge">● Не збережено</span>
        </div>
      </div>
    `;

    // Ініціалізація полотна та контексту ДО прив'язки подій!
    this.initCanvas();
    this.bindEvents();
    this.updateTitle();
  }

  initCanvas() {
    this.canvas = this.container.querySelector('#paint-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // Білий фон за замовчуванням
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack = [];
    this.redoStack = [];
    this.saveState();
  }

  bindEvents() {
    // 1. Інструменти
    this.container.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.container.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.dataset.tool;
      });
    });

    // 2. Товщина
    const strokeSelect = this.container.querySelector('#paint-stroke-width');
    if (strokeSelect) {
      strokeSelect.addEventListener('change', (e) => {
        this.strokeWidth = parseInt(e.target.value, 10) || 3;
      });
    }

    // 3. Палітра
    this.container.querySelectorAll('.color-swatch').forEach((swatch) => {
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        this.container.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        this.currentColor = swatch.dataset.color;
        const customInput = this.container.querySelector('#paint-custom-color');
        if (customInput) customInput.value = this.currentColor;
      });
    });

    const customColorInput = this.container.querySelector('#paint-custom-color');
    if (customColorInput) {
      customColorInput.addEventListener('input', (e) => {
        this.currentColor = e.target.value;
        this.container.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      });
    }

    // 4. Меню "Файл" та "Правка" (клік-перемикання)
    this.container.querySelectorAll('.menu-dropdown').forEach((dropdown) => {
      const btn = dropdown.querySelector('.menu-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = dropdown.classList.contains('open');
          this.container.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
          if (!isOpen) dropdown.classList.add('open');
        });
      }
    });

    this.container.addEventListener('click', () => {
      this.container.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
    });

    // 5. Кнопки збереження та експорту
    const topSaveBtn = this.container.querySelector('#paint-top-save-btn');
    if (topSaveBtn) {
      topSaveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.save();
      });
    }

    const topExportBtn = this.container.querySelector('#paint-top-export-btn');
    if (topExportBtn) {
      topExportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exportToPC();
      });
    }

    const menuSaveBtn = this.container.querySelector('#paint-menu-save');
    if (menuSaveBtn) {
      menuSaveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.container.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
        this.save();
      });
    }

    const menuSaveAsBtn = this.container.querySelector('#paint-menu-saveas');
    if (menuSaveAsBtn) {
      menuSaveAsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.container.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
        this.openSaveModal();
      });
    }

    const menuExportBtn = this.container.querySelector('#paint-menu-export');
    if (menuExportBtn) {
      menuExportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.container.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
        this.exportToPC();
      });
    }

    const menuNewBtn = this.container.querySelector('#paint-menu-new');
    if (menuNewBtn) {
      menuNewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.container.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
        this.newCanvas();
      });
    }

    const menuOpenBtn = this.container.querySelector('#paint-menu-open');
    if (menuOpenBtn) {
      menuOpenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.container.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
        this.openFromVFS();
      });
    }

    // 6. Дії Undo/Redo/Clear
    const btnUndo = this.container.querySelector('#paint-btn-undo');
    if (btnUndo) btnUndo.addEventListener('click', () => this.undo());
    const menuUndo = this.container.querySelector('#paint-menu-undo');
    if (menuUndo) {
      menuUndo.addEventListener('click', (e) => {
        e.stopPropagation();
        this.container.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
        this.undo();
      });
    }

    const btnRedo = this.container.querySelector('#paint-btn-redo');
    if (btnRedo) btnRedo.addEventListener('click', () => this.redo());
    const menuRedo = this.container.querySelector('#paint-menu-redo');
    if (menuRedo) {
      menuRedo.addEventListener('click', (e) => {
        e.stopPropagation();
        this.container.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
        this.redo();
      });
    }

    const btnClear = this.container.querySelector('#paint-btn-clear');
    if (btnClear) btnClear.addEventListener('click', () => this.clearCanvas());
    const menuClear = this.container.querySelector('#paint-menu-clear');
    if (menuClear) {
      menuClear.addEventListener('click', (e) => {
        e.stopPropagation();
        this.container.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
        this.clearCanvas();
      });
    }

    // 7. Події миші та тачу на полотні
    if (this.canvas) {
      this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
      this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
      this.canvas.addEventListener('mouseup', () => this.onMouseUp());

      // Підтримка сенсорних екранів
      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
          e.preventDefault();
          this.onMouseDown(e.touches[0]);
        }
      }, { passive: false });

      this.canvas.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length === 1) {
          e.preventDefault();
          this.onMouseMove(e.touches[0]);
        }
      }, { passive: false });

      this.canvas.addEventListener('touchend', () => this.onMouseUp());

      // Відстеження координат у статусбарі
      const statusPos = this.container.querySelector('#paint-status-pos');
      this.canvas.addEventListener('mousemove', (e) => {
        const coords = this.getCanvasCoords(e);
        if (statusPos) {
          statusPos.textContent = `Положення: ${Math.round(coords.x)}, ${Math.round(coords.y)} px`;
        }
      });
    }

    window.addEventListener('mouseup', () => {
      if (this.isDrawing) this.onMouseUp();
    });

    // 8. Гарячі клавіші (Ctrl+S, Ctrl+Z, Ctrl+Y, Ctrl+N)
    this.container.addEventListener('keydown', (e) => {
      if (e.ctrlKey && (e.key === 's' || e.key === 'ы' || e.key === 'і')) {
        e.preventDefault();
        e.stopPropagation();
        this.save();
      } else if (e.ctrlKey && (e.key === 'z' || e.key === 'я')) {
        e.preventDefault();
        this.undo();
      } else if (e.ctrlKey && (e.key === 'y' || e.key === 'н')) {
        e.preventDefault();
        this.redo();
      } else if (e.ctrlKey && (e.key === 'n' || e.key === 'т')) {
        e.preventDefault();
        this.newCanvas();
      }
    });
  }

  getCanvasCoords(e) {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width ? this.canvas.width / rect.width : 1;
    const scaleY = rect.height ? this.canvas.height / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  onMouseDown(e) {
    if (!this.canvas || !this.ctx) return;
    if (e.button !== undefined && e.button !== 0) return;

    const coords = this.getCanvasCoords(e);
    this.startX = coords.x;
    this.startY = coords.y;
    this.lastX = coords.x;
    this.lastY = coords.y;

    if (this.currentTool === 'fill') {
      this.floodFill(Math.round(this.startX), Math.round(this.startY), this.currentColor);
      this.markDirty();
      this.saveState();
      return;
    }

    this.isDrawing = true;
    this.snapshot = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    const isEraser = this.currentTool === 'eraser';
    const isBrush = this.currentTool === 'brush';

    this.ctx.strokeStyle = isEraser ? '#ffffff' : this.currentColor;
    this.ctx.fillStyle = isEraser ? '#ffffff' : this.currentColor;
    this.ctx.lineWidth = isEraser ? this.strokeWidth * 3 : (isBrush ? this.strokeWidth * 2.5 : this.strokeWidth);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Одразу малюємо першу точку на клік
    if (this.currentTool === 'pencil' || isBrush || isEraser) {
      this.ctx.beginPath();
      this.ctx.arc(coords.x, coords.y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  onMouseMove(e) {
    if (!this.isDrawing || !this.ctx) return;
    const coords = this.getCanvasCoords(e);

    const isEraser = this.currentTool === 'eraser';
    const isBrush = this.currentTool === 'brush';

    if (this.currentTool === 'pencil' || isBrush || isEraser) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = isEraser ? '#ffffff' : this.currentColor;
      this.ctx.lineWidth = isEraser ? this.strokeWidth * 3 : (isBrush ? this.strokeWidth * 2.5 : this.strokeWidth);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(coords.x, coords.y);
      this.ctx.stroke();

      this.lastX = coords.x;
      this.lastY = coords.y;
    } else {
      this.ctx.putImageData(this.snapshot, 0, 0);
      this.ctx.beginPath();
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.strokeWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      if (this.currentTool === 'line') {
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();
      } else if (this.currentTool === 'rect') {
        const w = coords.x - this.startX;
        const h = coords.y - this.startY;
        this.ctx.strokeRect(this.startX, this.startY, w, h);
      } else if (this.currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(coords.x - this.startX, 2) + Math.pow(coords.y - this.startY, 2));
        this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
      }
    }
  }

  onMouseUp() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.markDirty();
      this.saveState();
    }
  }

  markDirty() {
    this.isDirty = true;
    const badge = this.container.querySelector('#paint-status-dirty');
    if (badge) {
      badge.textContent = '● Не збережено';
      badge.className = 'paint-dirty-badge dirty';
    }
    this.updateTitle();
  }

  markClean() {
    this.isDirty = false;
    const badge = this.container.querySelector('#paint-status-dirty');
    if (badge) {
      badge.textContent = '✓ Збережено';
      badge.className = 'paint-dirty-badge clean';
    }
    this.updateTitle();
  }

  updateTitle() {
    const dirtyMark = this.isDirty ? '*' : '';
    this.setTitle(`Paint — ${dirtyMark}${this.fileName}`);
  }

  saveState() {
    const data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack.push(data);
    if (this.undoStack.length > 20) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length > 1) {
      const current = this.undoStack.pop();
      this.redoStack.push(current);
      const prev = this.undoStack[this.undoStack.length - 1];
      this.ctx.putImageData(prev, 0, 0);
      this.markDirty();
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const next = this.redoStack.pop();
      this.undoStack.push(next);
      this.ctx.putImageData(next, 0, 0);
      this.markDirty();
    }
  }

  async clearCanvas() {
    const confirmed = await dialogs.confirm('Очистити все полотно? Поточний малюнок буде стерто.', {
      title: 'Очищення полотна Paint',
      danger: true,
      confirmText: 'Очистити',
      cancelText: 'Скасувати'
    });
    if (confirmed) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.markDirty();
      this.saveState();
    }
  }

  floodFill(startX, startY, fillColorHex) {
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imgData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const fillR = parseInt(fillColorHex.substr(1, 2), 16);
    const fillG = parseInt(fillColorHex.substr(3, 2), 16);
    const fillB = parseInt(fillColorHex.substr(5, 2), 16);

    const startIdx = (startY * width + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];

    if (targetR === fillR && targetG === fillG && targetB === fillB) return;

    const matchTarget = (idx) => {
      return Math.abs(data[idx] - targetR) < 32 &&
             Math.abs(data[idx + 1] - targetG) < 32 &&
             Math.abs(data[idx + 2] - targetB) < 32;
    };

    const queue = [[startX, startY]];
    const seen = new Uint8Array(width * height);

    while (queue.length > 0) {
      const [x, y] = queue.pop();
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const pos = y * width + x;
      if (seen[pos]) continue;
      seen[pos] = 1;

      const idx = pos * 4;
      if (matchTarget(idx)) {
        data[idx] = fillR;
        data[idx + 1] = fillG;
        data[idx + 2] = fillB;
        data[idx + 3] = 255;

        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }

    this.ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Збереження малюнка (Ctrl+S або кнопка)
   */
  async save() {
    if (this.fileId) {
      // Якщо файл уже був збережений або відкритий раніше, перезаписуємо його
      const dataUrl = this.canvas.toDataURL('image/png');
      try {
        await vfs.writeFile(this.fileId, dataUrl);
        await auditLogger.log('create_file', { path: vfs.getNodePath(this.fileId), name: this.fileName });
        this.markClean();
        this.showToast(`Малюнок збережено: ${this.fileName}`);
      } catch (err) {
        await dialogs.alert(`Помилка збереження: ${err.message}`, { icon: 'error', title: 'Paint' });
      }
    } else {
      // Відкриваємо модальний діалог "Зберегти як"
      this.openSaveModal();
    }
  }

  /**
   * Візуальний діалог "Зберегти як" у системі EduOS
   */
  openSaveModal() {
    const previewUrl = this.canvas ? this.canvas.toDataURL('image/png') : '';
    const canvasW = this.canvas ? this.canvas.width : 680;
    const canvasH = this.canvas ? this.canvas.height : 420;

    const modal = document.createElement('div');
    modal.className = 'edu-modal-overlay';
    modal.innerHTML = `
      <div class="paint-save-dialog acrylic-panel">
        <div class="paint-dialog-header">
          <h3>💾 Зберегти малюнок у системі</h3>
          <button class="paint-dialog-close">✕</button>
        </div>
        <div class="paint-dialog-body">
          <div class="paint-dialog-field">
            <label>Папка призначення:</label>
            <select id="paint-dest-folder">
              <option value="C:\\Користувачі\\Учень\\Зображення" selected>📁 Зображення (C:\\Користувачі\\Учень\\Зображення)</option>
              <option value="C:\\Користувачі\\Учень\\Робочий стіл">🖥️ Робочий стіл (C:\\Користувачі\\Учень\\Робочий стіл)</option>
              <option value="C:\\Користувачі\\Учень\\Документи">📁 Документи (C:\\Користувачі\\Учень\\Документи)</option>
              <option value="D:\\Практичні роботи">💾 Навчальний диск (D:\\Практичні роботи)</option>
            </select>
          </div>

          <div class="paint-dialog-field">
            <label>Ім'я файлу:</label>
            <div class="paint-filename-row">
              <input type="text" id="paint-filename-input" value="${this.fileName.replace(/\.png$/i, '')}" placeholder="Малюнок" />
              <span class="paint-ext-tag">.png</span>
            </div>
          </div>

          <div class="paint-preview-card">
            <div class="paint-mini-thumb" style="background-image:url('${previewUrl}')"></div>
            <div class="paint-mini-info">
              <span>Тип: Зображення PNG</span>
              <span>Роздільність: ${canvasW} × ${canvasH} px</span>
            </div>
          </div>
        </div>
        <div class="paint-dialog-footer">
          <button class="paint-dlg-btn-cancel">Скасувати</button>
          <button class="paint-dlg-btn-export" id="paint-dlg-download">📥 Завантажити на ПК</button>
          <button class="paint-dlg-btn-save" id="paint-dlg-confirm-save">💾 Зберегти в EduOS</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelector('.paint-dialog-close').addEventListener('click', closeModal);
    modal.querySelector('.paint-dlg-btn-cancel').addEventListener('click', closeModal);

    // Завантажити на реальний комп'ютер
    modal.querySelector('#paint-dlg-download').addEventListener('click', () => {
      const name = modal.querySelector('#paint-filename-input').value.trim() || 'Малюнок';
      closeModal();
      this.exportToPC(name);
    });

    // Зберегти у віртуальній файловій системі
    modal.querySelector('#paint-dlg-confirm-save').addEventListener('click', async () => {
      const folderPath = modal.querySelector('#paint-dest-folder').value;
      const rawName = modal.querySelector('#paint-filename-input').value.trim() || 'Малюнок';
      const finalName = rawName.endsWith('.png') ? rawName : `${rawName}.png`;

      const targetDir = vfs.resolvePath(folderPath);
      if (!targetDir) {
        await dialogs.alert(`Помилка: цільову папку ${folderPath} не знайдено.`, { icon: 'error' });
        return;
      }

      const dataUrl = this.canvas.toDataURL('image/png');
      try {
        const node = await vfs.createFile(targetDir.id, finalName, dataUrl);
        this.fileId = node.id;
        this.fileName = finalName;
        this.targetFolder = folderPath;
        this.markClean();

        await auditLogger.log('create_file', { path: `${folderPath}\\${finalName}`, name: finalName });
        await auditLogger.log('save_paint', { path: `${folderPath}\\${finalName}`, name: finalName });

        closeModal();
        this.showToast(`Малюнок збережено у ${folderPath}\\${finalName}!`);
      } catch (err) {
        await dialogs.alert(`Помилка збереження: ${err.message}`, { icon: 'error', title: 'Paint' });
      }
    });

    const nameInput = modal.querySelector('#paint-filename-input');
    nameInput.focus();
    nameInput.select();
  }

  /**
   * Експорт (завантаження) малюнка на диск комп'ютера
   */
  exportToPC(customName = null) {
    if (!this.canvas) return;
    const dataUrl = this.canvas.toDataURL('image/png');
    const a = document.createElement('a');
    const name = customName || this.fileName || 'Малюнок.png';
    a.href = dataUrl;
    a.download = name.endsWith('.png') ? name : `${name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast(`Малюнок завантажено на ваш ПК як «${a.download}»`);
  }

  /**
   * Створення нового чистого полотна
   */
  async newCanvas() {
    if (this.isDirty) {
      const confirmed = await dialogs.confirm(
        'Незбережені зміни буде втрачено. Створити нове полотно?',
        { title: 'Новий малюнок', danger: true, confirmText: 'Створити', cancelText: 'Скасувати' }
      );
      if (!confirmed) {
        return;
      }
    }
    this.fileId = null;
    this.fileName = 'Малюнок.png';
    if (this.ctx && this.canvas) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.undoStack = [];
      this.redoStack = [];
      this.saveState();
    }
    this.markClean();
    this.updateTitle();
  }

  /**
   * Відкриття наявного малюнка з VFS
   */
  async openFromVFS() {
    const picsDir = vfs.resolvePath('C:\\Користувачі\\Учень\\Зображення');
    if (!picsDir) return;

    const files = vfs.listChildren(picsDir.id).filter((f) => ['png', 'jpg', 'jpeg'].includes(f.extension));
    if (files.length === 0) {
      await dialogs.alert('У папці «Зображення» немає файлів малюнків для відкриття.', { icon: 'info', title: 'Відкриття малюнка' });
      return;
    }

    const fileList = files.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
    const choice = await dialogs.prompt(`Оберіть номер малюнка для відкриття:\n${fileList}`, '1', {
      title: 'Вибір малюнка'
    });
    if (!choice) return;
    const idx = parseInt(choice, 10) - 1;

    if (files[idx]) {
      await this.loadImageFile(files[idx].id);
    }
  }

  async loadImageFile(fileId) {
    const node = vfs.getNode(fileId);
    if (!node || !node.content) return;

    this.fileId = node.id;
    this.fileName = node.name;
    const img = new Image();
    img.onload = () => {
      if (this.ctx && this.canvas) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
        this.saveState();
        this.markClean();
        this.updateTitle();
        this.showToast(`Відкрито малюнок: ${node.name}`);
      }
    };
    img.src = node.content;
  }

  showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'paint-toast-notification';
    toast.textContent = msg;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2500);
  }
}
