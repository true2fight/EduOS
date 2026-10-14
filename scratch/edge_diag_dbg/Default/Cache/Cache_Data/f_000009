/**
 * InputLanguageManager: Керування мовою введення тексту в EduOS (УКР / ENG)
 * 
 * Можливості:
 * - Підтримка перемикання між українською (uk) та англійською (en) розкладками.
 * - Оновлення індикатора в системному треї (УКР / ENG).
 * - Швидка зміна мови кліком по кнопці в панелі завдань з викликом меню Flyout та HUD.
 * - Гарячі клавіші перемикання: Alt+Shift та Ctrl+Shift.
 * - Windows 11-стильний Fluent HUD оверлей при зміні мови.
 * - Інтерактивна трансляція клавіатури (Virtual Keyboard Layout Mapping) для навчальних полів
 *   (дозволяє учневі друкувати потрібною мовою незалежно від поточної фізичної розкладки комп'ютера).
 */

import { eventBus } from './event-bus.js';

class InputLanguageManager {
  constructor() {
    this.currentLang = 'uk'; // 'uk' | 'en'
    this.autoTranslateEnabled = true; // віртуальна трансляція введення
    this.flyoutEl = null;
    this.hudEl = null;
    this.hudTimeout = null;
    this.flyoutAutoCloseTimer = null;
    this._listenersAttached = false;

    // Словник розкладки клавіатури QWERTY <-> ЙЦУКЕН
    this.enToUkMap = {
      'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з', '[': 'х', ']': 'ї',
      'a': 'ф', 's': 'і', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д', ';': 'ж', '\'': 'є',
      'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь', ',': 'б', '.': 'ю', '`': '\'',
      'Q': 'Й', 'W': 'Ц', 'E': 'У', 'R': 'К', 'T': 'Е', 'Y': 'Н', 'U': 'Г', 'I': 'Ш', 'O': 'Щ', 'P': 'З', '{': 'Х', '}': 'Ї',
      'A': 'Ф', 'S': 'І', 'D': 'В', 'F': 'А', 'G': 'П', 'H': 'Р', 'J': 'О', 'K': 'Л', 'L': 'Д', ':': 'Ж', '"': 'Є',
      'Z': 'Я', 'X': 'Ч', 'C': 'С', 'V': 'М', 'B': 'И', 'N': 'Т', 'M': 'Ь', '<': 'Б', '>': 'Ю', '~': '₴',
      '@': '"', '#': '№', '$': ';', '^': ':', '&': '?'
    };

    this.ukToEnMap = {};
    for (const [enKey, ukKey] of Object.entries(this.enToUkMap)) {
      if (!this.ukToEnMap[ukKey]) {
        this.ukToEnMap[ukKey] = enKey;
      }
    }
    // Додаткові специфічні літери
    this.ukToEnMap['і'] = 's';
    this.ukToEnMap['І'] = 'S';
    this.ukToEnMap['ї'] = ']';
    this.ukToEnMap['Ї'] = '}';
    this.ukToEnMap['є'] = '\'';
    this.ukToEnMap['Є'] = '"';
    this.ukToEnMap['ґ'] = 'g';
    this.ukToEnMap['Ґ'] = 'G';
  }

  init() {
    // Відновлення налаштувань із localStorage
    const savedLang = localStorage.getItem('eduos_input_language');
    if (savedLang === 'en' || savedLang === 'uk') {
      this.currentLang = savedLang;
    }

    const savedAuto = localStorage.getItem('eduos_autotranslate_layout');
    if (savedAuto !== null) {
      this.autoTranslateEnabled = savedAuto === 'true';
    }

    this.createHudElement();
    this.createFlyoutElement();
    this.updateBadge();
    this.setupListeners();
  }

  getLanguage() {
    return this.currentLang;
  }

  setLanguage(lang, showNotification = true) {
    if (lang !== 'uk' && lang !== 'en') return;
    this.currentLang = lang;
    localStorage.setItem('eduos_input_language', lang);

    this.updateBadge();
    this.updateFlyout();

    if (showNotification) {
      this.showHudNotification();
    } else {
      this.hideHudNotification();
    }

    eventBus.emit('language:changed', { lang: this.currentLang });
  }

  toggleLanguage(showNotification = true) {
    const nextLang = this.currentLang === 'uk' ? 'en' : 'uk';
    this.setLanguage(nextLang, showNotification);
  }

  setAutoTranslate(enabled) {
    this.autoTranslateEnabled = enabled;
    localStorage.setItem('eduos_autotranslate_layout', enabled ? 'true' : 'false');
    this.updateFlyout();
  }

  updateBadge() {
    const badges = document.querySelectorAll('.tray-lang-badge');
    badges.forEach((b) => {
      b.textContent = this.currentLang === 'uk' ? 'УКР' : 'ENG';
      b.title = this.currentLang === 'uk' 
        ? 'Мова введення: Українська (Клік для зміни, гарячі клавіші: Ctrl+Shift)' 
        : 'Input Language: English (Click to switch, hotkey: Ctrl+Shift)';
    });
  }

  createHudElement() {
    if (document.getElementById('edu-lang-hud')) {
      this.hudEl = document.getElementById('edu-lang-hud');
      return;
    }

    this.hudEl = document.createElement('div');
    this.hudEl.id = 'edu-lang-hud';
    this.hudEl.className = 'edu-lang-hud acrylic-panel';
    this.hudEl.innerHTML = `
      <div class="lang-hud-card">
        <div class="lang-hud-title">Мова введення EduOS</div>
        <div class="lang-hud-options">
          <div class="lang-hud-item" data-lang="uk">
            <span class="lang-hud-code">УКР</span>
            <div class="lang-hud-meta">
              <span class="lang-hud-name">Українська</span>
              <span class="lang-hud-desc">Розкладка клавіатури</span>
            </div>
          </div>
          <div class="lang-hud-item" data-lang="en">
            <span class="lang-hud-code">ENG</span>
            <div class="lang-hud-meta">
              <span class="lang-hud-name">English</span>
              <span class="lang-hud-desc">United States layout</span>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.hudEl);
  }

  createFlyoutElement() {
    if (document.getElementById('edu-lang-flyout')) {
      this.flyoutEl = document.getElementById('edu-lang-flyout');
      this.updateFlyout();
      return;
    }

    this.flyoutEl = document.createElement('div');
    this.flyoutEl.id = 'edu-lang-flyout';
    this.flyoutEl.className = 'edu-lang-flyout acrylic-panel';
    document.body.appendChild(this.flyoutEl);

    this.flyoutEl.addEventListener('mouseenter', () => {
      if (this.flyoutAutoCloseTimer) clearTimeout(this.flyoutAutoCloseTimer);
    });
    this.flyoutEl.addEventListener('mouseleave', () => {
      this.flyoutAutoCloseTimer = setTimeout(() => {
        this.hideFlyout();
      }, 1000);
    });

    this.updateFlyout();
  }

  updateFlyout() {
    if (!this.flyoutEl) return;

    const isUk = this.currentLang === 'uk';
    this.flyoutEl.innerHTML = `
      <div class="lang-flyout-card">
        <div class="lang-flyout-header">
          <div class="lang-flyout-title-row">
            <span class="lang-flyout-title">Мова введення EduOS</span>
            <span class="lang-flyout-shortcut-badge" title="Гаряча комбінація: тільки Ctrl+Shift">Ctrl + Shift</span>
          </div>
        </div>
        <div class="lang-flyout-options">
          <div class="lang-flyout-item ${isUk ? 'active' : ''}" data-lang="uk" role="button" tabindex="0">
            <span class="lang-flyout-code">УКР</span>
            <div class="lang-flyout-meta">
              <span class="lang-flyout-name">Українська</span>
              <span class="lang-flyout-desc">Розкладка клавіатури</span>
            </div>
            <span class="lang-flyout-check">${isUk ? '✓' : ''}</span>
          </div>
          <div class="lang-flyout-item ${!isUk ? 'active' : ''}" data-lang="en" role="button" tabindex="0">
            <span class="lang-flyout-code">ENG</span>
            <div class="lang-flyout-meta">
              <span class="lang-flyout-name">English</span>
              <span class="lang-flyout-desc">United States layout</span>
            </div>
            <span class="lang-flyout-check">${!isUk ? '✓' : ''}</span>
          </div>
        </div>
        <div class="lang-flyout-footer">
          <label class="lang-flyout-toggle-label">
            <input type="checkbox" id="lang-flyout-autotranslate" ${this.autoTranslateEnabled ? 'checked' : ''} />
            <span>Віртуальна трансляція клавіатури</span>
          </label>
        </div>
      </div>
    `;

    // Події кліку на елементи меню
    this.flyoutEl.querySelectorAll('.lang-flyout-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = item.dataset.lang;
        this.setLanguage(lang, false); // false = НЕ показувати центральне вікно HUD
        if (this.flyoutAutoCloseTimer) clearTimeout(this.flyoutAutoCloseTimer);
        this.flyoutAutoCloseTimer = setTimeout(() => {
          this.hideFlyout();
        }, 600);
      });
    });

    const autoCb = this.flyoutEl.querySelector('#lang-flyout-autotranslate');
    if (autoCb) {
      autoCb.addEventListener('change', (e) => {
        e.stopPropagation();
        this.setAutoTranslate(autoCb.checked);
      });
    }
  }

  showHudNotification() {
    if (!this.hudEl) return;

    const ukItem = this.hudEl.querySelector('.lang-hud-item[data-lang="uk"]');
    const enItem = this.hudEl.querySelector('.lang-hud-item[data-lang="en"]');

    if (this.currentLang === 'uk') {
      ukItem?.classList.add('active');
      enItem?.classList.remove('active');
    } else {
      ukItem?.classList.remove('active');
      enItem?.classList.add('active');
    }

    this.hudEl.classList.add('visible');

    if (this.hudTimeout) {
      clearTimeout(this.hudTimeout);
    }

    // Зменшено у 2 рази (було 1400 мс -> стало 700 мс)
    this.hudTimeout = setTimeout(() => {
      this.hudEl.classList.remove('visible');
    }, 700);
  }

  hideHudNotification() {
    if (this.hudEl) {
      this.hudEl.classList.remove('visible');
    }
    if (this.hudTimeout) {
      clearTimeout(this.hudTimeout);
      this.hudTimeout = null;
    }
  }

  showFlyout() {
    if (!this.flyoutEl) return;
    this.updateFlyout();

    // Динамічне вирівнювання точно над кнопкою мови в системному треї
    const badge = document.querySelector('.tray-lang-badge');
    if (badge) {
      const rect = badge.getBoundingClientRect();
      const flyoutWidth = 310;
      let right = window.innerWidth - rect.right - 8;
      if (right < 8) right = 8;
      if (right + flyoutWidth > window.innerWidth) {
        right = window.innerWidth - flyoutWidth - 8;
      }
      this.flyoutEl.style.right = `${right}px`;
      this.flyoutEl.style.bottom = `${(window.innerHeight - rect.top) + 8}px`;
    }

    this.flyoutEl.classList.add('open');
  }

  hideFlyout() {
    if (this.flyoutEl) {
      this.flyoutEl.classList.remove('open');
    }
    if (this.flyoutAutoCloseTimer) {
      clearTimeout(this.flyoutAutoCloseTimer);
      this.flyoutAutoCloseTimer = null;
    }
  }

  toggleFlyout() {
    if (this.flyoutEl?.classList.contains('open')) {
      this.hideFlyout();
    } else {
      this.showFlyout();
    }
  }

  /**
   * Обробка кліку по кнопці в панелі завдань (треї)
   */
  handleBadgeClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 1. Приховуємо центральне вікно HUD, якщо воно було відкрите
    this.hideHudNotification();

    // 2. Миттєво перемикаємо мову (УКР <-> ENG) БЕЗ показу центрального вікна HUD
    this.toggleLanguage(false);

    // 3. Відображаємо випадаюче вікно Flyout виключно біля кнопки на панелі задач
    this.showFlyout();

    // 4. Автоматично приховуємо Flyout (зменшено у 2 рази: було 3500 мс -> стало 1750 мс)
    if (this.flyoutAutoCloseTimer) clearTimeout(this.flyoutAutoCloseTimer);
    this.flyoutAutoCloseTimer = setTimeout(() => {
      this.hideFlyout();
    }, 1750);
  }

  setupListeners() {
    if (this._listenersAttached) return;
    this._listenersAttached = true;

    // 1. Глобальне делегування кліків для кнопки мови в треї
    document.addEventListener('click', (e) => {
      const badge = e.target.closest('.tray-lang-badge');
      if (badge) {
        this.handleBadgeClick(e);
        return;
      }

      // Якщо клік всередині самого меню вибору мови - залишаємо меню відкритим для взаємодії
      if (this.flyoutEl && this.flyoutEl.contains(e.target)) {
        return;
      }

      // Клік за межами меню та кнопки - закриваємо меню
      if (this.flyoutEl && this.flyoutEl.classList.contains('open')) {
        this.hideFlyout();
      }
    });

    // Правий клік по кнопці мови відкриває меню біля кнопки без обов'язкової зміни поточної мови
    document.addEventListener('contextmenu', (e) => {
      const badge = e.target.closest('.tray-lang-badge');
      if (badge) {
        e.preventDefault();
        e.stopPropagation();
        this.hideHudNotification();
        this.toggleFlyout();
      }
    });

    // 2. Гарячі клавіші перемикання (ТІЛЬКИ Ctrl+Shift; комбінація Alt+Shift вимкнена)
    window.addEventListener('keydown', (e) => {
      // Тільки Ctrl + Shift (без Alt і без Meta/Win)
      const isCtrlShift = (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey);

      if (isCtrlShift) {
        e.preventDefault();
        // Приховуємо вікно біля панелі задач
        this.hideFlyout();
        // Показуємо виключно центральне вікно оверлею HUD
        this.toggleLanguage(true);
      }
    }, true);

    // 3. Інтерактивна трансляція клавіатури для полів вводу (beforeinput)
    document.addEventListener('beforeinput', (e) => {
      if (!this.autoTranslateEnabled) return;
      if (e.inputType !== 'insertText' || !e.data) return;

      const target = e.target;
      const isEditable = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      if (!isEditable) return;
      if (target.type === 'password' || target.type === 'number' || target.type === 'date') return;

      const translated = this.translateText(e.data);
      if (translated !== e.data) {
        e.preventDefault();
        this.insertTextAtCursor(target, translated);
      }
    }, true);
  }

  /**
   * Трансляція символів відповідно до активної розкладки EduOS
   */
  translateText(text) {
    if (!text || !this.autoTranslateEnabled) return text;

    let result = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (this.currentLang === 'uk') {
        // Якщо EduOS у режимі УКР, але введено латинський символ з англійської клавіатури
        result += this.enToUkMap[ch] !== undefined ? this.enToUkMap[ch] : ch;
      } else {
        // Якщо EduOS у режимі ENG, але введено кириличний символ з української клавіатури
        result += this.ukToEnMap[ch] !== undefined ? this.ukToEnMap[ch] : ch;
      }
    }
    return result;
  }

  insertTextAtCursor(el, text) {
    if (typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      el.value = val.substring(0, start) + text + val.substring(end);
      el.selectionStart = el.selectionEnd = start + text.length;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      document.execCommand('insertText', false, text);
    }
  }
}

export const inputLanguage = new InputLanguageManager();
