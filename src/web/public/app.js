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
    this.currentZoom = 14;
    this.init();
  }

  init() {
    this.bindElements();
    this.bindEvents();
    this.initTheme();
    this.initZoom();
    this.renderHistory();
    this.loadConfig();
  }

  bindElements() {
    this.queryInput = document.getElementById('queryInput');
    this.depthSelect = document.getElementById('depthSelect');
    this.formatSelect = document.getElementById('formatSelect');
    this.sourcesSelect = document.getElementById('sourcesSelect');
    this.deepThinkCheck = document.getElementById('deepThinkCheck');
    
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
    this.addTabBtn = document.getElementById('addTabBtn');
    this.newResearchPanel = document.getElementById('newResearchPanel');
    this.resultPanelsContainer = document.getElementById('resultPanelsContainer');
    
    this.resultsList = document.getElementById('resultsList');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    this.themeToggle = document.getElementById('themeToggle');
    this.aboutBtn = document.getElementById('aboutBtn');
    this.zoomInBtn = document.getElementById('zoomInBtn');
    this.zoomOutBtn = document.getElementById('zoomOutBtn');
    this.zoomValue = document.getElementById('zoomValue');
    this.toastContainer = document.getElementById('toastContainer');
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
    
    // Theme toggle
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // About button
    this.aboutBtn.addEventListener('click', () => this.openAboutTab());

    // Zoom controls
    this.zoomInBtn.addEventListener('click', () => this.adjustZoom(1));
    this.zoomOutBtn.addEventListener('click', () => this.adjustZoom(-1));
    
    // "+" button creates a new research tab
    this.addTabBtn.addEventListener('click', () => this.createNewResearchTab());
    
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

  // Theme Management
  initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
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
      <span class="tab-title">About</span>
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
          <h1>🧠 Model Comparison: Deep Research vs Deep Think</h1>
          <p>It's important to understand the distinction between Google's recent AI capabilities:</p>
          
          <h2 style="color: var(--primary); margin-top: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">Gemini Deep Research</h2>
          <p>This agent utilizes the <strong>Deep Research</strong> capability, which is an agentic workflow designed for comprehensive information gathering and synthesis.</p>
          <ul>
            <li><strong>Focus:</strong> External research, browsing, multi-step retrieval, and synthesizing logical reports from many sources.</li>
            <li><strong>Capabilities:</strong> Can use tools, browse the web, read uploaded documents, and iterate on findings.</li>
            <li><strong>Best For:</strong> Complex research questions, literature reviews, competitive analysis, and background briefings.</li>
            <li><strong>Docs:</strong> <a href="https://ai.google.dev/gemini-api/docs/deep-research" target="_blank">Gemini Deep Research Documentation</a></li>
          </ul>

          <h2 style="color: var(--primary); margin-top: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">Gemini Deep Think (Gemini 3)</h2>
          <p>Refers to <strong>Gemini 3</strong> series models (e.g., Gemini 3 Pro), which employ advanced "Chain of Thought" reasoning internally before answering.</p>
          <ul>
            <li><strong>Focus:</strong> Internal logic, reasoning, puzzles, mathematics, and code generation.</li>
            <li><strong>Capabilities:</strong> Generates a hidden "thinking process" to verify logic before outputting the final answer. It does not necessarily browse the web better, but it <em>reasons</em> better.</li>
            <li><strong>Best For:</strong> Complex logic problems, coding challenges, math, and ensuring reasoning accuracy.</li>
            <li><strong>Docs:</strong> <a href="https://ai.google.dev/gemini-api/docs/thinking" target="_blank">Gemini Thinking Models Documentation</a></li>
          </ul>

          <hr style="margin: 2em 0;">
          <p><em>This project uses the Deep Research capability to act as an autonomous research assistant.</em></p>
        </div>
      </section>
    `;
    
    this.resultPanelsContainer.appendChild(panel);
    this.tabsContainer.appendChild(tab);
    this.activateTab(tabId);
  }

  initZoom() {
    const savedZoom = localStorage.getItem('zoom');
    if (savedZoom) {
      this.currentZoom = parseInt(savedZoom);
    }
    this.updateZoomUI();
  }

  adjustZoom(delta) {
    this.currentZoom = Math.min(Math.max(this.currentZoom + delta, 12), 24); // Limit between 12px and 24px
    localStorage.setItem('zoom', this.currentZoom);
    this.updateZoomUI();
  }

  updateZoomUI() {
    document.documentElement.style.fontSize = `${this.currentZoom}px`;
    if (this.zoomValue) {
      this.zoomValue.textContent = `${this.currentZoom}px`;
    }
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
      this.showToast('Please enter a research query', 'error');
      return;
    }

    this.isResearching = true;
    this.startResearchBtn.disabled = true;
    this.progressSection.classList.remove('hidden');
    this.progressBar.style.width = '0%';
    this.progressStatus.textContent = 'Starting...';
    
    this.startTime = Date.now();
    this.elapsedTimer = setInterval(() => this.updateElapsedTime(), 100);

    try {
      let uploadedFiles = [];
      if (this.files.length > 0) {
        this.progressStatus.textContent = 'Uploading...';
        this.progressBar.style.width = '10%';
        
        const formData = new FormData();
        this.files.forEach(file => formData.append('files', file));
        
        const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          uploadedFiles = uploadResult.files || [];
        }
      }

      this.progressStatus.textContent = 'Researching...';
      this.progressBar.style.width = '20%';

      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          depth: this.depthSelect.value,
          outputFormat: this.formatSelect.value,
          sourceTypes: this.sourcesSelect.value,
          includeCitations: true, // Default to true since option removed from UI
          refineWithThinking: this.deepThinkCheck ? this.deepThinkCheck.checked : false,
          documents: uploadedFiles
        })
      });

      if (!response.ok) throw new Error(`Research failed: ${response.statusText}`);

      const result = await response.json();
      // API returns { success: true, data: { id, status, message } }
      const researchId = result.data?.id || result.researchId || result.id;
      this.currentResearchId = researchId;
      await this.pollForResults(researchId);

    } catch (error) {
      console.error('Research error:', error);
      this.showToast('Research failed: ' + error.message, 'error');
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
    const pollInterval = 2000;
    const maxAttempts = 300;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/research/${researchId}`);
        if (!response.ok) throw new Error('Failed to get status');
        
        const apiResponse = await response.json();
        // API returns { success: true, data: { id, status, result, ... } }
        const status = apiResponse.data || apiResponse;
        
        if (status.status === 'completed') {
          const totalTime = (Date.now() - this.startTime) / 1000;
          this.handleResearchComplete(status, totalTime);
          return;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Research failed');
        } else {
          const progress = Math.min(20 + (attempts / maxAttempts) * 70, 90);
          this.progressBar.style.width = progress + '%';
          this.progressStatus.textContent = status.message || 'Researching...';
          
          if (++attempts < maxAttempts) {
            setTimeout(poll, pollInterval);
          } else {
            throw new Error('Research timed out');
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        this.showToast('Error: ' + error.message, 'error');
        this.resetResearchUI();
      }
    };

    poll();
  }

  handleResearchComplete(result, totalTime) {
    clearInterval(this.elapsedTimer);
    this.progressBar.style.width = '100%';
    this.progressStatus.textContent = 'Complete!';

    const resultEntry = {
      id: result.researchId || 'result_' + Date.now(),
      query: this.queryInput.value.trim(),
      content: result.result || result.content || '',
      timestamp: new Date().toISOString(),
      totalTime: totalTime,
      depth: this.depthSelect.value,
      format: this.formatSelect.value
    };

    this.researchHistory.unshift(resultEntry);
    if (this.researchHistory.length > 20) this.researchHistory.pop();
    localStorage.setItem('researchHistory', JSON.stringify(this.researchHistory));
    
    this.renderHistory();
    this.showResult(resultEntry);
    
    setTimeout(() => this.resetResearchUI(), 500);
    this.showToast('Research completed!', 'success');
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
      <span class="tab-title">New Research</span>
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
    
    this.showToast('New research tab created', 'success');
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

    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.dataset.tab = result.id;
    tab.innerHTML = `
      <i class="fas fa-file-alt"></i>
      <span class="tab-title">${this.truncate(result.query, 15)}</span>
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
            <button class="save-btn" onclick="app.saveAs('${result.id}', 'txt')">
              <i class="fas fa-file-alt"></i> TXT
            </button>
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
        <button class="delete-result-btn" data-id="${result.id}" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    `).join('');

    this.resultsList.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => {
        const result = this.researchHistory.find(r => r.id === item.dataset.resultId);
        if (result) this.showResult(result);
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
    if (confirm('Delete this research result?')) {
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
      this.showToast('Result deleted', 'success');
    }
  }

  clearHistory() {
    if (confirm('Clear all history?')) {
      this.researchHistory = [];
      localStorage.removeItem('researchHistory');
      this.renderHistory();
      
      this.tabsContainer.querySelectorAll('.tab:not([data-tab="new"])').forEach(t => t.remove());
      this.resultPanelsContainer.innerHTML = '';
      this.showNewResearchPanel();
      
      this.showToast('History cleared', 'success');
    }
  }

  // Save Functions
  saveAs(resultId, format) {
    const result = this.researchHistory.find(r => r.id === resultId);
    if (!result) {
      this.showToast('Result not found', 'error');
      return;
    }

    const filename = `research_${this.slugify(result.query)}_${Date.now()}`;
    
    if (format === 'txt') {
      const text = `Query: ${result.query}\nTime: ${result.totalTime?.toFixed(1) || 'N/A'}s\n\n${this.stripHtml(result.content)}`;
      this.downloadFile(text, `${filename}.txt`, 'text/plain');
    } else if (format === 'md') {
      const md = `# ${result.query}\n\n**Time:** ${result.totalTime?.toFixed(1) || 'N/A'}s\n\n---\n\n${result.content}`;
      this.downloadFile(md, `${filename}.md`, 'text/markdown');
    } else if (format === 'pdf') {
      this.savePDF(result, filename);
    }

    this.showToast(`Saved as ${format.toUpperCase()}`, 'success');
  }

  savePDF(result, filename) {
    const contentEl = document.getElementById(`content-${result.id}`);
    if (!contentEl || typeof html2pdf === 'undefined') {
      this.showToast('PDF not available', 'error');
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'background: white; color: #1a1a2e; padding: 20px; font-family: sans-serif;';
    wrapper.innerHTML = `
      <h2 style="color: #2563eb; margin-bottom: 8px;">${this.escapeHtml(result.query)}</h2>
      <p style="color: #555; font-size: 14px;">Time: ${result.totalTime?.toFixed(1) || 'N/A'}s | Depth: ${result.depth || 'deep'} | Format: ${result.format || 'markdown'}</p>
      <hr style="border: 1px solid #ddd; margin: 16px 0;">
      <div style="color: #1a1a2e; line-height: 1.6;">
        ${this.forceBlackText(contentEl.innerHTML)}
      </div>
    `;

    html2pdf().set({
      margin: 15,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(wrapper).save();
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

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    this.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

// Initialize
const app = new DeepResearchApp();
