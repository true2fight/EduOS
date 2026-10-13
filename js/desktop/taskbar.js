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
      this.clockEl.title = now.toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    updateTime();
    this.clockInterval = setInterval(updateTime, 1000);
  }

  setupListeners() {
    // Відкриття / закриття меню Пуск
    if (this.startBtn) {
      this.startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        eventBus.emit('startmenu:toggle');
      });
    }

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
