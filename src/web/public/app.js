// Gemini Deep Research Agent - Compact with Dark/Light Theme
class DeepResearchApp {
  constructor() {
    this.files = [];
    this.isResearching = false;
    this.currentResearchId = null;
    this.researchHistory = JSON.parse(localStorage.getItem('researchHistory') || '[]');
    this.activeResultId = null;
    this.startTime = null;
    this.elapsedTimer = null;
      this.pendingResearch = JSON.parse(localStorage.getItem('pendingResearch') || '[]');
    this.init();
  }

  init() {
    this.bindElements();
    this.bindEvents();
      this.renderHistory();
    this.loadConfig();
    this.checkPendingResearch();
  }

  bindElements() {
    this.queryInput = document.getElementById('queryInput');
    this.depthSelect = document.getElementById('depthSelect');
    this.sourcesSelect = document.getElementById('sourcesSelect');

    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.folderInput = document.getElementById('folderInput');
    this.browseBtn = document.getElementById('browseBtn');
    this.browseFolderBtn = document.getElementById('browseFolderBtn');
      this.fileQueue = document.getElementById('fileQueue');

    this.startResearchBtn = document.getElementById('startResearchBtn');
    this.progressSection = document.getElementById('progressSection');
    this.progressBar = document.getElementById('progressBar');
    this.progressStatus = document.getElementById('progressStatus');
    this.elapsedTime = document.getElementById('elapsedTime');

    this.tabsContainer = document.getElementById('tabsContainer');
        this.newResearchPanel = document.getElementById('newResearchPanel');
    this.resultPanelsContainer = document.getElementById('resultPanelsContainer');

    this.resultsList = document.getElementById('resultsList');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
      this.aboutBtn = document.getElementById('aboutBtn');
      this.toastContainer = document.getElementById('toastContainer');
      this.mobileHistoryBtn = document.getElementById('mobileHistoryBtn');
      this.historyPanel = document.getElementById('historyPanel');
  }

  bindEvents() {
    this.startResearchBtn.addEventListener('click', () => this.startResearch());

    this.browseBtn.addEventListener('click', () => this.fileInput.click());
    this.browseFolderBtn.addEventListener('click', () => this.folderInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
    this.folderInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

    this.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); this.dropZone.classList.add('dragover'); });
    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('dragover'));
    this.dropZone.addEventListener('drop', (e) => { e.preventDefault(); this.dropZone.classList.remove('dragover'); this.handleFiles(e.dataTransfer.files); });
      // About button
    this.aboutBtn.addEventListener('click', () => this.openAboutTab());

    // Mobile history button
    if (this.mobileHistoryBtn) {
      this.mobileHistoryBtn.addEventListener('click', () => this.toggleMobileHistory());
    }

    // Bind click on initial "New Research" tab
    const newResearchTab = this.tabsContainer.querySelector('[data-tab="new"]');
    if (newResearchTab) {
      newResearchTab.addEventListener('click', () => this.showNewResearchPanel());
    }

    this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

    this.queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.metaKey) this.startResearch();
    });
  }

  
  openAboutTab() {
    const tabId = 'about';
    let existingTab = this.tabsContainer.querySelector(`[data-tab="${tabId}"]`);
    
    if (existingTab) {
      this.activateTab(tabId);
      return;
    }

    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.dataset.tab = tabId;
    tab.innerHTML = `
      <i class="fas fa-info-circle"></i>
      <span class="tab-title">关于</span>
      <span class="tab-close"><i class="fas fa-times"></i></span>
    `;
    
    tab.addEventListener('click', () => this.activateTab(tabId));
    tab.querySelector('.tab-title').addEventListener('click', (e) => { e.stopPropagation(); this.activateTab(tabId); });
    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tabId);
    });
    
    const panel = document.createElement('div');
    panel.className = 'tab-panel result-panel';
    panel.dataset.resultId = tabId;
    
    panel.innerHTML = `
      <section class="results-section">
        <div class="results-content" style="max-width: 800px; margin: 0 auto; padding-top: 1rem;">
          <h2 style="color: var(--primary); margin-top: 0; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">✨ 功能特性</h2>
          <ul style="list-style-type: none; padding-left: 0;">
            <li>🔍 <strong>深度研究:</strong> 使用Gemini深度研究代理进行全面AI驱动研究 (<code>deep-research-pro-preview-12-2025</code>)</li>
            <li>📁 <strong>多文档上传:</strong> 上传多个文件或整个文件夹作为上下文</li>
            <li>🎚️ <strong>可配置深度:</strong> 快速、标准、深度或最大研究深度</li>
            <li>📊 <strong>多种输出格式:</strong> 摘要、详细、Markdown或JSON</li>
            <li>🪜 <strong>科学上网:</strong> 直接使用谷歌功能，服务器科学上网偶有不稳定，遇到问题可一个小时再试</li>
            <li>🛟 <strong>研究保存:</strong> 研究结果，只会自动保存在浏览器内，没有云端备份，所以重要输出记得下载到本地</li>
            <li>🦺 <strong>IP限制:</strong> 仅限公司IP访问以确保安全，想开通其他IP可联系王聪</li>
          </ul>

          <h2 style="color: var(--primary); margin-top: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">🎚️ 研究深度选项</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border);">
                <th style="text-align: left; padding: 0.5rem;">深度</th>
                <th style="text-align: left; padding: 0.5rem;">描述</th>
                <th style="text-align: left; padding: 0.5rem;">适用场景</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 0.5rem;"><strong>快速</strong></td>
                <td style="padding: 0.5rem;">快速概览与基础分析。最少网络浏览。</td>
                <td style="padding: 0.5rem;">简单问题、快速事实、定义查询</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 0.5rem;"><strong>标准</strong></td>
                <td style="padding: 0.5rem;">平衡深度与速度。适中的信息源。</td>
                <td style="padding: 0.5rem;">一般研究、背景信息收集</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 0.5rem;"><strong>深度</strong></td>
                <td style="padding: 0.5rem;">彻底的多步骤研究。探索多种视角。</td>
                <td style="padding: 0.5rem;">详细分析、对比研究、技术主题</td>
              </tr>
              <tr>
                <td style="padding: 0.5rem;"><strong>最大</strong></td>
                <td style="padding: 0.5rem;">全面的研究。所有可用信息源，完整引用。</td>
                <td style="padding: 0.5rem;">学术研究、复杂主题、文献综述</td>
              </tr>
            </tbody>
          </table>

          <h1 style="margin-top: 2em;">🧠 模型对比：深度研究 vs 深度思考</h1>
          <p>理解Google近期AI能力的区别很重要：</p>

          <h2 style="color: var(--primary); margin-top: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">Gemini 深度研究 (Gemini 3)</h2>
          <p>此代理利用<strong>深度研究</strong>能力，这是一个为全面信息收集和综合而设计的代理工作流。</p>
          <ul>
            <li><strong>焦点:</strong> 外部研究、浏览、多步骤检索，以及从多个来源综合逻辑报告。</li>
            <li><strong>能力:</strong> 可以使用工具、浏览网页、阅读上传的文档，并对发现进行迭代。</li>
            <li><strong>最适合:</strong> 复杂研究问题、文献综述、竞争分析和背景简报。</li>
            <li><strong>文档:</strong> <a href="https://ai.google.dev/gemini-api/docs/deep-research" target="_blank">Gemini 深度研究文档</a></li>
          </ul>

          <h2 style="color: var(--primary); margin-top: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">Gemini 深度思考 (Gemini 3)</h2>
          <p>指<strong>Gemini 3</strong>系列模型（如Gemini 3 Pro），在回答前内部采用高级"思维链"推理。</p>
          <ul>
            <li><strong>焦点:</strong> 内部逻辑、推理、谜题、数学和代码生成。</li>
            <li><strong>能力:</strong> 生成隐藏的"思考过程"来验证逻辑，然后输出最终答案。它不一定能更好地浏览网页，但它能更好地<em>推理</em>。</li>
            <li><strong>最适合:</strong> 复杂逻辑问题、编程挑战、数学和确保推理准确性。</li>
            <li><strong>文档:</strong> <a href="https://ai.google.dev/gemini-api/docs/thinking" target="_blank">Gemini 思考模型文档</a></li>
          </ul>

          <hr style="margin: 2em 0;">
          <p><em>本项目使用深度研究能力作为自主研究助手，工作基于<a href="https://github.com/dazdaz/gemini-deep-research" target="_blank">GitHub项目</a>。</em></p>
        </div>
      </section>
    `;
    
    this.resultPanelsContainer.appendChild(panel);
    this.tabsContainer.appendChild(tab);
    this.activateTab(tabId);
  }

  
  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const config = await response.json();
        console.log('Config loaded:', config);
      }
    } catch (err) {
      console.warn('Could not load config');
    }
  }

  handleFiles(fileList) {
    for (const file of fileList) {
      if (!this.files.find(f => f.name === file.name && f.size === file.size)) {
        this.files.push(file);
      }
    }
    this.renderFileQueue();
  }

  renderFileQueue() {
    this.fileQueue.innerHTML = this.files.map((file, i) => `
      <div class="file-queue-item">
        <i class="fas fa-file"></i>
        <span>${file.name}</span>
        <button class="remove-file" data-index="${i}"><i class="fas fa-times"></i></button>
      </div>
    `).join('');
    
    this.fileQueue.querySelectorAll('.remove-file').forEach(btn => {
      btn.addEventListener('click', () => {
        this.files.splice(parseInt(btn.dataset.index), 1);
        this.renderFileQueue();
      });
    });
  }

  async startResearch() {
    const query = this.queryInput.value.trim();
    if (!query) {
      this.showToast('请输入研究查询内容', 'error');
      return;
    }

    this.isResearching = true;
    this.startResearchBtn.disabled = true;
    this.progressSection.classList.remove('hidden');
    this.progressBar.style.width = '0%';
    this.progressStatus.textContent = '启动中...';
    
    this.startTime = Date.now();
    this.elapsedTimer = setInterval(() => this.updateElapsedTime(), 100);

    try {
      this.progressStatus.textContent = '研究中...';
      this.progressBar.style.width = '20%';

      // Create FormData for research request
      const formData = new FormData();
      formData.append('query', query);
      formData.append('depth', this.depthSelect.value);
      formData.append('format', 'markdown');
      formData.append('sources', this.sourcesSelect.value);
      formData.append('citations', 'true');
      formData.append('refineWithThinking', 'false');

      // Add files if any
      if (this.files.length > 0) {
        this.files.forEach(file => formData.append('files', file));
      }

      const response = await fetch('/api/research', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error(`Research failed: ${response.statusText}`);

      const result = await response.json();
      // API returns { success: true, data: { id, status, message } }
      const researchId = result.data?.id || result.researchId || result.id;
      this.currentResearchId = researchId;
      await this.pollForResults(researchId);

    } catch (error) {
      console.error('Research error:', error);
      this.showToast('研究失败: ' + error.message, 'error');
      this.resetResearchUI();
    }
  }

  updateElapsedTime() {
    if (this.startTime) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      this.elapsedTime.textContent = `${elapsed.toFixed(1)}s`;
    }
  }

  async pollForResults(researchId) {
    const pollInterval = 10000;
    const maxAttempts = 360; //max 1 hour
    let attempts = 0;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 5; // 连续失败5次后才认为有严重问题

    const poll = async () => {
      try {
        const response = await fetch(`/api/research/${researchId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const apiResponse = await response.json();
        // API returns { success: true, data: { id, status, result, ... } }
        const status = apiResponse.data || apiResponse;

        // 重置连续失败计数器
        consecutiveFailures = 0;

        if (status.status === 'completed') {
          // 确保status有query信息，用于标题显示
          if (!status.query && this.queryInput.value.trim()) {
            status.query = this.queryInput.value.trim();
          }

          const totalTime = (Date.now() - this.startTime) / 1000;
          this.handleResearchComplete(status, totalTime);
          return;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Research failed');
        } else {
          const progress = Math.min(10 + attempts * 2.5, 90);
          this.progressBar.style.width = progress + '%';

          // 显示进度，如果有服务器返回的进度信息则使用，否则显示默认信息
          if (status.progress !== undefined) {
            this.progressBar.style.width = status.progress + '%';
          }

          this.progressStatus.textContent = status.message || 'Researching...';

          if (++attempts < maxAttempts) {
            setTimeout(poll, pollInterval);
          } else {
            throw new Error('Research timed out');
          }
        }
      } catch (error) {
        consecutiveFailures++;
        console.error(`Polling error (${consecutiveFailures}/${maxConsecutiveFailures}):`, error);

        // 如果连续失败次数未达到阈值，显示警告但继续轮询
        if (consecutiveFailures < maxConsecutiveFailures) {
          this.showToast(`网络连接问题 (${consecutiveFailures}/${maxConsecutiveFailures})，正在重试...`, 'warning');
          this.progressStatus.textContent = `网络连接问题，正在重试... (${consecutiveFailures}/${maxConsecutiveFailures})`;

          // 使用指数退避策略，增加轮询间隔
          const backoffDelay = Math.min(pollInterval * Math.pow(1.5, consecutiveFailures - 1), 30000);
          setTimeout(poll, backoffDelay);
          return;
        }

        // 连续失败次数过多，但仍然给用户选择继续的机会
        this.showToast(`网络连接持续失败，但研究可能仍在进行中`, 'error');
        this.progressStatus.textContent = '网络连接失败，研究可能仍在进行中...';

        // 显示继续选项而不是直接重置
        this.showContinueOption(researchId);
        return;
      }
    };

    poll();
  }

  handleResearchComplete(result, totalTime) {
    clearInterval(this.elapsedTimer);
    this.progressBar.style.width = '100%';
    this.progressStatus.textContent = 'Complete!';

    // 优先使用result中的query，回退到当前输入框的值
    const query = result.query || this.queryInput.value.trim() || '未命名研究';

    const resultEntry = {
      id: result.researchId || result.id || 'result_' + Date.now(),
      query: query,
      content: result.result || result.content || '',
      timestamp: new Date().toISOString(),
      totalTime: totalTime,
      depth: result.depth || this.depthSelect.value || 'deep',
      format: 'markdown'
    };

    this.researchHistory.unshift(resultEntry);
    if (this.researchHistory.length > 20) this.researchHistory.pop();
    localStorage.setItem('researchHistory', JSON.stringify(this.researchHistory));

    this.renderHistory();
    this.showResult(resultEntry);

    setTimeout(() => this.resetResearchUI(), 500);
    this.showToast('研究完成！', 'success');
  }

  resetResearchUI() {
    clearInterval(this.elapsedTimer);
    this.isResearching = false;
    this.startResearchBtn.disabled = false;
    this.progressSection.classList.add('hidden');
    this.currentResearchId = null;
    this.startTime = null;
  }

  // Tab Management
  createNewResearchTab() {
    // Create a fresh new research tab
    const tabId = 'new_' + Date.now();
    
    // Create the tab button
    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.dataset.tab = tabId;
    tab.innerHTML = `
      <i class="fas fa-plus"></i>
      <span class="tab-title">新建研究</span>
      <span class="tab-close"><i class="fas fa-times"></i></span>
    `;
    
    tab.addEventListener('click', () => this.activateTab(tabId));
    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tabId);
    });
    
    // Create the panel
    const panel = document.createElement('div');
    panel.className = 'tab-panel';
    panel.dataset.resultId = tabId;
    panel.innerHTML = this.newResearchPanel.innerHTML;
    
    this.resultPanelsContainer.appendChild(panel);
    this.tabsContainer.appendChild(tab);
    
    // Activate this new tab
    this.tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    this.newResearchPanel.classList.remove('active');
    document.querySelectorAll('.result-panel, .tab-panel').forEach(p => p.classList.remove('active'));
    panel.classList.add('active');
    
    this.showToast('新建研究标签页已创建', 'success');
  }

  showNewResearchPanel() {
    // Deactivate all tabs
    this.tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    // Activate "New Research" tab
    const newTab = this.tabsContainer.querySelector('[data-tab="new"]');
    if (newTab) newTab.classList.add('active');
    
    // Show new research panel, hide result panels
    this.newResearchPanel.classList.add('active');
    document.querySelectorAll('.result-panel').forEach(p => p.classList.remove('active'));
    
    // Clear active state in history
    this.resultsList.querySelectorAll('.result-item').forEach(i => i.classList.remove('active'));
    this.activeResultId = null;
  }

  createResultTab(result) {
    let existingTab = this.tabsContainer.querySelector(`[data-tab="${result.id}"]`);
    if (existingTab) {
      this.activateTab(result.id);
      return;
    }

    // 移动端显示前4个字，桌面端显示15个字符
    const isMobile = window.innerWidth <= 768;
    const displayText = isMobile ? result.query.slice(0, 4) : this.truncate(result.query, 15);

    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.dataset.tab = result.id;
    tab.innerHTML = `
      <i class="fas fa-file-alt"></i>
      <span class="tab-title">${displayText}</span>
      <span class="tab-close"><i class="fas fa-times"></i></span>
    `;
    
    tab.querySelector('.tab-title').addEventListener('click', (e) => {
      e.stopPropagation();
      this.activateTab(result.id);
    });
    tab.addEventListener('click', () => this.activateTab(result.id));
    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(result.id);
    });
    
    this.tabsContainer.appendChild(tab);
    this.activateTab(result.id);
  }

  activateTab(tabId) {
    this.tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const tab = this.tabsContainer.querySelector(`[data-tab="${tabId}"]`);
    if (tab) tab.classList.add('active');
    
    if (tabId === 'new') {
      this.showNewResearchPanel();
    } else {
      this.newResearchPanel.classList.remove('active');
      document.querySelectorAll('.result-panel').forEach(p => {
        p.classList.toggle('active', p.dataset.resultId === tabId);
      });
      
      this.resultsList.querySelectorAll('.result-item').forEach(i => {
        i.classList.toggle('active', i.dataset.resultId === tabId);
      });
      this.activeResultId = tabId;
    }
  }

  closeTab(tabId) {
    const tab = this.tabsContainer.querySelector(`[data-tab="${tabId}"]`);
    const panel = document.querySelector(`.result-panel[data-result-id="${tabId}"]`);
    
    if (tab) tab.remove();
    if (panel) panel.remove();
    
    if (this.activeResultId === tabId) {
      this.showNewResearchPanel();
    }
  }

  // Results Display
  showResult(result) {
    this.activeResultId = result.id;
    
    let panel = document.querySelector(`.result-panel[data-result-id="${result.id}"]`);
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'result-panel tab-panel';
      panel.dataset.resultId = result.id;
      this.resultPanelsContainer.appendChild(panel);
    }

    panel.innerHTML = `
      <section class="results-section">
        <button class="back-btn" onclick="app.showNewResearchPanel()">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <div class="results-header">
          <h3><i class="fas fa-check-circle"></i> Results</h3>
          <div class="save-actions">
            <button class="save-btn" onclick="app.saveAs('${result.id}', 'md')">
              <i class="fab fa-markdown"></i> MD
            </button>
            <button class="save-btn" onclick="app.saveAs('${result.id}', 'pdf')">
              <i class="fas fa-file-pdf"></i> PDF
            </button>
          </div>
        </div>
        <div class="results-meta">
          <div class="meta-item">
            <i class="fas fa-search"></i>
            <span class="meta-value">${this.escapeHtml(this.truncate(result.query, 40))}</span>
          </div>
          <div class="meta-item time-value">
            <i class="fas fa-clock"></i>
            <span class="meta-value">${result.totalTime ? result.totalTime.toFixed(1) + 's' : 'N/A'}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-layer-group"></i>
            <span class="meta-value">${result.depth || 'deep'}</span>
          </div>
        </div>
        <div class="results-content" id="content-${result.id}">
          ${this.renderContent(result.content, result.format)}
        </div>
      </section>
    `;

    this.createResultTab(result);
    panel.classList.add('active');
    this.newResearchPanel.classList.remove('active');
  }

  renderContent(content, format) {
    if (!content) return '<p>No content available</p>';
    
    if (format === 'json') {
      try {
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        return `<pre><code>${JSON.stringify(parsed, null, 2)}</code></pre>`;
      } catch {
        return `<pre><code>${this.escapeHtml(content)}</code></pre>`;
      }
    }
    
    if (typeof marked !== 'undefined') {
      return marked.parse(content);
    }
    return `<pre>${this.escapeHtml(content)}</pre>`;
  }

  // History
  renderHistory() {
    if (this.researchHistory.length === 0) {
      this.resultsList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.75rem; text-align: center; padding: 0.5rem;">No history yet</p>';
      return;
    }

    this.resultsList.innerHTML = this.researchHistory.map(result => `
      <div class="result-item ${this.activeResultId === result.id ? 'active' : ''}" data-result-id="${result.id}">
        <div class="result-item-content">
          <div class="result-item-query">${this.escapeHtml(result.query)}</div>
          <div class="result-item-meta">
            <span>${new Date(result.timestamp).toLocaleDateString()}</span>
            <span class="result-item-time">${result.totalTime ? result.totalTime.toFixed(1) + 's' : ''}</span>
          </div>
        </div>
        <button class="delete-result-btn" data-id="${result.id}" title="删除"><i class="fas fa-trash"></i></button>
      </div>
    `).join('');

    this.resultsList.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => {
        const result = this.researchHistory.find(r => r.id === item.dataset.resultId);
        if (result) {
          this.showResult(result);
          // Close mobile history panel if open
          if (window.innerWidth <= 768 && this.historyPanel.classList.contains('mobile-visible')) {
            this.closeMobileHistory();
          }
        }
      });
    });

    this.resultsList.querySelectorAll('.delete-result-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteResult(btn.dataset.id);
      });
    });
  }

  async deleteResult(id) {
    if (confirm('确定要删除这个研究结果吗？')) {
      // Delete on server
      try {
        await fetch(`/api/research/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to delete on server', e);
      }

      // Delete locally
      this.researchHistory = this.researchHistory.filter(r => r.id !== id);
      localStorage.setItem('researchHistory', JSON.stringify(this.researchHistory));
      
      this.closeTab(id);
      if (this.activeResultId === id) {
        this.showNewResearchPanel();
      }
      
      this.renderHistory();
      this.showToast('研究结果已删除', 'success');
    }
  }

  clearHistory() {
    if (confirm('确定要清空所有历史记录吗？')) {
      this.researchHistory = [];
      localStorage.removeItem('researchHistory');
      this.renderHistory();
      // TODO: Call server to clear history
      
      this.tabsContainer.querySelectorAll('.tab:not([data-tab="new"])').forEach(t => t.remove());
      this.resultPanelsContainer.innerHTML = '';
      this.showNewResearchPanel();
      
      this.showToast('历史记录已清空', 'success');
    }
  }

  // Save Functions
  saveAs(resultId, format) {
    const result = this.researchHistory.find(r => r.id === resultId);
    if (!result) {
      this.showToast('未找到研究结果', 'error');
      return;
    }

    const filename = `research_${this.slugify(result.query)}_${Date.now()}`;

    if (format === 'md') {
      const md = `# ${result.query}\n\n**Time:** ${result.totalTime?.toFixed(1) || 'N/A'}s\n\n---\n\n${result.content}`;
      this.downloadFile(md, `${filename}.md`, 'text/markdown');
    } else if (format === 'pdf') {
      this.savePDF(result, filename);
    }

    this.showToast(`已保存为 ${format.toUpperCase()} 格式`, 'success');
  }

  savePDF(result, filename) {
    const contentEl = document.getElementById(`content-${result.id}`);
    if (!contentEl || typeof html2pdf === 'undefined') {
      this.showToast('PDF导出功能不可用', 'error');
      return;
    }

    // Create a wrapper with styles optimized for PDF
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      background: white;
      color: #1a1a2e;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.7;
      word-wrap: break-word;
      overflow-wrap: break-word;
      orphans: 3;
      widows: 3;
    `;

    // Create title section with enhanced styling
    // const titleSection = document.createElement('div');
    // titleSection.innerHTML = `
    //   <h2 style="color: #2563eb; margin-bottom: 8px; page-break-after: avoid; page-break-inside: avoid; font-size: 1.8rem; font-weight: 700; border-bottom: 2px solid #ddd; padding-bottom: 0.3em;">${this.escapeHtml(result.query)}</h2>
    //   <p style="color: #555; font-size: 14px; page-break-after: avoid; margin-bottom: 16px;">Time: ${result.totalTime?.toFixed(1) || 'N/A'}s | Depth: ${result.depth || 'deep'} | Format: ${result.format || 'markdown'}</p>
    //   <hr style="border: 1px solid #ddd; margin: 16px 0; page-break-after: avoid;">
    // `;

    // Create content section
    const contentSection = document.createElement('div');
    contentSection.innerHTML = this.forceBlackTextWithPageBreakOptimization(contentEl.innerHTML);

    // Add enhanced Markdown styling
    this.enhanceMarkdownForPDF(contentSection);

    //wrapper.appendChild(titleSection);
    wrapper.appendChild(contentSection);

    // Configure html2pdf with better page break handling
    html2pdf().set({
      margin: 15,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: ['tr', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'blockquote']
      },
      floatPrecision: 16
    }).from(wrapper).save();
  }

  forceBlackTextWithPageBreakOptimization(html) {
    // Replace any light colors with dark colors for PDF and add page break optimization
    // Preserve font sizes, margins, padding, and other visual properties
    return html
      // Replace light colors with dark colors but preserve other styles
      .replace(/color:\s*(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|var\([^)]+\))/gi, 'color: #1a1a2e')
      // Add page break optimization while preserving existing styles
      .replace(/<(h[1-6])([^>]*)style="([^"]*)"/gi, (_, tag, attrs, style) => {
        const newStyle = style + '; color: #1a1a2e; page-break-after: avoid; page-break-inside: avoid;';
        return `<${tag}${attrs}style="${newStyle}"`;
      })
      .replace(/<(h[1-6])([^>]*)>/gi, '<$1$2 style="color: #1a1a2e; page-break-after: avoid; page-break-inside: avoid;">')
      // Handle paragraphs with style preservation
      .replace(/<(p)([^>]*)style="([^"]*)"/gi, (_, tag, attrs, style) => {
        const newStyle = style + '; color: #1a1a2e; page-break-inside: avoid; orphans: 3; widows: 3;';
        return `<${tag}${attrs}style="${newStyle}"`;
      })
      .replace(/<(p)([^>]*)>/gi, '<$1$2 style="color: #1a1a2e; page-break-inside: avoid; orphans: 3; widows: 3;">')
      // Handle lists with proper indentation preservation
      .replace(/<(ul|ol)([^>]*)style="([^"]*)"/gi, (_, tag, attrs, style) => {
        const newStyle = style + '; color: #1a1a2e; page-break-inside: avoid; padding-left: 2.5em;';
        return `<${tag}${attrs}style="${newStyle}"`;
      })
      .replace(/<(ul|ol)([^>]*)>/gi, '<$1$2 style="color: #1a1a2e; page-break-inside: avoid; padding-left: 2.5em;">')
      // Handle list items with indentation
      .replace(/<(li)([^>]*)style="([^"]*)"/gi, (_, tag, attrs, style) => {
        const newStyle = style + '; color: #1a1a2e; page-break-inside: avoid; margin-bottom: 0.4em;';
        return `<${tag}${attrs}style="${newStyle}"`;
      })
      .replace(/<(li)([^>]*)>/gi, '<$1$2 style="color: #1a1a2e; page-break-inside: avoid; margin-bottom: 0.4em;">')
      // Handle code blocks
      .replace(/<(pre)([^>]*)style="([^"]*)"/gi, (_, tag, attrs, style) => {
        const newStyle = style + '; color: #1a1a2e; page-break-inside: avoid; background: #f8f9fa; padding: 1.25rem; border-radius: 6px; overflow-x: auto; margin: 1.5rem 0; border: 1px solid #e9ecef;';
        return `<${tag}${attrs}style="${newStyle}"`;
      })
      .replace(/<(pre)([^>]*)>/gi, '<$1$2 style="color: #1a1a2e; page-break-inside: avoid; background: #f8f9fa; padding: 1.25rem; border-radius: 6px; overflow-x: auto; margin: 1.5rem 0; border: 1px solid #e9ecef;">')
      // Handle blockquotes
      .replace(/<(blockquote)([^>]*)style="([^"]*)"/gi, (_, tag, attrs, style) => {
        const newStyle = style + '; color: #1a1a2e; page-break-inside: avoid; border-left: 4px solid #3b82f6; padding-left: 1rem; margin: 1.5rem 0; background: #f8fafc; padding: 1rem; border-radius: 0 6px 6px 0;';
        return `<${tag}${attrs}style="${newStyle}"`;
      })
      .replace(/<(blockquote)([^>]*)>/gi, '<$1$2 style="color: #1a1a2e; page-break-inside: avoid; border-left: 4px solid #3b82f6; padding-left: 1rem; margin: 1.5rem 0; background: #f8fafc; padding: 1rem; border-radius: 0 6px 6px 0;">')
      // Handle images
      .replace(/<(img)([^>]*)style="([^"]*)"/gi, (_, tag, attrs, style) => {
        const newStyle = style + '; page-break-inside: avoid; max-width: 100% !important;';
        return `<${tag}${attrs}style="${newStyle}"`;
      })
      .replace(/<(img)([^>]*)>/gi, '<$1$2 style="page-break-inside: avoid; max-width: 100% !important;">')
      // Handle tables
      .replace(/<(table)([^>]*)style="([^"]*)"/gi, (_, tag, attrs, style) => {
        const newStyle = style + '; page-break-inside: avoid;';
        return `<${tag}${attrs}style="${newStyle}"`;
      })
      .replace(/<(table)([^>]*)>/gi, '<$1$2 style="page-break-inside: avoid;">')
      // Handle inline code
      .replace(/<(code)([^>]*)style="([^"]*)"/gi, (_, tag, attrs, style) => {
        const newStyle = style + '; color: #1a1a2e; background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em;';
        return `<${tag}${attrs}style="${newStyle}"`;
      })
      .replace(/<(code)([^>]*)>/gi, '<$1$2 style="color: #1a1a2e; background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em;">')
      // Handle divs with code-block class
      .replace(/<div([^>]*)class="([^"]*\bcode-block\b[^"]*)"([^>]*)style="([^"]*)"/gi, (match, beforeAttrs, className, afterAttrs, style) => {
        const newStyle = style + '; page-break-inside: avoid;';
        return `<div${beforeAttrs}class="${className}"${afterAttrs}style="${newStyle}"`;
      })
      .replace(/<div([^>]*)class="([^"]*\bcode-block\b[^"]*)"([^>]*)>/gi, '<div$1class="$2"$3 style="page-break-inside: avoid;">')
      // Handle generic style attributes to ensure color is applied
      .replace(/style="([^"]*)"/gi, (match, style) => {
        if (!style.includes('color:')) {
          return style ? `style="${style}; color: #1a1a2e;"` : 'style="color: #1a1a2e;"';
        }
        return match;
      });
  }

  enhanceMarkdownForPDF(element) {
    // Add proper styling for Markdown elements to preserve hierarchy
    const markdownStyles = `
      h1 { color: #1a1a2e !important; font-size: 1.8rem !important; font-weight: 700 !important; margin: 1.5em 0 0.75em !important; line-height: 1.3 !important; page-break-after: avoid !important; page-break-inside: avoid !important; border-bottom: 1px solid #ddd !important; padding-bottom: 0.3em !important; }
      h2 { color: #1a1a2e !important; font-size: 1.5rem !important; font-weight: 700 !important; margin: 1.5em 0 0.75em !important; line-height: 1.3 !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
      h3 { color: #1a1a2e !important; font-size: 1.25rem !important; font-weight: 700 !important; margin: 1.5em 0 0.75em !important; line-height: 1.3 !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
      h4 { color: #1a1a2e !important; font-size: 1.1rem !important; font-weight: 700 !important; margin: 1.5em 0 0.75em !important; line-height: 1.3 !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
      h5 { color: #1a1a2e !important; font-size: 1rem !important; font-weight: 700 !important; margin: 1.5em 0 0.75em !important; line-height: 1.3 !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
      h6 { color: #1a1a2e !important; font-size: 0.9rem !important; font-weight: 700 !important; margin: 1.5em 0 0.75em !important; line-height: 1.3 !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
      p { color: #1a1a2e !important; margin-bottom: 1.2em !important; line-height: 1.7 !important; page-break-inside: avoid !important; orphans: 3 !important; widows: 3 !important; }
      ul, ol { color: #1a1a2e !important; margin-bottom: 1.2em !important; padding-left: 2.5em !important; page-break-inside: avoid !important; }
      li { color: #1a1a2e !important; margin-bottom: 0.4em !important; page-break-inside: avoid !important; }
      blockquote { color: #1a1a2e !important; border-left: 4px solid #3b82f6 !important; padding-left: 1rem !important; margin: 1.5rem 0 !important; background: #f8fafc !important; padding: 1rem !important; border-radius: 0 6px 6px 0 !important; page-break-inside: avoid !important; }
      code { color: #1a1a2e !important; background: #f1f5f9 !important; padding: 0.2em 0.4em !important; border-radius: 4px !important; font-size: 0.9em !important; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important; }
      pre { color: #1a1a2e !important; background: #f8f9fa !important; padding: 1.25rem !important; border-radius: 6px !important; overflow-x: auto !important; margin: 1.5rem 0 !important; border: 1px solid #e9ecef !important; page-break-inside: avoid !important; }
      pre code { color: #1a1a2e !important; background: transparent !important; padding: 0 !important; font-size: 0.9rem !important; }
      a { color: #3b82f6 !important; text-decoration: none !important; border-bottom: 1px solid #3b82f6 !important; }
      hr { border: 0 !important; border-top: 1px solid #ddd !important; margin: 2rem 0 !important; }
      table { page-break-inside: avoid !important; margin: 1.5rem 0 !important; }
      img { page-break-inside: avoid !important; max-width: 100% !important; height: auto !important; }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = markdownStyles;
    element.appendChild(styleElement);
  }

  forceBlackText(html) {
    // Replace any light colors with dark colors for PDF
    return html
      .replace(/color:\s*(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|var\([^)]+\))/gi, 'color: #1a1a2e')
      .replace(/style="/gi, 'style="color: #1a1a2e; ');
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Utilities
  truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  }

  slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  showContinueOption(researchId) {
    // 在进度区域添加继续选项
    const continueDiv = document.createElement('div');
    continueDiv.className = 'continue-options';
    continueDiv.innerHTML = `
      <div class="continue-message">
        <p><strong>网络连接问题</strong></p>
        <p>研究可能仍在后台进行，您可以选择：</p>
      </div>
      <div class="continue-buttons">
        <button class="continue-btn" onclick="app.resumePolling('${researchId}')">
          <i class="fas fa-sync"></i> 继续尝试
        </button>
        <button class="wait-btn" onclick="app.waitForManualCheck('${researchId}')">
          <i class="fas fa-clock"></i> 稍后手动检查
        </button>
      </div>
      <div class="manual-check-section">
        <small>研究ID: <code>${researchId}</code></small>
      </div>
    `;

    // 插入到进度区域后面
    this.progressSection.parentNode.insertBefore(continueDiv, this.progressSection.nextSibling);
  }

  resumePolling(researchId) {
    // 移除继续选项
    const continueDiv = document.querySelector('.continue-options');
    if (continueDiv) continueDiv.remove();

    // 重置失败计数器，重新开始轮询
    this.showToast('正在重新连接...', 'info');
    this.progressStatus.textContent = '正在重新连接...';

    // 重新开始轮询，但重置计数器
    this.pollForResults(researchId);
  }

  waitForManualCheck(researchId) {
    // 移除继续选项
    const continueDiv = document.querySelector('.continue-options');
    if (continueDiv) continueDiv.remove();

    // 保存研究ID到本地存储，以便稍后手动检查
    const pendingResearch = JSON.parse(localStorage.getItem('pendingResearch') || '[]');
    pendingResearch.push({
      id: researchId,
      query: this.queryInput.value.trim(),
      timestamp: new Date().toISOString(),
      startTime: this.startTime
    });
    localStorage.setItem('pendingResearch', JSON.stringify(pendingResearch));

    // 显示手动检查指导
    this.progressStatus.textContent = '研究可能仍在进行中，请稍后手动检查状态';
    this.showToast(`研究ID已保存: ${researchId}`, 'info');

    // 添加手动检查按钮
    const manualCheckDiv = document.createElement('div');
    manualCheckDiv.className = 'manual-check';
    manualCheckDiv.innerHTML = `
      <button class="manual-check-btn" onclick="app.manualCheckResearch('${researchId}')">
        <i class="fas fa-search"></i> 手动检查研究状态
      </button>
    `;

    this.progressSection.parentNode.insertBefore(manualCheckDiv, this.progressSection.nextSibling);

    // 停止计时器但保持界面状态
    clearInterval(this.elapsedTimer);
  }

  async manualCheckResearch(researchId) {
    try {
      this.showToast('正在检查研究状态...', 'info');
      const response = await fetch(`/api/research/${researchId}`);

      if (response.ok) {
        const apiResponse = await response.json();
        const status = apiResponse.data || apiResponse;

        if (status.status === 'completed') {
          // 移除手动检查区域
          const manualCheckDiv = document.querySelector('.manual-check');
          if (manualCheckDiv) manualCheckDiv.remove();

          // 获取原始查询信息，确保标题不丢失
          const pendingResearch = JSON.parse(localStorage.getItem('pendingResearch') || '[]');
          const pendingItem = pendingResearch.find(r => r.id === researchId);

          // 将查询信息附加到status对象中
          if (pendingItem && !status.query) {
            status.query = pendingItem.query;
          }

          // 重新启动计时器并处理完成
          this.startTime = Date.now(); // 重置开始时间用于显示总时间
          this.elapsedTimer = setInterval(() => this.updateElapsedTime(), 100);

          const totalTime = (Date.now() - this.startTime) / 1000;
          this.handleResearchComplete(status, totalTime);

          // 从待处理研究中移除
          this.removeFromPendingResearch(researchId);
        } else if (status.status === 'failed') {
          this.showToast('研究失败: ' + (status.error || '未知错误'), 'error');
          this.removeFromPendingResearch(researchId);
          this.resetResearchUI();
        } else {
          this.showToast('研究仍在进行中...', 'info');
          this.progressStatus.textContent = `研究中... (进度: ${status.progress || '未知'})`;
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.showToast('检查失败: ' + error.message, 'error');
    }
  }

  removeFromPendingResearch(researchId) {
    const pendingResearch = JSON.parse(localStorage.getItem('pendingResearch') || '[]');
    const filtered = pendingResearch.filter(r => r.id !== researchId);
    localStorage.setItem('pendingResearch', JSON.stringify(filtered));
  }

  
  checkPendingResearch() {
    if (this.pendingResearch.length > 0) {
      // 显示有未完成研究的提示
      const pendingCount = this.pendingResearch.length;
      this.showToast(`发现 ${pendingCount} 个可能未完成的研究，可以手动检查状态`, 'warning');

      // 在历史记录区域添加一个显示待处理研究的按钮
      const pendingSection = document.createElement('div');
      pendingSection.className = 'pending-research-section';
      pendingSection.innerHTML = `
        <button class="pending-research-btn" onclick="app.showPendingResearch()">
          <i class="fas fa-clock"></i>
          检查未完成研究 (${pendingCount})
        </button>
      `;

      // 插入到历史记录标题后面
      const historyHeader = this.resultsList.previousElementSibling;
      if (historyHeader) {
        historyHeader.parentNode.insertBefore(pendingSection, historyHeader.nextSibling);
      }
    }
  }

  showPendingResearch() {
    if (this.pendingResearch.length === 0) {
      this.showToast('没有未完成的研究', 'info');
      return;
    }

    // 创建一个模态框显示待处理研究
    const modal = document.createElement('div');
    modal.className = 'pending-research-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-clock"></i> 未完成的研究</h3>
          <button class="modal-close" onclick="this.closest('.pending-research-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>以下研究可能因网络问题而中断，您可以手动检查它们的状态：</p>
          <div class="pending-list">
            ${this.pendingResearch.map(research => `
              <div class="pending-item">
                <div class="pending-info">
                  <strong>${this.escapeHtml(research.query)}</strong>
                  <br>
                  <small>ID: <code>${research.id}</code></small>
                  <br>
                  <small>时间: ${new Date(research.timestamp).toLocaleString()}</small>
                </div>
                <div class="pending-actions">
                  <button class="check-pending-btn" onclick="app.manualCheckResearch('${research.id}')">
                    <i class="fas fa-search"></i> 检查
                  </button>
                  <button class="remove-pending-btn" onclick="app.removeFromPendingResearch('${research.id}')">
                    <i class="fas fa-trash"></i> 移除
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  removeFromPendingResearch(researchId) {
    const pendingResearch = JSON.parse(localStorage.getItem('pendingResearch') || '[]');
    const filtered = pendingResearch.filter(r => r.id !== researchId);
    localStorage.setItem('pendingResearch', JSON.stringify(filtered));
    this.pendingResearch = filtered;

    // 更新UI
    const modal = document.querySelector('.pending-research-modal');
    if (modal) {
      if (this.pendingResearch.length === 0) {
        modal.remove();
        // 移除待处理研究按钮
        const pendingSection = document.querySelector('.pending-research-section');
        if (pendingSection) pendingSection.remove();
        this.showToast('所有未完成研究已清理', 'success');
      } else {
        // 更新模态框内容
        this.showPendingResearch();
        // 更新按钮文本
        const pendingBtn = document.querySelector('.pending-research-btn');
        if (pendingBtn) {
          pendingBtn.innerHTML = `<i class="fas fa-clock"></i> 检查未完成研究 (${this.pendingResearch.length})`;
        }
      }
    }
  }

  toggleMobileHistory() {
    if (window.innerWidth > 768) return; // Only on mobile

    if (this.historyPanel.classList.contains('mobile-visible')) {
      this.closeMobileHistory();
    } else {
      this.openMobileHistory();
    }
  }

  openMobileHistory() {
    if (window.innerWidth > 768) return; // Only on mobile

    // Create mobile history header if it doesn't exist
    let mobileHeader = this.historyPanel.querySelector('.mobile-history-header');
    if (!mobileHeader) {
      mobileHeader = document.createElement('div');
      mobileHeader.className = 'mobile-history-header';
      mobileHeader.innerHTML = `
        <button class="mobile-history-close" onclick="app.closeMobileHistory()">
          <i class="fas fa-times"></i>
        </button>
      `;

      // Insert before the existing history header
      const existingHeader = this.historyPanel.querySelector('.history-header');
      if (existingHeader) {
        this.historyPanel.insertBefore(mobileHeader, existingHeader);
      } else {
        this.historyPanel.insertBefore(mobileHeader, this.historyPanel.firstChild);
      }
    }

    this.historyPanel.classList.add('mobile-visible');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  closeMobileHistory() {
    this.historyPanel.classList.remove('mobile-visible');
    document.body.style.overflow = ''; // Restore scrolling
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i> ${message}`;
    this.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

// Initialize
const app = new DeepResearchApp();
