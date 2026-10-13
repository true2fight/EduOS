/**
 * AboutSystemApp: Вікно інформації «Про систему EduOS»
 * Відображає опис навчальної операційної системи, її можливості та дані про автора.
 */
import { BaseApp } from './base-app.js';
import { windowManager } from '../core/window-manager.js';

export class AboutSystemApp extends BaseApp {
  init() {
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="about-system-layout">
        <div class="about-system-header">
          <div class="about-logo-wrapper">
            <img src="assets/icons/logo.svg" alt="EduOS Logo" width="56" height="56" />
          </div>
          <div class="about-title-block">
            <h1 class="about-system-title">EduOS</h1>
            <div class="about-system-subtitle">Навчальна операційна система для комп'ютерного класу</div>
            <div class="about-system-version">Версія 2.0 (Україна, 2026)</div>
          </div>
        </div>

        <div class="about-system-body">
          <div class="about-info-card">
            <div class="about-info-badge">Призначення системи</div>
            <p class="about-text-lead">EduOS - навчальна операційна система EduOS.</p>
            <p class="about-text-desc">Ви зможете відпрацювати навички створювати, відкривати, перейменовувати, копіювати, переміщувати та видаляти файли й папки, шукати файли, працювати з адресним рядком, властивостями, кошиком, програмою архіватором. Навчитеся користуватися локальною та глобальною мережами.</p>
          </div>

          <div class="about-author-card">
            <div class="about-author-avatar">👨‍🏫</div>
            <div class="about-author-content">
              <div class="about-author-title">Автор проєкту:</div>
              <div class="about-author-name">Шпак Олександр Миколайович</div>
              <div class="about-author-role">учитель інформатики Іванівського ліцею №1 Іванівської селищної ради Херсонської області</div>
            </div>
          </div>
        </div>

        <div class="about-system-footer">
          <button class="btn btn-primary" id="about-btn-close">Зрозуміло</button>
        </div>
      </div>
    `;

    const closeBtn = this.container.querySelector('#about-btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (this.win) {
          windowManager.closeWindow(this.win.id);
        }
      });
    }
  }
}
