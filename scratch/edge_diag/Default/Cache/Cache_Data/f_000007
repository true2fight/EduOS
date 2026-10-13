/**
 * DialogManager: Універсальний сервіс стильних Fluent UI діалогових вікон для EduOS
 * 
 * Замінює браузерні alert(), confirm(), prompt() на сучасні віртуальні модальні вікна:
 * - dialogs.alert(message, options)
 * - dialogs.confirm(message, options)
 * - dialogs.prompt(message, defaultValue, options)
 * - dialogs.showSaveFileDialog(options) — діалог збереження текстових файлів та документів
 * - dialogs.showNewFolderDialog(options) — діалог створення папки
 * - dialogs.showRenameDialog(options) — діалог перейменування файлу / папки
 */

import { vfs } from './filesystem.js';

class DialogManager {
  /**
   * Відображення інформаційного сповіщення
   */
  alert(message, options = {}) {
    return new Promise((resolve) => {
      const title = options.title || 'EduOS';
      const icon = options.icon || 'info'; // 'info' | 'error' | 'warning' | 'success'
      const okText = options.okText || 'Зрозуміло';

      const iconMap = {
        info: 'ℹ️',
        error: '⚠️',
        warning: '⚡',
        success: '✅'
      };

      const overlay = document.createElement('div');
      overlay.className = 'edu-modal-overlay fluent-modal-fadeIn';

      overlay.innerHTML = `
        <div class="fluent-dialog acrylic-panel fluent-dialog-alert" role="dialog" aria-modal="true">
          <div class="fluent-dialog-header">
            <div class="fluent-dialog-title-group">
              <span class="fluent-dialog-icon">${iconMap[icon] || 'ℹ️'}</span>
              <h3 class="fluent-dialog-title">${this.escapeHtml(title)}</h3>
            </div>
            <button class="fluent-dialog-close" title="Закрити">✕</button>
          </div>
          <div class="fluent-dialog-body">
            <div class="fluent-dialog-message">${this.escapeHtml(message)}</div>
          </div>
          <div class="fluent-dialog-footer">
            <button class="fluent-dialog-btn fluent-dialog-btn-primary" id="dlg-btn-ok">${this.escapeHtml(okText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const closeDialog = () => {
        overlay.classList.add('fluent-modal-fadeOut');
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(true);
        }, 150);
      };

      const okBtn = overlay.querySelector('#dlg-btn-ok');
      const closeBtn = overlay.querySelector('.fluent-dialog-close');

      okBtn.focus();
      okBtn.addEventListener('click', closeDialog);
      closeBtn.addEventListener('click', closeDialog);

      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
          e.preventDefault();
          closeDialog();
        }
      });
    });
  }

  /**
   * Діалог підтвердження дії (Так / Ні)
   */
  confirm(message, options = {}) {
    return new Promise((resolve) => {
      const title = options.title || 'Підтвердження дії';
      const confirmText = options.confirmText || 'Так';
      const cancelText = options.cancelText || 'Скасувати';
      const isDanger = !!options.danger;
      const icon = options.icon || (isDanger ? '⚠️' : '❓');

      const overlay = document.createElement('div');
      overlay.className = 'edu-modal-overlay fluent-modal-fadeIn';

      overlay.innerHTML = `
        <div class="fluent-dialog acrylic-panel fluent-dialog-confirm" role="dialog" aria-modal="true">
          <div class="fluent-dialog-header">
            <div class="fluent-dialog-title-group">
              <span class="fluent-dialog-icon">${icon}</span>
              <h3 class="fluent-dialog-title">${this.escapeHtml(title)}</h3>
            </div>
            <button class="fluent-dialog-close" title="Скасувати">✕</button>
          </div>
          <div class="fluent-dialog-body">
            <div class="fluent-dialog-message">${this.escapeHtml(message)}</div>
          </div>
          <div class="fluent-dialog-footer">
            <button class="fluent-dialog-btn fluent-dialog-btn-secondary" id="dlg-btn-cancel">${this.escapeHtml(cancelText)}</button>
            <button class="fluent-dialog-btn ${isDanger ? 'fluent-dialog-btn-danger' : 'fluent-dialog-btn-primary'}" id="dlg-btn-confirm">${this.escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const finish = (result) => {
        overlay.classList.add('fluent-modal-fadeOut');
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(result);
        }, 150);
      };

      const confirmBtn = overlay.querySelector('#dlg-btn-confirm');
      const cancelBtn = overlay.querySelector('#dlg-btn-cancel');
      const closeBtn = overlay.querySelector('.fluent-dialog-close');

      confirmBtn.focus();
      confirmBtn.addEventListener('click', () => finish(true));
      cancelBtn.addEventListener('click', () => finish(false));
      closeBtn.addEventListener('click', () => finish(false));

      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        }
      });
    });
  }

  /**
   * Діалог введення тексту
   */
  prompt(message, defaultValue = '', options = {}) {
    return new Promise((resolve) => {
      const title = options.title || 'Введення даних';
      const placeholder = options.placeholder || '';
      const okText = options.okText || 'ОК';
      const cancelText = options.cancelText || 'Скасувати';

      const overlay = document.createElement('div');
      overlay.className = 'edu-modal-overlay fluent-modal-fadeIn';

      overlay.innerHTML = `
        <div class="fluent-dialog acrylic-panel fluent-dialog-prompt" role="dialog" aria-modal="true">
          <div class="fluent-dialog-header">
            <div class="fluent-dialog-title-group">
              <span class="fluent-dialog-icon">✏️</span>
              <h3 class="fluent-dialog-title">${this.escapeHtml(title)}</h3>
            </div>
            <button class="fluent-dialog-close" title="Скасувати">✕</button>
          </div>
          <div class="fluent-dialog-body">
            <label class="fluent-dialog-label">${this.escapeHtml(message)}</label>
            <input type="text" class="fluent-dialog-input" id="dlg-prompt-input" value="${this.escapeHtml(defaultValue)}" placeholder="${this.escapeHtml(placeholder)}" />
          </div>
          <div class="fluent-dialog-footer">
            <button class="fluent-dialog-btn fluent-dialog-btn-secondary" id="dlg-btn-cancel">${this.escapeHtml(cancelText)}</button>
            <button class="fluent-dialog-btn fluent-dialog-btn-primary" id="dlg-btn-ok">${this.escapeHtml(okText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector('#dlg-prompt-input');
      input.focus();
      input.select();

      const finish = (result) => {
        overlay.classList.add('fluent-modal-fadeOut');
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(result);
        }, 150);
      };

      overlay.querySelector('#dlg-btn-ok').addEventListener('click', () => finish(input.value.trim()));
      overlay.querySelector('#dlg-btn-cancel').addEventListener('click', () => finish(null));
      overlay.querySelector('.fluent-dialog-close').addEventListener('click', () => finish(null));

      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          finish(input.value.trim());
        }
      });
    });
  }

  /**
   * Спеціальний діалог збереження текстового файлу (Зберегти як...) у Блокноті
   */
  showSaveFileDialog(options = {}) {
    return new Promise(async (resolve) => {
      const defaultName = options.defaultName || 'Документ.txt';
      const defaultFolder = options.defaultFolder || 'C:\\Користувачі\\Учень\\Документи';
      const title = options.title || 'Зберегти як...';
      const defaultContent = options.content !== undefined ? options.content : '';

      // Базові папки для швидкого вибору
      const quickFolders = [
        { path: 'C:\\Користувачі\\Учень\\Документи', name: '📁 Документи (C:\\Користувачі\\Учень\\Документи)' },
        { path: 'C:\\Користувачі\\Учень\\Робочий стіл', name: '🖥️ Робочий стіл (C:\\Користувачі\\Учень\\Робочий стіл)' },
        { path: 'C:\\Користувачі\\Учень\\Зображення', name: '🖼️ Зображення (C:\\Користувачі\\Учень\\Зображення)' },
        { path: 'D:\\Практичні роботи', name: '💾 Навчальний диск (D:\\Практичні роботи)' }
      ];

      // Виділяємо чисте ім'я та розширення
      const extIndex = defaultName.lastIndexOf('.');
      const baseName = extIndex !== -1 ? defaultName.substring(0, extIndex) : defaultName;
      const baseExt = extIndex !== -1 ? defaultName.substring(extIndex) : '.txt';

      const overlay = document.createElement('div');
      overlay.className = 'edu-modal-overlay fluent-modal-fadeIn';

      overlay.innerHTML = `
        <div class="fluent-dialog acrylic-panel fluent-dialog-savefile" role="dialog" aria-modal="true">
          <div class="fluent-dialog-header">
            <div class="fluent-dialog-title-group">
              <span class="fluent-dialog-icon">💾</span>
              <h3 class="fluent-dialog-title">${this.escapeHtml(title)}</h3>
            </div>
            <button class="fluent-dialog-close" title="Скасувати">✕</button>
          </div>
          <div class="fluent-dialog-body">
            <!-- Вибір цільової папки -->
            <div class="fluent-dialog-field">
              <label class="fluent-dialog-label" for="dlg-save-folder">Папка призначення:</label>
              <select id="dlg-save-folder" class="fluent-dialog-select">
                ${quickFolders.map(f => `
                  <option value="${this.escapeHtml(f.path)}" ${f.path === defaultFolder ? 'selected' : ''}>
                    ${this.escapeHtml(f.name)}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Введення імені файлу -->
            <div class="fluent-dialog-field">
              <label class="fluent-dialog-label" for="dlg-save-name">Ім'я файлу:</label>
              <div class="fluent-dialog-input-ext-group">
                <input type="text" id="dlg-save-name" class="fluent-dialog-input" value="${this.escapeHtml(baseName)}" placeholder="Введіть назву документа" />
                <span class="fluent-dialog-ext-tag" id="dlg-save-ext-tag">${this.escapeHtml(baseExt)}</span>
              </div>
            </div>

            <!-- Тип файлу -->
            <div class="fluent-dialog-field">
              <label class="fluent-dialog-label" for="dlg-save-type">Тип файлу:</label>
              <select id="dlg-save-type" class="fluent-dialog-select">
                <option value=".txt" selected>Текстовий документ (*.txt)</option>
                <option value=".md">Markdown документ (*.md)</option>
                <option value=".json">JSON файл (*.json)</option>
                <option value="all">Усі файли (*.*)</option>
              </select>
            </div>

            <!-- Інформаційна плашка -->
            <div class="fluent-save-info-card">
              <span class="fluent-save-info-icon">📄</span>
              <div class="fluent-save-info-meta">
                <span class="fluent-save-info-encoding">Кодування: UTF-8</span>
                <span class="fluent-save-info-system">Файлова система: EduOS Virtual VFS</span>
              </div>
            </div>
          </div>
          <div class="fluent-dialog-footer">
            <button class="fluent-dialog-btn fluent-dialog-btn-secondary" id="dlg-save-cancel">Скасувати</button>
            <button class="fluent-dialog-btn fluent-dialog-btn-primary" id="dlg-save-confirm">💾 Зберегти</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const nameInput = overlay.querySelector('#dlg-save-name');
      const folderSelect = overlay.querySelector('#dlg-save-folder');
      const typeSelect = overlay.querySelector('#dlg-save-type');
      const extTag = overlay.querySelector('#dlg-save-ext-tag');

      nameInput.focus();
      nameInput.select();

      typeSelect.addEventListener('change', () => {
        const val = typeSelect.value;
        if (val === 'all') {
          extTag.textContent = '';
          extTag.style.display = 'none';
        } else {
          extTag.textContent = val;
          extTag.style.display = 'inline-flex';
        }
      });

      const finish = (result) => {
        overlay.classList.add('fluent-modal-fadeOut');
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(result);
        }, 150);
      };

      const handleSave = async () => {
        let rawName = nameInput.value.trim();
        if (!rawName) {
          nameInput.focus();
          return;
        }

        // Перевірка на заборонені символи
        if (/[\\/:*?"<>|]/.test(rawName)) {
          await this.alert('Ім\'я файлу не може містити таких символів: \\ / : * ? " < > |', {
            title: 'Неприпустиме ім\'я',
            icon: 'error'
          });
          nameInput.focus();
          return;
        }

        const selectedType = typeSelect.value;
        let finalName = rawName;
        if (selectedType !== 'all') {
          if (!finalName.toLowerCase().endsWith(selectedType.toLowerCase())) {
            finalName += selectedType;
          }
        }

        const folderPath = folderSelect.value;
        const targetDir = vfs.resolvePath(folderPath);
        if (!targetDir) {
          await this.alert(`Цільову папку «${folderPath}» не знайдено.`, { icon: 'error' });
          return;
        }

        // Перевірка, чи файл уже існує
        const existingNode = vfs.resolvePath(`${folderPath}\\${finalName}`);
        if (existingNode) {
          const overwrite = await this.confirm(
            `Файл із назвою «${finalName}» вже існує в цій папці.\nБажаєте замінити наявний файл?`,
            {
              title: 'Підтвердження перезапису файлу',
              confirmText: 'Замінити',
              cancelText: 'Ні',
              danger: true
            }
          );
          if (!overwrite) {
            nameInput.focus();
            return;
          }
        }

        finish({
          folderId: targetDir.id,
          folderPath: folderPath,
          fileName: finalName,
          fullPath: `${folderPath}\\${finalName}`,
          content: defaultContent
        });
      };

      overlay.querySelector('#dlg-save-confirm').addEventListener('click', handleSave);
      overlay.querySelector('#dlg-save-cancel').addEventListener('click', () => finish(null));
      overlay.querySelector('.fluent-dialog-close').addEventListener('click', () => finish(null));

      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleSave();
        }
      });
    });
  }

  /**
   * Спеціальний діалог створення нової папки
   */
  showNewFolderDialog(options = {}) {
    return new Promise((resolve) => {
      const defaultName = options.defaultName || 'Нова папка';
      const title = options.title || 'Створення папки';
      const parentName = options.parentName || 'поточній папці';

      const overlay = document.createElement('div');
      overlay.className = 'edu-modal-overlay fluent-modal-fadeIn';

      overlay.innerHTML = `
        <div class="fluent-dialog acrylic-panel fluent-dialog-newfolder" role="dialog" aria-modal="true">
          <div class="fluent-dialog-header">
            <div class="fluent-dialog-title-group">
              <span class="fluent-dialog-icon">📁</span>
              <h3 class="fluent-dialog-title">${this.escapeHtml(title)}</h3>
            </div>
            <button class="fluent-dialog-close" title="Скасувати">✕</button>
          </div>
          <div class="fluent-dialog-body">
            <label class="fluent-dialog-label" for="dlg-newfolder-input">Введіть ім'я для нової папки в ${this.escapeHtml(parentName)}:</label>
            <div class="fluent-dialog-input-wrapper">
              <span class="fluent-dialog-input-icon">📁</span>
              <input type="text" id="dlg-newfolder-input" class="fluent-dialog-input" value="${this.escapeHtml(defaultName)}" placeholder="Нова папка" />
            </div>
            <div class="fluent-dialog-hint">Ім'я не може містити символів: \\ / : * ? " &lt; &gt; |</div>
          </div>
          <div class="fluent-dialog-footer">
            <button class="fluent-dialog-btn fluent-dialog-btn-secondary" id="dlg-newfolder-cancel">Скасувати</button>
            <button class="fluent-dialog-btn fluent-dialog-btn-primary" id="dlg-newfolder-confirm">📁 Створити папку</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector('#dlg-newfolder-input');
      input.focus();
      input.select();

      const finish = (result) => {
        overlay.classList.add('fluent-modal-fadeOut');
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(result);
        }, 150);
      };

      const handleConfirm = async () => {
        const val = input.value.trim();
        if (!val) {
          input.focus();
          return;
        }

        if (/[\\/:*?"<>|]/.test(val)) {
          await this.alert('Ім\'я папки не може містити таких символів: \\ / : * ? " < > |', {
            title: 'Неприпустиме ім\'я папки',
            icon: 'error'
          });
          input.focus();
          return;
        }

        finish(val);
      };

      overlay.querySelector('#dlg-newfolder-confirm').addEventListener('click', handleConfirm);
      overlay.querySelector('#dlg-newfolder-cancel').addEventListener('click', () => finish(null));
      overlay.querySelector('.fluent-dialog-close').addEventListener('click', () => finish(null));

      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirm();
        }
      });
    });
  }

  /**
   * Спеціальний діалог перейменування файлу або папки
   */
  showRenameDialog(options = {}) {
    return new Promise((resolve) => {
      const currentName = options.currentName || 'Об\'єкт';
      const isDirectory = !!options.isDirectory;
      const title = isDirectory ? 'Перейменування папки' : 'Перейменування файлу';
      const icon = isDirectory ? '📁' : '✏️';

      const overlay = document.createElement('div');
      overlay.className = 'edu-modal-overlay fluent-modal-fadeIn';

      overlay.innerHTML = `
        <div class="fluent-dialog acrylic-panel fluent-dialog-rename" role="dialog" aria-modal="true">
          <div class="fluent-dialog-header">
            <div class="fluent-dialog-title-group">
              <span class="fluent-dialog-icon">${icon}</span>
              <h3 class="fluent-dialog-title">${this.escapeHtml(title)}</h3>
            </div>
            <button class="fluent-dialog-close" title="Скасувати">✕</button>
          </div>
          <div class="fluent-dialog-body">
            <label class="fluent-dialog-label" for="dlg-rename-input">Введіть нову назву для «${this.escapeHtml(currentName)}»:</label>
            <div class="fluent-dialog-input-wrapper">
              <span class="fluent-dialog-input-icon">${icon}</span>
              <input type="text" id="dlg-rename-input" class="fluent-dialog-input" value="${this.escapeHtml(currentName)}" />
            </div>
            <div class="fluent-dialog-hint">Ім'я не повинно містити спеціальних символів \\ / : * ? " &lt; &gt; |</div>
          </div>
          <div class="fluent-dialog-footer">
            <button class="fluent-dialog-btn fluent-dialog-btn-secondary" id="dlg-rename-cancel">Скасувати</button>
            <button class="fluent-dialog-btn fluent-dialog-btn-primary" id="dlg-rename-confirm">Перейменувати</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector('#dlg-rename-input');
      input.focus();

      // Якщо це файл із розширенням, виділяємо лише базове ім'я без крапки та розширення
      if (!isDirectory && currentName.includes('.')) {
        const lastDot = currentName.lastIndexOf('.');
        if (lastDot > 0) {
          input.setSelectionRange(0, lastDot);
        } else {
          input.select();
        }
      } else {
        input.select();
      }

      const finish = (result) => {
        overlay.classList.add('fluent-modal-fadeOut');
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(result);
        }, 150);
      };

      const handleConfirm = async () => {
        const val = input.value.trim();
        if (!val || val === currentName) {
          finish(null);
          return;
        }

        if (/[\\/:*?"<>|]/.test(val)) {
          await this.alert('Ім\'я не може містити таких символів: \\ / : * ? " < > |', {
            title: 'Неприпустиме ім\'я',
            icon: 'error'
          });
          input.focus();
          return;
        }

        finish(val);
      };

      overlay.querySelector('#dlg-rename-confirm').addEventListener('click', handleConfirm);
      overlay.querySelector('#dlg-rename-cancel').addEventListener('click', () => finish(null));
      overlay.querySelector('.fluent-dialog-close').addEventListener('click', () => finish(null));

      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirm();
        }
      });
    });
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const dialogs = new DialogManager();
