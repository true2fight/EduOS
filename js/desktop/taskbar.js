/**
 * TaskbarManager: Керування панеллю завдань EduOS
 * Відображає кнопку «Пуск», кнопки активних програм, системний годинник та трей.
 */
import { windowManager } from '../core/window-manager.js';
import { eventBus } from '../core/event-bus.js';
import { inputLanguage } from '../core/input-language.js';

class TaskbarManager {
  constructor() {
    this.container = null;
    this.startBtn = null;
    this.tasksListEl = null;
    this.clockEl = null;
    this.clockInterval = null;
    this.calClockInterval = null;
    this.calendarFlyoutEl = null;
    this.isCalendarOpen = false;
    this.viewYear = new Date().getFullYear();
    this.viewMonth = new Date().getMonth();
    this.isInitialized = false;
  }

  init(containerElement) {
    this.container = containerElement || document.getElementById('taskbar');
    this.startBtn = document.getElementById('start-button');
    this.tasksListEl = document.getElementById('taskbar-apps');
    this.clockEl = document.getElementById('taskbar-clock');

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.setupClock();
      this.initCalendarFlyout();
      this.setupListeners();
    }

    this.renderTasks();
    inputLanguage.updateBadge();
  }

  setupClock() {
    if (!this.clockEl) return;

    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();

      this.clockEl.innerHTML = `
        <div class="clock-time">${hours}:${minutes}</div>
        <div class="clock-date">${day}.${month}.${year}</div>
      `;
      this.clockEl.title = now.toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' (Клік для відкриття календаря)';
    };

    updateTime();
    this.clockInterval = setInterval(updateTime, 1000);
  }

  initCalendarFlyout() {
    if (document.getElementById('taskbar-calendar-flyout')) {
      this.calendarFlyoutEl = document.getElementById('taskbar-calendar-flyout');
      return;
    }

    this.calendarFlyoutEl = document.createElement('div');
    this.calendarFlyoutEl.id = 'taskbar-calendar-flyout';
    this.calendarFlyoutEl.className = 'taskbar-calendar-flyout acrylic-panel';
    document.body.appendChild(this.calendarFlyoutEl);
  }

  toggleCalendar() {
    if (this.isCalendarOpen) {
      this.hideCalendar();
    } else {
      this.showCalendar();
    }
  }

  showCalendar() {
    if (!this.calendarFlyoutEl) this.initCalendarFlyout();

    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();

    this.renderCalendar();
    this.calendarFlyoutEl.classList.add('visible');
    this.isCalendarOpen = true;

    // Оновлення живого секундного годинника у шапці календаря
    if (this.calClockInterval) clearInterval(this.calClockInterval);
    this.calClockInterval = setInterval(() => {
      const liveTimeEl = this.calendarFlyoutEl.querySelector('.cal-live-time');
      if (liveTimeEl) {
        const cur = new Date();
        const h = String(cur.getHours()).padStart(2, '0');
        const m = String(cur.getMinutes()).padStart(2, '0');
        const s = String(cur.getSeconds()).padStart(2, '0');
        liveTimeEl.textContent = `${h}:${m}:${s}`;
      }
    }, 1000);
  }

  hideCalendar() {
    if (this.calendarFlyoutEl) {
      this.calendarFlyoutEl.classList.remove('visible');
    }
    this.isCalendarOpen = false;
    if (this.calClockInterval) {
      clearInterval(this.calClockInterval);
      this.calClockInterval = null;
    }
  }

  renderCalendar() {
    if (!this.calendarFlyoutEl) return;

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    const monthNames = [
      'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
      'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
    ];

    const curH = String(now.getHours()).padStart(2, '0');
    const curM = String(now.getMinutes()).padStart(2, '0');
    const curS = String(now.getSeconds()).padStart(2, '0');

    // Форматування повної поточної дати українською
    const fullDateStr = now.toLocaleDateString('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Розрахунок днів календаря
    const firstDayIndex = new Date(this.viewYear, this.viewMonth, 1).getDay(); // 0 = Нд, 1 = Пн ...
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // 0 для Пн, 6 для Нд

    const daysInCurrentMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.viewYear, this.viewMonth, 0).getDate();

    let daysHtml = '';

    // 1. Попередній місяць
    for (let i = startOffset - 1; i >= 0; i--) {
      daysHtml += `<div class="cal-day other-month">${daysInPrevMonth - i}</div>`;
    }

    // 2. Поточний переглядуваний місяць
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const isToday = (this.viewYear === todayYear && this.viewMonth === todayMonth && day === todayDate);
      daysHtml += `<div class="cal-day ${isToday ? 'today' : ''}" data-day="${day}">${day}</div>`;
    }

    // 3. Наступний місяць для заповнення сітки до 35 або 42 клітинок
    const totalRendered = startOffset + daysInCurrentMonth;
    const targetTotal = totalRendered > 35 ? 42 : 35;
    const remainingDays = targetTotal - totalRendered;
    for (let day = 1; day <= remainingDays; day++) {
      daysHtml += `<div class="cal-day other-month">${day}</div>`;
    }

    this.calendarFlyoutEl.innerHTML = `
      <div class="cal-top-header">
        <div class="cal-live-time">${curH}:${curM}:${curS}</div>
        <div class="cal-full-date">${fullDateStr}</div>
      </div>

      <div class="cal-month-nav">
        <div class="cal-month-title" id="cal-reset-today" title="Повернутися до поточного місяця">
          ${monthNames[this.viewMonth]} ${this.viewYear}
        </div>
        <div class="cal-nav-buttons">
          <button class="cal-nav-btn" id="cal-prev-month" title="Попередній місяць">◀</button>
          <button class="cal-nav-btn" id="cal-next-month" title="Наступний місяць">▶</button>
        </div>
      </div>

      <div class="cal-weekdays">
        <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Нд</span>
      </div>

      <div class="cal-grid">
        ${daysHtml}
      </div>
    `;

    // Події перемикання місяців
    this.calendarFlyoutEl.querySelector('#cal-prev-month').addEventListener('click', (e) => {
      e.stopPropagation();
      this.viewMonth--;
      if (this.viewMonth < 0) {
        this.viewMonth = 11;
        this.viewYear--;
      }
      this.renderCalendar();
    });

    this.calendarFlyoutEl.querySelector('#cal-next-month').addEventListener('click', (e) => {
      e.stopPropagation();
      this.viewMonth++;
      if (this.viewMonth > 11) {
        this.viewMonth = 0;
        this.viewYear++;
      }
      this.renderCalendar();
    });

    this.calendarFlyoutEl.querySelector('#cal-reset-today').addEventListener('click', (e) => {
      e.stopPropagation();
      const n = new Date();
      this.viewYear = n.getFullYear();
      this.viewMonth = n.getMonth();
      this.renderCalendar();
    });
  }

  setupListeners() {
    // Відкриття / закриття меню Пуск
    if (this.startBtn) {
      this.startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideCalendar();
        eventBus.emit('startmenu:toggle');
      });
    }

    // Клік по годиннику відкриває або закриває Календар
    if (this.clockEl) {
      this.clockEl.addEventListener('click', (e) => {
        e.stopPropagation();
        eventBus.emit('startmenu:close');
        this.toggleCalendar();
      });
    }

    // Закриття календаря при кліку поза ним
    window.addEventListener('mousedown', (e) => {
      if (this.isCalendarOpen && this.calendarFlyoutEl && !this.calendarFlyoutEl.contains(e.target) && !e.target.closest('#taskbar-clock')) {
        this.hideCalendar();
      }
    });

    // Закриття календаря при зміні профілю
    eventBus.on('profile:logout', () => this.hideCalendar());
    eventBus.on('startmenu:open', () => this.hideCalendar());

    // Слухаємо події вікон для оновлення кнопок на панелі завдань
    eventBus.on('window:created', () => this.renderTasks());
    eventBus.on('window:focused', () => this.renderTasks());
    eventBus.on('window:minimized', () => this.renderTasks());
    eventBus.on('window:closed', () => this.renderTasks());
    eventBus.on('window:title_changed', () => this.renderTasks());
  }

  renderTasks() {
    if (!this.tasksListEl) return;
    this.tasksListEl.innerHTML = '';

    const windows = windowManager.getAllWindows();

    windows.forEach((win) => {
      const btn = document.createElement('button');
      btn.className = `taskbar-item ${windowManager.activeWindowId === win.id && !win.isMinimized ? 'active' : ''} ${win.isMinimized ? 'minimized' : ''}`;
      btn.dataset.winId = win.id;
      btn.title = win.title;

      btn.innerHTML = `
        <span class="taskbar-item-icon" data-icon="${win.icon}"></span>
        <span class="taskbar-item-title">${win.title}</span>
        <span class="taskbar-active-indicator"></span>
      `;

      btn.addEventListener('click', () => {
        if (win.isMinimized) {
          windowManager.focusWindow(win.id);
        } else if (windowManager.activeWindowId === win.id) {
          windowManager.minimizeWindow(win.id);
        } else {
          windowManager.focusWindow(win.id);
        }
      });

      this.tasksListEl.appendChild(btn);
    });
  }
}

export const taskbar = new TaskbarManager();
