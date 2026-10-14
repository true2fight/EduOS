/**
 * TaskManagerApp: Диспетчер завдань EduOS
 * Дозволяє переглядати запущені процеси, завершувати їх та спостерігати
 * за модельними графіками завантаження CPU і оперативної пам'яті.
 */
import { BaseApp } from './base-app.js';
import { windowManager } from '../core/window-manager.js';
import { auditLogger } from '../core/audit-log.js';

export class TaskManagerApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.activeTab = 'processes';
    this.selectedWinId = null;
    this.perfInterval = null;
    this.cpuHistory = new Array(30).fill(15);
    this.ramHistory = new Array(30).fill(28);
  }

  async init() {
    this.renderLayout();
    this.setTitle('Диспетчер завдань');
    await auditLogger.log('app_opened', { appId: 'task-manager' });
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="task-manager-layout">
        <div class="tm-tabs">
          <button class="tm-tab-btn active" data-tab="processes">Процеси</button>
          <button class="tm-tab-btn" data-tab="performance">Продуктивність</button>
        </div>

        <div class="tm-tab-content" id="tm-tab-content"></div>

        <div class="tm-footer">
          <button class="tm-btn-kill" id="tm-btn-kill" disabled>Зняти задачу</button>
        </div>
      </div>
    `;

    this.bindEvents();
    this.showProcessesTab();
  }

  bindEvents() {
    this.container.querySelectorAll('.tm-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.tm-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.dataset.tab;
        if (this.activeTab === 'processes') {
          if (this.perfInterval) clearInterval(this.perfInterval);
          this.showProcessesTab();
        } else {
          this.showPerformanceTab();
        }
      });
    });

    this.container.querySelector('#tm-btn-kill').addEventListener('click', () => {
      if (this.selectedWinId) {
        windowManager.closeWindow(this.selectedWinId);
        this.selectedWinId = null;
        this.showProcessesTab();
      }
    });
  }

  showProcessesTab() {
    const content = this.container.querySelector('#tm-tab-content');
    const btnKill = this.container.querySelector('#tm-btn-kill');
    btnKill.style.display = 'inline-block';
    btnKill.disabled = true;

    const windows = windowManager.getAllWindows();

    let html = `
      <table class="tm-table">
        <thead>
          <tr>
            <th>Назва процесу</th>
            <th>Стан</th>
            <th>ЦП (%)</th>
            <th>Пам'ять (МБ)</th>
          </tr>
        </thead>
        <tbody>
    `;

    windows.forEach((w) => {
      const cpu = (Math.random() * 3 + 0.5).toFixed(1);
      const mem = Math.round(24 + (w.title.length * 3));
      html += `
        <tr class="tm-row" data-win-id="${w.id}">
          <td>📱 ${w.title}</td>
          <td>${w.isMinimized ? 'Згорнуто' : 'Виконується'}</td>
          <td>${cpu}%</td>
          <td>${mem} МБ</td>
        </tr>
      `;
    });

    html += `
        <tr class="tm-row-system">
          <td>⚙️ EduOS Core Kernel</td>
          <td>Працює</td>
          <td>1.2%</td>
          <td>64 МБ</td>
        </tr>
      </tbody>
    </table>`;

    content.innerHTML = html;

    content.querySelectorAll('.tm-row').forEach((row) => {
      row.addEventListener('click', () => {
        content.querySelectorAll('.tm-row').forEach((r) => r.classList.remove('selected'));
        row.classList.add('selected');
        this.selectedWinId = row.dataset.winId;
        btnKill.disabled = false;
      });
    });
  }

  showPerformanceTab() {
    const content = this.container.querySelector('#tm-tab-content');
    const btnKill = this.container.querySelector('#tm-btn-kill');
    btnKill.style.display = 'none';

    content.innerHTML = `
      <div class="tm-perf-view">
        <div class="perf-metric-card">
          <h4>ЦП (Центральний процесор)</h4>
          <canvas id="perf-cpu-canvas" width="400" height="110"></canvas>
          <div class="perf-stats" id="perf-cpu-stat">Використання: 18% @ 3.20 GHz</div>
        </div>
        <div class="perf-metric-card">
          <h4>Пам'ять (RAM)</h4>
          <canvas id="perf-ram-canvas" width="400" height="110"></canvas>
          <div class="perf-stats" id="perf-ram-stat">Використано: 2.2 ГБ / 8.0 ГБ (28%)</div>
        </div>
      </div>
    `;

    const canvasCpu = content.querySelector('#perf-cpu-canvas');
    const ctxCpu = canvasCpu.getContext('2d');
    const statCpuEl = content.querySelector('#perf-cpu-stat');

    const canvasRam = content.querySelector('#perf-ram-canvas');
    const ctxRam = canvasRam.getContext('2d');
    const statRamEl = content.querySelector('#perf-ram-stat');

    const drawGraph = () => {
      // 1. Оновлення та відмальовка ЦП
      const cpuVal = Math.round(10 + Math.random() * 22);
      this.cpuHistory.push(cpuVal);
      this.cpuHistory.shift();

      statCpuEl.innerHTML = `Використання: <strong>${cpuVal}%</strong> @ 3.20 GHz | Потоків: ${18 + Math.round(cpuVal / 3)}`;

      ctxCpu.clearRect(0, 0, canvasCpu.width, canvasCpu.height);
      ctxCpu.fillStyle = '#0a2540';
      ctxCpu.fillRect(0, 0, canvasCpu.width, canvasCpu.height);

      // Сітка ЦП
      ctxCpu.strokeStyle = '#1e3d59';
      ctxCpu.lineWidth = 1;
      for (let x = 0; x < canvasCpu.width; x += 40) {
        ctxCpu.beginPath(); ctxCpu.moveTo(x, 0); ctxCpu.lineTo(x, canvasCpu.height); ctxCpu.stroke();
      }
      for (let y = 0; y < canvasCpu.height; y += 28) {
        ctxCpu.beginPath(); ctxCpu.moveTo(0, y); ctxCpu.lineTo(canvasCpu.width, y); ctxCpu.stroke();
      }

      // Заливка графіка ЦП
      const stepCpu = canvasCpu.width / (this.cpuHistory.length - 1);
      const gradCpu = ctxCpu.createLinearGradient(0, 0, 0, canvasCpu.height);
      gradCpu.addColorStop(0, 'rgba(0, 242, 254, 0.35)');
      gradCpu.addColorStop(1, 'rgba(0, 242, 254, 0.02)');

      ctxCpu.fillStyle = gradCpu;
      ctxCpu.beginPath();
      ctxCpu.moveTo(0, canvasCpu.height);
      this.cpuHistory.forEach((v, i) => {
        const px = i * stepCpu;
        const py = canvasCpu.height - (v / 100) * canvasCpu.height;
        ctxCpu.lineTo(px, py);
      });
      ctxCpu.lineTo(canvasCpu.width, canvasCpu.height);
      ctxCpu.closePath();
      ctxCpu.fill();

      // Лінія графіка ЦП
      ctxCpu.strokeStyle = '#00f2fe';
      ctxCpu.lineWidth = 2;
      ctxCpu.beginPath();
      this.cpuHistory.forEach((v, i) => {
        const px = i * stepCpu;
        const py = canvasCpu.height - (v / 100) * canvasCpu.height;
        if (i === 0) ctxCpu.moveTo(px, py);
        else ctxCpu.lineTo(px, py);
      });
      ctxCpu.stroke();

      // 2. Оновлення та відмальовка Пам'яті (RAM)
      const openWinCount = windowManager.getAllWindows().length;
      const baseRamGb = 1.9 + (openWinCount * 0.16) + (Math.sin(Date.now() / 3000) * 0.08) + (Math.random() * 0.04);
      const ramPct = Math.min(95, Math.round((baseRamGb / 8.0) * 100));
      this.ramHistory.push(ramPct);
      this.ramHistory.shift();

      statRamEl.innerHTML = `Використано: <strong>${baseRamGb.toFixed(1)} ГБ</strong> з 8.0 ГБ (<strong>${ramPct}%</strong>) | Доступно: <strong>${(8.0 - baseRamGb).toFixed(1)} ГБ</strong>`;

      ctxRam.clearRect(0, 0, canvasRam.width, canvasRam.height);
      ctxRam.fillStyle = '#170f2a';
      ctxRam.fillRect(0, 0, canvasRam.width, canvasRam.height);

      // Сітка RAM
      ctxRam.strokeStyle = '#2d1e4e';
      ctxRam.lineWidth = 1;
      for (let x = 0; x < canvasRam.width; x += 40) {
        ctxRam.beginPath(); ctxRam.moveTo(x, 0); ctxRam.lineTo(x, canvasRam.height); ctxRam.stroke();
      }
      for (let y = 0; y < canvasRam.height; y += 28) {
        ctxRam.beginPath(); ctxRam.moveTo(0, y); ctxRam.lineTo(canvasRam.width, y); ctxRam.stroke();
      }

      // Заливка графіка RAM (фіолетово-пурпурний градієнт Fluent)
      const stepRam = canvasRam.width / (this.ramHistory.length - 1);
      const gradRam = ctxRam.createLinearGradient(0, 0, 0, canvasRam.height);
      gradRam.addColorStop(0, 'rgba(192, 132, 252, 0.38)');
      gradRam.addColorStop(1, 'rgba(192, 132, 252, 0.02)');

      ctxRam.fillStyle = gradRam;
      ctxRam.beginPath();
      ctxRam.moveTo(0, canvasRam.height);
      this.ramHistory.forEach((v, i) => {
        const px = i * stepRam;
        const py = canvasRam.height - (v / 100) * canvasRam.height;
        ctxRam.lineTo(px, py);
      });
      ctxRam.lineTo(canvasRam.width, canvasRam.height);
      ctxRam.closePath();
      ctxRam.fill();

      // Лінія графіка RAM
      ctxRam.strokeStyle = '#c084fc';
      ctxRam.lineWidth = 2;
      ctxRam.beginPath();
      this.ramHistory.forEach((v, i) => {
        const px = i * stepRam;
        const py = canvasRam.height - (v / 100) * canvasRam.height;
        if (i === 0) ctxRam.moveTo(px, py);
        else ctxRam.lineTo(px, py);
      });
      ctxRam.stroke();
    };

    drawGraph();
    this.perfInterval = setInterval(drawGraph, 1000);
  }

  destroy() {
    if (this.perfInterval) clearInterval(this.perfInterval);
    super.destroy();
  }
}
