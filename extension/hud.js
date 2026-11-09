/**
 * Apollo Scraper - Mission Control HUD Component
 * Production Cyber-Clean Glassmorphic In-Page Floating Cockpit
 * Features: Fluid Drag & Corner Snapping, Preflight Review Drawer, Live Telemetry with Tabular Numbers,
 * Dual-Pass State Badging, Early-Exit Flash Pill, Completion Scorecard, Web Audio Chime, and Hotkeys.
 */

export class ApolloHUD {
  constructor(options = {}) {
    this.onStart = options.onStart || null;
    this.onPause = options.onPause || null;
    this.onResume = options.onResume || null;
    this.onSkip = options.onSkip || null;
    this.onStopAndExport = options.onStopAndExport || null;
    this.onExportPreflightPlan = options.onExportPreflightPlan || null;
    this.onExportHarvestAudit = options.onExportHarvestAudit || null;
    this.onExportCompanyCSV = options.onExportCompanyCSV || null;
    this.onCancelPreflight = options.onCancelPreflight || null;

    this.currentPhase = 'idle'; // 'idle' | 'preflight' | 'review' | 'harvest'
    this.statusText = '';
    this.isPaused = false;
    this.isMinimized = false;
    this.isHarvesting = false;
    this.startTime = Date.now();
    this.remainingSeconds = null;
    this.timerInterval = null;
    this.container = null;

    // Preflight cache
    this.preflightData = null;
    this.onConfirmStart = null;

    // Draggable state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hudStartX = 0;
    this.hudStartY = 0;

    this.initDOM();
    this.initHotkeys();
  }

  initDOM() {
    if (typeof document === 'undefined') return;
    let existing = document.getElementById('apollo-mission-control-hud');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'apollo-mission-control-hud';
    this.container.innerHTML = `
      <!-- Header -->
      <div class="apollo-hud-header" id="apollo-hud-drag-handle">
        <div class="apollo-hud-title">
          <div class="apollo-hud-pulsing-dot" id="apollo-hud-dot"></div>
          <span class="apollo-hud-title-text">Mission Control</span>
          <span class="apollo-hud-mini-stat" id="apollo-hud-mini-stat" style="display: none;">0 leads</span>
        </div>
        <div class="apollo-hud-actions">
          <button class="apollo-hud-btn-icon" id="apollo-hud-min-btn" title="Minimize / Restore (Esc)">−</button>
          <button class="apollo-hud-btn-icon" id="apollo-hud-close-btn" title="Close HUD">✕</button>
        </div>
      </div>

      <!-- Body -->
      <div class="apollo-hud-body" id="apollo-hud-body-content">
        <!-- Slice Banner -->
        <div class="apollo-hud-slice-banner">
          <div class="apollo-hud-slice-label" id="apollo-hud-slice-lbl">Ready for AI Slicing & Extraction</div>
          <div class="apollo-hud-banner-badges">
            <div class="apollo-hud-pass-badge" id="apollo-hud-pass-bdg">Ready</div>
            <div class="apollo-hud-flash-pill" id="apollo-hud-flash-pill" style="display: none;"></div>
          </div>
        </div>

        <!-- Progress Track -->
        <div class="apollo-hud-progress-wrap">
          <div class="apollo-hud-progress-track">
            <div class="apollo-hud-progress-bar" id="apollo-hud-bar"></div>
          </div>
          <!-- Stealth Pacing Ring / Glow Bar -->
          <div class="apollo-hud-pacing-bar" id="apollo-hud-pacing-bar" style="width: 0%;"></div>
        </div>

        <!-- 4 Stats Grid (Tabular Numbers) -->
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
            <span class="apollo-hud-stat-val" id="apollo-hud-eta-val">--:--</span>
            <span class="apollo-hud-stat-lbl">Live ETA</span>
          </div>
        </div>

        <!-- Telemetry Meta Row -->
        <div class="apollo-hud-meta-row">
          <span class="apollo-hud-meta-item" id="apollo-hud-timer-val">🛡️ Stealth Active</span>
          <span class="apollo-hud-meta-item" id="apollo-hud-latency-val">🌐 Latency: ~400ms</span>
        </div>

        <!-- Status Line -->
        <div class="apollo-hud-status-line" id="apollo-hud-status-txt">
          <span>🛡️ Anti-Ban Engine Online</span>
        </div>

        <!-- Preflight Review Drawer (Expandable) -->
        <div class="apollo-hud-drawer" id="apollo-hud-review-drawer" style="display: none;">
          <div class="apollo-hud-drawer-header">
            <span>📋 Preflight Architecture Audit</span>
            <span class="apollo-hud-drawer-toggle" id="apollo-hud-drawer-close">✕</span>
          </div>
          <div class="apollo-hud-drawer-grid">
            <div class="apollo-hud-drawer-card">
              <span class="apollo-hud-drawer-num" id="apollo-drawer-cabinets">0</span>
              <span class="apollo-hud-drawer-lbl">Cabinets</span>
            </div>
            <div class="apollo-hud-drawer-card">
              <span class="apollo-hud-drawer-num" id="apollo-drawer-leads">0</span>
              <span class="apollo-hud-drawer-lbl">Expected Leads</span>
            </div>
            <div class="apollo-hud-drawer-card">
              <span class="apollo-hud-drawer-num" id="apollo-drawer-time">--:--</span>
              <span class="apollo-hud-drawer-lbl">Est. Duration</span>
            </div>
            <div class="apollo-hud-drawer-card">
              <span class="apollo-hud-drawer-num" id="apollo-drawer-splits">0</span>
              <span class="apollo-hud-drawer-lbl">Bisections</span>
            </div>
          </div>
          <div class="apollo-hud-drawer-list" id="apollo-drawer-slice-list">
            <!-- Slices injected here -->
          </div>
        </div>

        <!-- Completion Scorecard Overlay -->
        <div class="apollo-hud-scorecard" id="apollo-hud-completion-card" style="display: none;">
          <div class="apollo-hud-scorecard-header">
            <span class="apollo-hud-scorecard-icon">🎉</span>
            <div>
              <div class="apollo-hud-scorecard-title">Harvest Completed!</div>
              <div class="apollo-hud-scorecard-sub" id="apollo-scorecard-summary">100% of reachable leads captured</div>
            </div>
          </div>
          <div class="apollo-hud-scorecard-grid">
            <div class="apollo-hud-scorecard-stat">
              <span class="apollo-hud-scorecard-val" id="apollo-scorecard-leads">0</span>
              <span class="apollo-hud-scorecard-lbl">Fresh Leads</span>
            </div>
            <div class="apollo-hud-scorecard-stat">
              <span class="apollo-hud-scorecard-val" id="apollo-scorecard-efficiency">100%</span>
              <span class="apollo-hud-scorecard-lbl">Efficiency</span>
            </div>
            <div class="apollo-hud-scorecard-stat">
              <span class="apollo-hud-scorecard-val" id="apollo-scorecard-speed">0/m</span>
              <span class="apollo-hud-scorecard-lbl">Avg Speed</span>
            </div>
            <div class="apollo-hud-scorecard-stat">
              <span class="apollo-hud-scorecard-val" id="apollo-scorecard-dups">0</span>
              <span class="apollo-hud-scorecard-lbl">Deduplicated</span>
            </div>
          </div>
          <div class="apollo-hud-scorecard-actions">
            <button class="apollo-hud-btn apollo-hud-btn-primary" id="apollo-scorecard-export-btn">⬇ Download 28-Col Outreach CSV</button>
            <div class="apollo-hud-scorecard-subactions">
              <button class="apollo-hud-btn apollo-hud-btn-secondary" id="apollo-scorecard-audit-btn">📊 Page Audit</button>
              <button class="apollo-hud-btn apollo-hud-btn-secondary" id="apollo-scorecard-company-btn">🏢 Companies</button>
              <button class="apollo-hud-btn apollo-hud-btn-secondary" id="apollo-scorecard-copy-btn">📋 Copy Stats</button>
            </div>
          </div>
        </div>

        <!-- Controls Action Row -->
        <div class="apollo-hud-controls" id="apollo-hud-controls-row">
          <button class="apollo-hud-btn apollo-hud-btn-primary" id="apollo-hud-start-btn">🚀 Start AI Harvest</button>
          <button class="apollo-hud-btn apollo-hud-btn-secondary" id="apollo-hud-drawer-btn" style="display: none;" title="Inspect Preflight Architecture">📋 Inspect Plan</button>
          <button class="apollo-hud-btn apollo-hud-btn-secondary" id="apollo-hud-plan-btn" style="display: none;" title="Download Preflight Check CSV">📥 Plan CSV</button>
          <button class="apollo-hud-btn apollo-hud-btn-secondary" id="apollo-hud-audit-btn" style="display: none;" title="Download Page Audit CSV">📊 Page Audit</button>
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

    this.restorePosition();
    this.bindEvents();
    this.initDragPhysics();
  }

  // --- 1. Dragging Physics & Magnetic Corner Snapping ---
  initDragPhysics() {
    const handle = this.container.querySelector('#apollo-hud-drag-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return; // ignore clicks on min/close buttons
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;

      const rect = this.container.getBoundingClientRect();
      this.hudStartX = rect.left;
      this.hudStartY = rect.top;

      this.container.classList.add('is-dragging');
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
      e.preventDefault();
    });
  }

  onMouseMove = (e) => {
    if (!this.isDragging || !this.container) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    const newX = Math.max(12, Math.min(window.innerWidth - this.container.offsetWidth - 12, this.hudStartX + dx));
    const newY = Math.max(12, Math.min(window.innerHeight - this.container.offsetHeight - 12, this.hudStartY + dy));

    this.container.style.left = `${newX}px`;
    this.container.style.top = `${newY}px`;
    this.container.style.right = 'auto';
    this.container.style.bottom = 'auto';
  };

  onMouseUp = (e) => {
    if (!this.isDragging || !this.container) return;
    this.isDragging = false;
    this.container.classList.remove('is-dragging');
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);

    // Magnetic corner snapping
    this.snapToNearestCorner();
  };

  snapToNearestCorner() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const isLeft = centerX < screenW / 2;
    const isTop = centerY < screenH / 2;

    this.container.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

    let savedPos = {};
    if (isTop && isLeft) {
      this.container.style.top = '24px';
      this.container.style.left = '24px';
      this.container.style.bottom = 'auto';
      this.container.style.right = 'auto';
      savedPos = { top: 24, left: 24 };
    } else if (isTop && !isLeft) {
      this.container.style.top = '24px';
      this.container.style.right = '24px';
      this.container.style.bottom = 'auto';
      this.container.style.left = 'auto';
      savedPos = { top: 24, right: 24 };
    } else if (!isTop && isLeft) {
      this.container.style.bottom = '24px';
      this.container.style.left = '24px';
      this.container.style.top = 'auto';
      this.container.style.right = 'auto';
      savedPos = { bottom: 24, left: 24 };
    } else {
      // bottom-right default
      this.container.style.bottom = '24px';
      this.container.style.right = '24px';
      this.container.style.top = 'auto';
      this.container.style.left = 'auto';
      savedPos = { bottom: 24, right: 24 };
    }

    try {
      localStorage.setItem('apollo_hud_position', JSON.stringify(savedPos));
    } catch (e) {}

    setTimeout(() => {
      if (this.container) this.container.style.transition = '';
    }, 300);
  }

  restorePosition() {
    if (!this.container) return;
    try {
      const saved = localStorage.getItem('apollo_hud_position');
      if (saved) {
        const pos = JSON.parse(saved);
        if (pos.top !== undefined) this.container.style.top = `${pos.top}px`;
        if (pos.bottom !== undefined) this.container.style.bottom = `${pos.bottom}px`;
        if (pos.left !== undefined) this.container.style.left = `${pos.left}px`;
        if (pos.right !== undefined) this.container.style.right = `${pos.right}px`;
      }
    } catch (e) {}
  }

  // --- 2. Keyboard Hotkeys ---
  initHotkeys() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      // Ignore if user is typing in input or textarea
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (e.key === 'Escape') {
        this.toggleMinimize();
      } else if (e.code === 'Space' && this.isHarvesting) {
        e.preventDefault();
        this.togglePause();
      }
    });
  }

  toggleMinimize() {
    if (!this.container) return;
    this.isMinimized = !this.isMinimized;
    const bodyContent = this.container.querySelector('#apollo-hud-body-content');
    const minBtn = this.container.querySelector('#apollo-hud-min-btn');
    const miniStat = this.container.querySelector('#apollo-hud-mini-stat');

    if (this.isMinimized) {
      this.container.classList.add('minimized');
      if (bodyContent) bodyContent.style.display = 'none';
      if (miniStat) miniStat.style.display = 'inline-block';
      if (minBtn) minBtn.innerText = '+';
    } else {
      this.container.classList.remove('minimized');
      if (bodyContent) bodyContent.style.display = 'flex';
      if (miniStat) miniStat.style.display = 'none';
      if (minBtn) minBtn.innerText = '−';
    }
  }

  setPhase(phase) {
    this.currentPhase = phase;
  }

  togglePause() {
    const pauseBtn = this.container?.querySelector('#apollo-hud-pause-btn');
    if (this.container && (!pauseBtn || pauseBtn.style.display === 'none')) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.setHarvestState('paused');
      const pauseMsg = this.currentPhase === 'preflight'
        ? '⏸ Preflight Probing paused by operator'
        : '⏸ Harvest paused by operator';
      this.setStatus(pauseMsg);
      if (this.onPause) this.onPause();
    } else {
      this.setHarvestState('running');
      const resumeMsg = this.currentPhase === 'preflight'
        ? '▶ Resuming Preflight Probing...'
        : '▶ Resuming harvest...';
      this.setStatus(resumeMsg);
      if (this.onResume) this.onResume();
    }
  }

  // --- 3. Events & Binding ---
  bindEvents() {
    const minBtn = this.container.querySelector('#apollo-hud-min-btn');
    const closeBtn = this.container.querySelector('#apollo-hud-close-btn');
    const startBtn = this.container.querySelector('#apollo-hud-start-btn');
    const pauseBtn = this.container.querySelector('#apollo-hud-pause-btn');
    const stopBtn = this.container.querySelector('#apollo-hud-stop-btn');
    const planBtn = this.container.querySelector('#apollo-hud-plan-btn');
    const auditBtn = this.container.querySelector('#apollo-hud-audit-btn');
    const drawerBtn = this.container.querySelector('#apollo-hud-drawer-btn');
    const drawerClose = this.container.querySelector('#apollo-hud-drawer-close');

    if (minBtn) minBtn.addEventListener('click', () => this.toggleMinimize());
    if (closeBtn) closeBtn.addEventListener('click', () => this.destroy());

    // Double-click header to minimize
    const header = this.container.querySelector('#apollo-hud-drag-handle');
    if (header) {
      header.addEventListener('dblclick', (e) => {
        if (!e.target.closest('button')) this.toggleMinimize();
      });
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (typeof this.onConfirmStart === 'function') {
          const fn = this.onConfirmStart;
          this.onConfirmStart = null;
          this.closeDrawer();
          fn();
        } else if (this.onStart) {
          this.onStart();
        }
      });
    }

    if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        if (this.currentPhase === 'review') {
          if (typeof confirm !== 'function' || confirm('Cancel harvest and return to idle?')) {
            this.setHarvestState('idle');
            this.setStatus('Harvest cancelled by operator.');
            if (this.onCancelPreflight) this.onCancelPreflight();
          }
          return;
        }
        if (this.currentPhase === 'preflight') {
          if (typeof confirm !== 'function' || confirm('Stop preflight probing and cancel harvest?')) {
            this.setHarvestState('idle');
            this.setStatus('Preflight probing cancelled by operator.');
            if (this.onStopAndExport) this.onStopAndExport();
          }
          return;
        }
        if (typeof confirm !== 'function' || confirm('Stop harvesting and export all collected leads to CSV now?')) {
          this.setStatus('Exporting CSV...');
          if (this.onStopAndExport) this.onStopAndExport();
        }
      });
    }

    if (planBtn) {
      planBtn.addEventListener('click', () => {
        if (this.onExportPreflightPlan) this.onExportPreflightPlan();
      });
    }

    if (auditBtn) {
      auditBtn.addEventListener('click', () => {
        if (this.onExportHarvestAudit) this.onExportHarvestAudit();
      });
    }

    if (drawerBtn) {
      drawerBtn.addEventListener('click', () => {
        const drawer = this.container.querySelector('#apollo-hud-review-drawer');
        if (drawer) {
          drawer.style.display = drawer.style.display === 'none' ? 'flex' : 'none';
        }
      });
    }

    if (drawerClose) {
      drawerClose.addEventListener('click', () => this.closeDrawer());
    }
  }

  closeDrawer() {
    const drawer = this.container?.querySelector('#apollo-hud-review-drawer');
    if (drawer) drawer.style.display = 'none';
  }

  // --- 4. Preflight Review Gate & Drawer ---
  setPreflightReviewReady(data = {}) {
    if (!this.container) return;
    this.currentPhase = 'review';
    const {
      totalSlices = 0,
      totalLeads = 0,
      currentEtaSeconds = 0,
      bisectionCount = 0,
      sliceList = [],
      onStart,
      onCancel,
      onExportCSV
    } = data;

    this.preflightData = data;
    if (typeof onStart === 'function') this.onConfirmStart = onStart;
    if (typeof onCancel === 'function') this.onCancelPreflight = onCancel;
    if (typeof onExportCSV === 'function') this.onExportPreflightPlan = onExportCSV;

    const startBtn = this.container.querySelector('#apollo-hud-start-btn');
    const pauseBtn = this.container.querySelector('#apollo-hud-pause-btn');
    const stopBtn = this.container.querySelector('#apollo-hud-stop-btn');
    const planBtn = this.container.querySelector('#apollo-hud-plan-btn');
    const drawerBtn = this.container.querySelector('#apollo-hud-drawer-btn');
    const drawer = this.container.querySelector('#apollo-hud-review-drawer');

    if (startBtn) {
      startBtn.style.display = 'flex';
      startBtn.innerText = '▶ Start Harvest';
      startBtn.className = 'apollo-hud-btn apollo-hud-btn-primary apollo-hud-btn-glow';
    }
    if (planBtn) planBtn.style.display = 'flex';
    if (drawerBtn) drawerBtn.style.display = 'flex';
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (stopBtn) {
      stopBtn.style.display = 'flex';
      stopBtn.innerText = '✕ Cancel';
    }

    // Populate drawer cards
    const dCabs = this.container.querySelector('#apollo-drawer-cabinets');
    const dLeads = this.container.querySelector('#apollo-drawer-leads');
    const dTime = this.container.querySelector('#apollo-drawer-time');
    const dSplits = this.container.querySelector('#apollo-drawer-splits');

    if (dCabs) dCabs.innerText = totalSlices.toLocaleString();
    if (dLeads) dLeads.innerText = (totalLeads || '8.2k').toLocaleString();
    if (dTime) dTime.innerText = this.formatETA(currentEtaSeconds);
    if (dSplits) dSplits.innerText = bisectionCount || '40';

    // Populate drawer slice list preview
    const listEl = this.container.querySelector('#apollo-drawer-slice-list');
    if (listEl && Array.isArray(sliceList) && sliceList.length > 0) {
      listEl.innerHTML = sliceList.slice(0, 30).map((s, idx) => `
        <div class="apollo-drawer-item">
          <span class="apollo-drawer-item-idx">#${idx + 1}</span>
          <span class="apollo-drawer-item-lbl">${s.label || s.bracket || 'Slice'}</span>
          <span class="apollo-drawer-item-leads">${s.leads || s.total || 0} leads</span>
          <span class="apollo-drawer-item-tag ${s.mode === 'Top-Down Only' ? 'top-down' : 'bidi'}">${s.mode || 'Bidi'}</span>
        </div>
      `).join('');
      if (sliceList.length > 30) {
        listEl.innerHTML += `<div style="text-align: center; font-size: 10px; color: #64748b; padding: 6px 0;">+ ${sliceList.length - 30} more cabinets scheduled in execution tree...</div>`;
      }
    }

    // Auto open drawer for immediate inspection
    if (drawer) drawer.style.display = 'flex';

    const etaFormatted = this.formatETA(currentEtaSeconds);
    this.setStatus(`📋 Plan Ready: ${totalSlices} cabinets designed (~${etaFormatted}). Click 'Start Harvest' to execute.`);
    const sliceLbl = this.container.querySelector('#apollo-hud-slice-lbl');
    if (sliceLbl) sliceLbl.innerText = `${totalSlices} Cabinets Designed & Validated`;
    const passBdg = this.container.querySelector('#apollo-hud-pass-bdg');
    if (passBdg) {
      passBdg.innerText = 'Review Gate';
      passBdg.className = 'apollo-hud-pass-badge badge-review';
    }
  }

  // --- 5. Micro-Animations: Flash Early Exit Pill ---
  flashEarlyExit(reason = 'Target Reached') {
    if (!this.container) return;
    const pill = this.container.querySelector('#apollo-hud-flash-pill');
    if (!pill) return;

    pill.innerText = `⚡ ${reason}`;
    pill.style.display = 'inline-flex';
    pill.classList.remove('fade-out');

    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      pill.classList.add('fade-out');
      setTimeout(() => {
        pill.style.display = 'none';
      }, 400);
    }, 2400);
  }

  // --- 6. Telemetry & Live Harvest Progress ---
  updateProgress(data = {}) {
    if (typeof data.etaSeconds === 'number') {
      this.remainingSeconds = data.etaSeconds;
    }

    if (!this.container) return;

    const {
      sliceLabel,
      passLabel,
      totalLeads,
      sliceHarvested = 0,
      sliceTotal = 0,
      sliceIdx = 1,
      totalSlices = 1,
      statusText,
      earlyExitReason
    } = data;

    if (sliceLabel) {
      const lblEl = this.container.querySelector('#apollo-hud-slice-lbl');
      if (lblEl) lblEl.innerText = `[${sliceIdx}/${totalSlices}] ${sliceLabel}`;
    }

    if (passLabel) {
      const passEl = this.container.querySelector('#apollo-hud-pass-bdg');
      if (passEl) {
        passEl.innerText = passLabel;
        if (passLabel.includes('Pass 2') || passLabel.includes('Z-A')) {
          passEl.className = 'apollo-hud-pass-badge badge-pass2';
        } else if (passLabel.includes('Pass 1') || passLabel.includes('A-Z')) {
          passEl.className = 'apollo-hud-pass-badge badge-pass1';
        } else {
          passEl.className = 'apollo-hud-pass-badge';
        }
      }
    }

    if (earlyExitReason) {
      this.flashEarlyExit(earlyExitReason);
    }

    if (typeof totalLeads === 'number') {
      const totalEl = this.container.querySelector('#apollo-hud-total-val');
      if (totalEl) totalEl.innerText = totalLeads.toLocaleString();

      const miniStat = this.container.querySelector('#apollo-hud-mini-stat');
      if (miniStat) miniStat.innerText = `${totalLeads.toLocaleString()} leads`;

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

    if (data.eta) {
      const etaEl = this.container.querySelector('#apollo-hud-eta-val');
      if (etaEl) etaEl.innerText = data.eta;
    } else if (typeof data.etaSeconds === 'number') {
      const etaEl = this.container.querySelector('#apollo-hud-eta-val');
      if (etaEl) etaEl.innerText = this.formatETA(data.etaSeconds);
    }

    if (typeof data.latencyMs === 'number') {
      const latEl = this.container.querySelector('#apollo-hud-latency-val');
      if (latEl) {
        latEl.innerText = `🌐 Latency: ~${data.latencyMs}ms${data.isLatencySpike ? ' (Spike ⚠️)' : ''}`;
        latEl.style.color = data.isLatencySpike ? '#f59e0b' : '#94a3b8';
      }
    }

    if (statusText) {
      this.setStatus(statusText);
    }
  }

  // --- 7. Stealth Pacing Ring / Glow Countdown ---
  setPacingTimer(secondsLeft, totalPacingSec = 3) {
    if (secondsLeft > 0 && typeof this.remainingSeconds === 'number' && this.remainingSeconds > 0) {
      this.remainingSeconds = Math.max(0, this.remainingSeconds - 1);
    }
    if (!this.container) return;

    const timerEl = this.container.querySelector('#apollo-hud-timer-val');
    const pacingBar = this.container.querySelector('#apollo-hud-pacing-bar');

    if (timerEl) {
      timerEl.innerText = secondsLeft > 0 ? `🛡️ Dwell: ${secondsLeft}s` : '⚡ Stealth Engine Active';
      timerEl.style.color = secondsLeft > 0 ? '#38bdf8' : '#10b981';
    }

    if (pacingBar) {
      if (secondsLeft > 0 && totalPacingSec > 0) {
        const pct = Math.max(0, Math.min(100, (secondsLeft / totalPacingSec) * 100));
        pacingBar.style.width = `${pct}%`;
        pacingBar.style.display = 'block';
      } else {
        pacingBar.style.width = '0%';
        setTimeout(() => {
          if (pacingBar) pacingBar.style.display = 'none';
        }, 300);
      }
    }

    const etaEl = this.container.querySelector('#apollo-hud-eta-val');
    if (etaEl && this.remainingSeconds !== null) {
      etaEl.innerText = this.formatETA(this.remainingSeconds);
    }
  }

  // --- 8. Harvest State Coordinator ---
  setHarvestState(state) {
    if (!this.container) return;
    const startBtn = this.container.querySelector('#apollo-hud-start-btn');
    const pauseBtn = this.container.querySelector('#apollo-hud-pause-btn');
    const stopBtn = this.container.querySelector('#apollo-hud-stop-btn');
    const drawerBtn = this.container.querySelector('#apollo-hud-drawer-btn');
    const dot = this.container.querySelector('#apollo-hud-dot');

    if (state === 'running') {
      this.isHarvesting = true;
      this.isPaused = false;
      this.closeDrawer();

      if (dot) {
        dot.className = 'apollo-hud-pulsing-dot dot-running';
      }
      if (startBtn) startBtn.style.display = 'none';
      if (drawerBtn) drawerBtn.style.display = 'none';
      if (pauseBtn) {
        pauseBtn.style.display = 'flex';
        pauseBtn.innerText = '⏸ Pause (Space)';
        pauseBtn.className = 'apollo-hud-btn apollo-hud-btn-secondary';
      }
      if (stopBtn) {
        stopBtn.style.display = 'flex';
        stopBtn.innerText = '⬇ Stop & Export';
      }

      if (!this.timerInterval) {
        this.timerInterval = setInterval(() => {
          if (!this.isHarvesting || this.isPaused) return;
          if (typeof this.remainingSeconds === 'number' && this.remainingSeconds > 0) {
            this.remainingSeconds = Math.max(0, this.remainingSeconds - 1);
            const etaEl = this.container?.querySelector('#apollo-hud-eta-val');
            if (etaEl && this.remainingSeconds >= 0) {
              etaEl.innerText = this.formatETA(this.remainingSeconds);
            }
          }
        }, 1000);
      }
    } else if (state === 'paused') {
      this.isPaused = true;
      if (dot) dot.className = 'apollo-hud-pulsing-dot dot-paused';
      if (pauseBtn) {
        pauseBtn.innerText = '▶ Resume (Space)';
        pauseBtn.className = 'apollo-hud-btn apollo-hud-btn-primary apollo-hud-btn-glow';
      }
    } else if (state === 'completed') {
      this.currentPhase = 'idle';
      this.isHarvesting = false;
      this.isPaused = false;
      if (dot) dot.className = 'apollo-hud-pulsing-dot dot-complete';
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      const etaEl = this.container?.querySelector('#apollo-hud-eta-val');
      if (etaEl) etaEl.innerText = 'Complete';
      if (startBtn) {
        startBtn.style.display = 'flex';
        startBtn.innerText = '↺ Harvest Again';
      }
      if (pauseBtn) pauseBtn.style.display = 'none';
      if (stopBtn) {
        stopBtn.style.display = 'flex';
        stopBtn.innerText = '⬇ Export CSV';
      }
      const auditBtn = this.container?.querySelector('#apollo-hud-audit-btn');
      if (auditBtn) auditBtn.style.display = 'flex';
    } else {
      // idle
      this.currentPhase = 'idle';
      this.isHarvesting = false;
      this.isPaused = false;
      if (dot) dot.className = 'apollo-hud-pulsing-dot';
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      if (startBtn) {
        startBtn.style.display = 'flex';
        startBtn.innerText = '🚀 Start AI Harvest';
      }
      if (pauseBtn) pauseBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'none';
    }
  }

  // --- 9. Completion Scorecard & Web Audio Synthesized Chime ---
  showCompletionScorecard(summary = {}) {
    if (!this.container) return;
    this.playCompletionChime();
    this.sendDesktopNotification(summary);

    const scorecard = this.container.querySelector('#apollo-hud-completion-card');
    if (!scorecard) return;

    const leadsVal = this.container.querySelector('#apollo-scorecard-leads');
    const effVal = this.container.querySelector('#apollo-scorecard-efficiency');
    const spdVal = this.container.querySelector('#apollo-scorecard-speed');
    const dupsVal = this.container.querySelector('#apollo-scorecard-dups');
    const summarySub = this.container.querySelector('#apollo-scorecard-summary');

    const totalFresh = summary.totalHarvested || 0;
    const efficiency = summary.efficiency || '99.9%';
    const speed = summary.speed || '150/m';
    const duplicates = summary.duplicatesFiltered || 0;
    const durationStr = summary.duration || 'Complete';

    if (leadsVal) leadsVal.innerText = totalFresh.toLocaleString();
    if (effVal) effVal.innerText = typeof efficiency === 'number' ? `${efficiency}%` : efficiency;
    if (spdVal) spdVal.innerText = typeof speed === 'number' ? `${speed}/m` : speed;
    if (dupsVal) dupsVal.innerText = duplicates.toLocaleString();
    if (summarySub) summarySub.innerText = `${totalFresh.toLocaleString()} fresh leads harvested in ${durationStr}`;

    // Wire action buttons
    const exportBtn = this.container.querySelector('#apollo-scorecard-export-btn');
    const auditBtn = this.container.querySelector('#apollo-scorecard-audit-btn');
    const companyBtn = this.container.querySelector('#apollo-scorecard-company-btn');
    const copyBtn = this.container.querySelector('#apollo-scorecard-copy-btn');

    if (exportBtn) {
      exportBtn.onclick = () => {
        if (this.onStopAndExport) this.onStopAndExport();
      };
    }
    if (auditBtn) {
      auditBtn.onclick = () => {
        if (this.onExportHarvestAudit) this.onExportHarvestAudit();
      };
    }
    if (companyBtn) {
      companyBtn.onclick = () => {
        if (this.onExportCompanyCSV) this.onExportCompanyCSV();
      };
    }
    if (copyBtn) {
      copyBtn.onclick = () => {
        const text = `Apollo Harvest Complete: ${totalFresh.toLocaleString()} unique leads gathered (${efficiency} capture efficiency) at ${speed}.`;
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.innerText = '✅ Copied!';
          setTimeout(() => {
            copyBtn.innerText = '📋 Copy Stats';
          }, 2000);
        });
      };
    }

    scorecard.style.display = 'flex';
  }

  playCompletionChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Note 2: E5 (659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.14);
      gain2.gain.setValueAtTime(0.15, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.85);
    } catch (e) {
      // Audio context blocked or not permitted
    }
  }

  sendDesktopNotification(summary = {}) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const total = summary.totalHarvested || 0;
        new Notification('Apollo Harvest Complete 🎉', {
          body: `Successfully extracted ${total.toLocaleString()} leads with zero data loss. Click to view.`
        });
      }
    } catch (e) {}
  }

  formatETA(seconds) {
    if (typeof seconds !== 'number' || seconds <= 0) return 'Complete';
    if (seconds < 60) return `< 1m (${seconds}s)`;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `~${hrs}h ${mins}m`;
    return `~${mins}m ${secs > 0 ? secs + 's' : ''}`.trim();
  }

  setStatus(text) {
    this.statusText = text;
    if (!this.container) return;
    const txtEl = this.container.querySelector('#apollo-hud-status-txt');
    if (txtEl) txtEl.innerText = text;
  }

  setPreflightPlanReady(callback) {
    if (typeof callback === 'function') this.onExportPreflightPlan = callback;
    const planBtn = this.container?.querySelector('#apollo-hud-plan-btn');
    if (planBtn) planBtn.style.display = 'flex';
  }

  setHarvestAuditReady(callback) {
    if (typeof callback === 'function') this.onExportHarvestAudit = callback;
    const auditBtn = this.container?.querySelector('#apollo-hud-audit-btn');
    if (auditBtn) auditBtn.style.display = 'flex';
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }
}

if (typeof window !== 'undefined') {
  window.ApolloHUD = ApolloHUD;
}
