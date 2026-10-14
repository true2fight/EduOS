/**
 * NotepadApp: Текстовий редактор Блокнот для EduOS
 * Дозволяє створювати, переглядати та редагувати текстові файли, зберігати їх у VFS,
 * виконувати пошук тексту та змінювати розмір шрифту.
 */
import { BaseApp } from './base-app.js';
import { vfs } from '../core/filesystem.js';
import { eventBus } from '../core/event-bus.js';
import { dialogs } from '../core/dialogs.js';

export class NotepadApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.fileId = params.fileId || null;
    this.currentPath = params.path || null;
    this.fileName = 'Без_назви.txt';
    this.isDirty = false;
    this.fontSize = 14;
    this.wordWrap = true;
  }

  async init() {
    this.renderLayout();
    if (this.fileId) {
      await this.loadFile(this.fileId);
    } else if (this.currentPath) {
      const node = vfs.resolvePath(this.currentPath);
      if (node) await this.loadFile(node.id);
    }
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="notepad-layout">
        <div class="notepad-menubar">
          <div class="menu-dropdown">
            <button class="menu-btn">Файл</button>
            <div class="menu-dropdown-content">
              <button id="np-file-new">Новий (Ctrl+N)</button>
              <button id="np-file-open">Відкрити... (Ctrl+O)</button>
              <button id="np-file-save">Зберегти (Ctrl+S)</button>
              <button id="np-file-saveas">Зберегти як...</button>
            </div>
          </div>
          <div class="menu-dropdown">
            <button class="menu-btn">Вигляд</button>
            <div class="menu-dropdown-content">
              <button id="np-font-increase">Збільшити шрифт</button>
              <button id="np-font-decrease">Зменшити шрифт</button>
              <button id="np-toggle-wrap">Перенесення рядків: Увімк</button>
            </div>
          </div>
          <div class="notepad-search-toggle">
            <button class="menu-btn" id="np-btn-find">🔍 Пошук</button>
          </div>
        </div>

        <div class="notepad-find-bar" id="np-find-bar" style="display:none;">
          <input type="text" id="np-find-input" placeholder="Знайти текст..." />
          <button id="np-find-next">Знайти</button>
          <button id="np-find-close">✖</button>
        </div>

        <textarea class="notepad-textarea" id="np-textarea" spellcheck="false" placeholder="Введіть текст..."></textarea>

        <div class="notepad-statusbar">
          <span id="np-status-pos">Ряд 1, Стовп 1</span>
          <span id="np-status-chars">0 символів</span>
          <span id="np-status-dirty">Збережено</span>
          <span>UTF-8</span>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateTitle();
  }

  bindEvents() {
    const textarea = this.container.querySelector('#np-textarea');
    const statusPos = this.container.querySelector('#np-status-pos');
    const statusChars = this.container.querySelector('#np-status-chars');
    const statusDirty = this.container.querySelector('#np-status-dirty');

    textarea.addEventListener('input', () => {
      this.isDirty = true;
      statusDirty.textContent = '● Не збережено';
      statusChars.textContent = `${textarea.value.length} символів`;
      this.updateTitle();
    });

    const updateCursorPos = () => {
      const text = textarea.value.substr(0, textarea.selectionStart);
      const lines = text.split('\n');
      const lineNum = lines.length;
      const colNum = lines[lines.length - 1].length + 1;
      statusPos.textContent = `Ряд ${lineNum}, Стовп ${colNum}`;
    };

    textarea.addEventListener('keyup', updateCursorPos);
    textarea.addEventListener('click', updateCursorPos);

    // Гарячі клавіші
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveFile();
      }
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        this.toggleFindBar();
      }
    });

    // Меню кнопки
    this.container.querySelector('#np-file-new').addEventListener('click', () => this.newFile());
    this.container.querySelector('#np-file-save').addEventListener('click', () => this.saveFile());
    this.container.querySelector('#np-file-saveas').addEventListener('click', () => this.saveFileAs());
    this.container.querySelector('#np-btn-find').addEventListener('click', () => this.toggleFindBar());
    this.container.querySelector('#np-find-close').addEventListener('click', () => this.toggleFindBar(false));
    this.container.querySelector('#np-find-next').addEventListener('click', () => this.findText());

    this.container.querySelector('#np-font-increase').addEventListener('click', () => {
      this.fontSize = Math.min(32, this.fontSize + 2);
      textarea.style.fontSize = `${this.fontSize}px`;
    });
    this.container.querySelector('#np-font-decrease').addEventListener('click', () => {
      this.fontSize = Math.max(10, this.fontSize - 2);
      textarea.style.fontSize = `${this.fontSize}px`;
    });
    this.container.querySelector('#np-toggle-wrap').addEventListener('click', (e) => {
      this.wordWrap = !this.wordWrap;
      textarea.style.whiteSpace = this.wordWrap ? 'pre-wrap' : 'pre';
      e.target.textContent = `Перенесення рядків: ${this.wordWrap ? 'Увімк' : 'Вимк'}`;
    });
  }

  async loadFile(fileId) {
    const node = vfs.getNode(fileId);
    if (!node) return;
    this.fileId = node.id;
    this.fileName = node.name;
    const content = await vfs.readFile(node.id);
    const textarea = this.container.querySelector('#np-textarea');
    if (textarea) {
      textarea.value = typeof content === 'string' ? content : '';
      this.isDirty = false;
      this.container.querySelector('#np-status-dirty').textContent = 'Збережено';
      this.container.querySelector('#np-status-chars').textContent = `${textarea.value.length} символів`;
    }
    this.updateTitle();
  }

  updateTitle() {
    const dirtyMark = this.isDirty ? '*' : '';
    this.setTitle(`Блокнот — ${dirtyMark}${this.fileName}`);
  }

  async saveFile() {
    const textarea = this.container.querySelector('#np-textarea');
    const content = textarea.value;

    if (this.fileId) {
      try {
        await vfs.writeFile(this.fileId, content);
        this.isDirty = false;
        this.container.querySelector('#np-status-dirty').textContent = 'Збережено';
        this.updateTitle();
      } catch (err) {
        await dialogs.alert(`Помилка збереження: ${err.message}`, { icon: 'error', title: 'Блокнот' });
      }
    } else {
      await this.saveFileAs();
    }
  }

  async saveFileAs() {
    const textarea = this.container.querySelector('#np-textarea');
    const content = textarea.value;

    const saveResult = await dialogs.showSaveFileDialog({
      defaultName: this.fileName,
      defaultFolder: 'C:\\Користувачі\\Учень\\Документи',
      title: 'Збереження документа — Блокнот',
      content
    });

    if (!saveResult) return;

    try {
      const existingNode = vfs.resolvePath(saveResult.fullPath);
      let node;
      if (existingNode) {
        await vfs.writeFile(existingNode.id, content);
        node = existingNode;
      } else {
        node = await vfs.createFile(saveResult.folderId, saveResult.fileName, content);
      }

      this.fileId = node.id;
      this.fileName = node.name;
      this.isDirty = false;
      this.container.querySelector('#np-status-dirty').textContent = 'Збережено';
      this.updateTitle();
    } catch (err) {
      await dialogs.alert(`Помилка збереження: ${err.message}`, { icon: 'error', title: 'Блокнот' });
    }
  }

  async newFile() {
    if (this.isDirty) {
      const confirmed = await dialogs.confirm(
        'Незбережені зміни буде втрачено. Створити новий порожній документ?',
        { title: 'Новий документ', danger: true, confirmText: 'Створити', cancelText: 'Скасувати' }
      );
      if (!confirmed) return;
    }
    this.fileId = null;
    this.fileName = 'Без_назви.txt';
    this.isDirty = false;
    const textarea = this.container.querySelector('#np-textarea');
    textarea.value = '';
    this.container.querySelector('#np-status-dirty').textContent = 'Збережено';
    this.updateTitle();
  }

  toggleFindBar(show = null) {
    const findBar = this.container.querySelector('#np-find-bar');
    const isVisible = findBar.style.display !== 'none';
    const target = show !== null ? show : !isVisible;
    findBar.style.display = target ? 'flex' : 'none';
    if (target) {
      this.container.querySelector('#np-find-input').focus();
    }
  }

  async findText() {
    const query = this.container.querySelector('#np-find-input').value;
    if (!query) return;
    const textarea = this.container.querySelector('#np-textarea');
    const text = textarea.value;
    const start = textarea.selectionEnd || 0;
    const index = text.toLowerCase().indexOf(query.toLowerCase(), start);

    if (index !== -1) {
      textarea.focus();
      textarea.setSelectionRange(index, index + query.length);
    } else {
      // Пошук спочатку
      const restartIdx = text.toLowerCase().indexOf(query.toLowerCase(), 0);
      if (restartIdx !== -1) {
        textarea.focus();
        textarea.setSelectionRange(restartIdx, restartIdx + query.length);
      } else {
        await dialogs.alert(`Текст «${query}» не знайдено в документі.`, { title: 'Пошук у Блокноті', icon: 'info' });
      }
    }
  }
}
