/**
 * Apollo Scraper - Mission Control HUD Component
 * Self-contained in-page floating dashboard for live harvest monitoring & control.
 */

export class ApolloHUD {
  constructor(options = {}) {
    this.onStart = options.onStart || null;
    this.onPause = options.onPause || null;
    this.onResume = options.onResume || null;
    this.onSkip = options.onSkip || null;
    this.onStopAndExport = options.onStopAndExport || null;

    this.isPaused = false;
    this.isMinimized = false;
    this.isHarvesting = false;
    this.startTime = Date.now();
    this.container = null;

    this.initDOM();
  }

  initDOM() {
    let existing = document.getElementById('apollo-mission-control-hud');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'apollo-mission-control-hud';
    this.container.innerHTML = `
      <div class="apollo-hud-header">
        <div class="apollo-hud-title">
          <div class="apollo-hud-pulsing-dot"></div>
          <span>Mission Control</span>
        </div>
        <div class="apollo-hud-actions">
          <button class="apollo-hud-btn-icon" id="apollo-hud-min-btn" title="Minimize">−</button>
          <button class="apollo-hud-btn-icon" id="apollo-hud-close-btn" title="Close">✕</button>
        </div>
      </div>
      <div class="apollo-hud-body" id="apollo-hud-body-content">
        <div class="apollo-hud-slice-banner">
          <div class="apollo-hud-slice-label" id="apollo-hud-slice-lbl">Ready for AI Slicing & Extraction</div>
          <div class="apollo-hud-pass-badge" id="apollo-hud-pass-bdg">Ready</div>
        </div>
        <div class="apollo-hud-progress-track">
          <div class="apollo-hud-progress-bar" id="apollo-hud-bar"></div>
        </div>
        <div class="apollo-hud-stats-grid">
          <div class="apollo-hud-stat-card">
            <span class="apollo-hud-stat-val" id="apollo-hud-total-val">0</span>
            <span class="apollo-hud-stat-lbl">Unique Leads</span>
          </div>
          <div class="apollo-hud-stat-card">
            <span class="apollo-hud-stat-val" id="apollo-hud-slice-val">0 / 0</span>
            <span class="apollo-hud-stat-lbl">Current Slice</span>
          </div>
          <div class="apollo-hud-stat-card">
            <span class="apollo-hud-stat-val" id="apollo-hud-speed-val">0/m</span>
            <span class="apollo-hud-stat-lbl">Harvest Speed</span>
          </div>
          <div class="apollo-hud-stat-card">
            <span class="apollo-hud-stat-val" id="apollo-hud-timer-val">Active</span>
            <span class="apollo-hud-stat-lbl">Pacing Status</span>
          </div>
        </div>
        <div class="apollo-hud-status-line" id="apollo-hud-status-txt">
          <span>🛡️ Stealth Engine Online</span>
        </div>
        <div class="apollo-hud-controls">
          <button class="apollo-hud-btn apollo-hud-btn-primary" id="apollo-hud-start-btn">🚀 Start AI Harvest</button>
          <button class="apollo-hud-btn apollo-hud-btn-secondary" id="apollo-hud-pause-btn" style="display: none;">⏸ Pause</button>
          <button class="apollo-hud-btn apollo-hud-btn-danger" id="apollo-hud-stop-btn" style="display: none;">⬇ Stop & Export</button>
        </div>
      </div>
    `;

    const mount = () => {
      if (document.body) {
        document.body.appendChild(this.container);
      } else if (document.documentElement) {
        document.documentElement.appendChild(this.container);
      } else {
        setTimeout(mount, 50);
      }
    };
    mount();
    this.bindEvents();
  }

  setHarvestState(state) {
    if (!this.container) return;
    const startBtn = this.container.querySelector('#apollo-hud-start-btn');
    const pauseBtn = this.container.querySelector('#apollo-hud-pause-btn');
    const stopBtn = this.container.querySelector('#apollo-hud-stop-btn');

    if (state === 'running') {
      this.isHarvesting = true;
      this.isPaused = false;
      if (startBtn) startBtn.style.display = 'none';
      if (pauseBtn) {
        pauseBtn.style.display = 'flex';
        pauseBtn.innerText = '⏸ Pause';
        pauseBtn.className = 'apollo-hud-btn apollo-hud-btn-secondary';
      }
      if (stopBtn) {
        stopBtn.style.display = 'flex';
        stopBtn.innerText = '⬇ Stop & Export';
      }
    } else if (state === 'paused') {
      this.isPaused = true;
      if (pauseBtn) {
        pauseBtn.innerText = '▶ Resume';
        pauseBtn.className = 'apollo-hud-btn apollo-hud-btn-primary';
      }
    } else if (state === 'completed') {
      this.isHarvesting = false;
      this.isPaused = false;
      if (startBtn) {
        startBtn.style.display = 'flex';
        startBtn.innerText = '↺ Harvest Again';
      }
      if (pauseBtn) pauseBtn.style.display = 'none';
      if (stopBtn) {
        stopBtn.style.display = 'flex';
        stopBtn.innerText = '⬇ Export CSV';
      }
    } else {
      // idle
      this.isHarvesting = false;
      this.isPaused = false;
      if (startBtn) {
        startBtn.style.display = 'flex';
        startBtn.innerText = '🚀 Start AI Harvest';
      }
      if (pauseBtn) pauseBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'none';
    }
  }

  bindEvents() {
    const minBtn = this.container.querySelector('#apollo-hud-min-btn');
    const closeBtn = this.container.querySelector('#apollo-hud-close-btn');
    const startBtn = this.container.querySelector('#apollo-hud-start-btn');
    const pauseBtn = this.container.querySelector('#apollo-hud-pause-btn');
    const stopBtn = this.container.querySelector('#apollo-hud-stop-btn');
    const bodyContent = this.container.querySelector('#apollo-hud-body-content');

    minBtn.addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      if (this.isMinimized) {
        this.container.classList.add('minimized');
        bodyContent.style.display = 'none';
        minBtn.innerText = '+';
      } else {
        this.container.classList.remove('minimized');
        bodyContent.style.display = 'flex';
        minBtn.innerText = '−';
      }
    });

    closeBtn.addEventListener('click', () => {
      this.destroy();
    });

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (this.onStart) this.onStart();
      });
    }

    pauseBtn.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      if (this.isPaused) {
        this.setHarvestState('paused');
        this.setStatus('⏸ Harvest paused by operator');
        if (this.onPause) this.onPause();
      } else {
        this.setHarvestState('running');
        this.setStatus('▶ Resuming harvest...');
        if (this.onResume) this.onResume();
      }
    });

    stopBtn.addEventListener('click', () => {
      if (confirm('Stop harvesting and export all collected leads to CSV now?')) {
        this.setStatus('Exporting CSV...');
        if (this.onStopAndExport) this.onStopAndExport();
      }
    });
  }

  updateProgress(data = {}) {
    if (!this.container) return;

    const {
      sliceLabel,
      passLabel,
      totalLeads,
      sliceHarvested = 0,
      sliceTotal = 0,
      sliceIdx = 1,
      totalSlices = 1,
      statusText
    } = data;

    if (sliceLabel) {
      const lblEl = this.container.querySelector('#apollo-hud-slice-lbl');
      if (lblEl) lblEl.innerText = `[${sliceIdx}/${totalSlices}] ${sliceLabel}`;
    }

    if (passLabel) {
      const passEl = this.container.querySelector('#apollo-hud-pass-bdg');
      if (passEl) passEl.innerText = passLabel;
    }

    if (typeof totalLeads === 'number') {
      const totalEl = this.container.querySelector('#apollo-hud-total-val');
      if (totalEl) totalEl.innerText = totalLeads.toLocaleString();

      // Compute speed
      const elapsedMin = Math.max(0.1, (Date.now() - this.startTime) / 60000);
      const speed = Math.round(totalLeads / elapsedMin);
      const speedEl = this.container.querySelector('#apollo-hud-speed-val');
      if (speedEl) speedEl.innerText = `${speed}/m`;
    }

    const sliceEl = this.container.querySelector('#apollo-hud-slice-val');
    if (sliceEl) {
      sliceEl.innerText = `${sliceHarvested} / ${sliceTotal || '?'}`;
    }

    const barEl = this.container.querySelector('#apollo-hud-bar');
    if (barEl && totalSlices > 0) {
      const pct = Math.min(100, Math.round((sliceIdx / totalSlices) * 100));
      barEl.style.width = `${pct}%`;
    }

    if (statusText) {
      this.setStatus(statusText);
    }
  }

  setStatus(text) {
    if (!this.container) return;
    const txtEl = this.container.querySelector('#apollo-hud-status-txt');
    if (txtEl) txtEl.innerText = text;
  }

  setPacingTimer(secondsLeft) {
    if (!this.container) return;
    const timerEl = this.container.querySelector('#apollo-hud-timer-val');
    if (timerEl) {
      timerEl.innerText = secondsLeft > 0 ? `Wait ${secondsLeft}s` : 'Active';
    }
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }
}

if (typeof window !== 'undefined') {
  window.ApolloHUD = ApolloHUD;
}
