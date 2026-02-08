// Canvas v1.4.0 System Core
class CanvasSystem {
    constructor() {
        this.config = null;
        this.modules = {};
        this.isInitialized = false;
        this.idleTimer = null;
        this.touchStartTime = 0;
        this.lastScrollY = 0;
        this.isScrolling = false;
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        this.init();
    }

    async init() {
        try {
            await this.bootSequence();
            await this.loadConfig();
            await this.initModules();
            this.setupEventListeners();
            this.startPerformanceMonitor();
            this.startTimeEngine();
            this.log('System initialized successfully', 'info');
        } catch (error) {
            this.log(`System initialization failed: ${error.message}`, 'error');
            this.showError('System initialization failed. Please restart.');
        }
    }

    async bootSequence() {
        const bootSequence = document.getElementById('bootSequence');
        const bootProgress = document.querySelector('.boot-progress-bar');
        const bootStatus = document.getElementById('bootStatus');
        
        const steps = [
            { progress: 10, message: 'Loading kernel...' },
            { progress: 25, message: 'Checking storage...' },
            { progress: 40, message: 'Initializing display...' },
            { progress: 60, message: 'Loading modules...' },
            { progress: 80, message: 'Finalizing system...' },
            { progress: 100, message: 'Ready' }
        ];

        for (const step of steps) {
            await this.delay(400);
            bootProgress.style.width = `${step.progress}%`;
            bootStatus.textContent = step.message;
            
            // Perform system checks during boot
            if (step.progress === 25) {
                await this.checkSystemHealth();
            }
            if (step.progress === 40) {
                await this.calibrateDisplay();
            }
        }

        await this.delay(800);
        bootSequence.style.opacity = '0';
        
        await this.delay(400);
        bootSequence.style.display = 'none';
        
        document.getElementById('mainInterface').style.opacity = '1';
        this.resetIdleTimer();
    }

    async checkSystemHealth() {
        try {
            // Check local storage
            if (!localStorage) {
                throw new Error('Local storage not available');
            }
            
            // Check update directory access
            const config = await window.electron.getConfig();
            if (!config) {
                this.log('Creating default configuration', 'info');
            }
            
            return true;
        } catch (error) {
            this.log(`System health check failed: ${error.message}`, 'warning');
            return false;
        }
    }

    async calibrateDisplay() {
        // In a real implementation, this would handle touch calibration
        // For now, just simulate the process
        return new Promise(resolve => {
            setTimeout(resolve, 300);
        });
    }

    async loadConfig() {
        try {
            this.config = await window.electron.getConfig();
            if (!this.config) {
                this.config = this.getDefaultConfig();
                await window.electron.saveConfig(this.config);
            }
            
            // Apply config
            this.applyDisplaySettings();
            this.applyTimeSettings();
            this.applyAnimationSettings();
            
            this.log('Configuration loaded', 'info');
        } catch (error) {
            this.log(`Config load failed: ${error.message}`, 'error');
            this.config = this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            version: '1.4.0',
            display: {
                brightness: 100,
                dimAfter: 120,
                nightShift: {
                    enabled: false,
                    startTime: '22:00',
                    endTime: '07:00',
                    warmth: 0.5
                }
            },
            time: {
                format: '12h',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            animations: {
                intensity: 'medium',
                springPhysics: true,
                durationMultiplier: 1.0
            },
            features: {
                hapticFeedback: true,
                devTools: false,
                performanceMonitor: false,
                debugMode: false
            }
        };
    }

    applyDisplaySettings() {
        // Apply brightness
        document.body.style.filter = `brightness(${this.config.display.brightness}%)`;
        
        // Set night shift
        this.checkNightShift();
        
        // Show/hide dev overlay
        document.getElementById('devOverlay').style.display = 
            this.config.features.performanceMonitor ? 'block' : 'none';
            
        // Show/hide debug console
        document.getElementById('debugConsole').style.display = 
            this.config.features.debugMode ? 'block' : 'none';
    }

    applyTimeSettings() {
        this.updateTime();
    }

    applyAnimationSettings() {
        const multiplier = this.config.animations.durationMultiplier;
        const intensity = this.config.animations.intensity;
        
        // Adjust animation speeds based on settings
        const animations = document.querySelectorAll('*');
        animations.forEach(el => {
            const style = window.getComputedStyle(el);
            const duration = style.animationDuration || style.transitionDuration;
            if (duration && duration !== '0s') {
                const baseDuration = parseFloat(duration);
                const adjustedDuration = baseDuration * multiplier;
                
                if (style.animationDuration) {
                    el.style.animationDuration = `${adjustedDuration}s`;
                }
                if (style.transitionDuration) {
                    el.style.transitionDuration = `${adjustedDuration}s`;
                }
            }
        });
    }

    async initModules() {
        // Load core modules
        this.modules.clock = new ClockModule(this);
        this.modules.timer = new TimerModule(this);
        this.modules.settings = new SettingsModule(this);
        
        // Check for additional modules
        await this.loadExternalModules();
    }

    async loadExternalModules() {
        // In a real implementation, this would load modules from the filesystem
        // For now, just load built-in modules
    }

    setupEventListeners() {
        // Touch/Mouse events
        document.addEventListener('mousedown', (e) => this.handleTouchStart(e));
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        document.addEventListener('mouseup', (e) => this.handleTouchEnd(e));
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Scroll for navigation
        document.addEventListener('wheel', (e) => this.handleScroll(e));
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        
        // Reset idle timer on interaction
        const events = ['mousedown', 'mousemove', 'keypress', 'wheel', 'touchstart', 'touchmove'];
        events.forEach(evt => {
            document.addEventListener(evt, () => this.resetIdleTimer(), true);
        });
        
        // Long press for settings
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // IPC messages from main process
        window.electron.onFlashUpdate((moduleName) => {
            this.handleFlashUpdate(moduleName);
        });
        
        // Timezone detection
        this.detectTimezone();
    }

    handleTouchStart(e) {
        this.touchStartTime = Date.now();
        this.lastScrollY = window.scrollY;
        
        // Prevent default on touch devices for better scrolling
        if (e.type === 'touchstart') {
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        const touchDuration = Date.now() - this.touchStartTime;
        const touchTarget = e.target;
        
        // Long press (1 second) for settings
        if (touchDuration > 1000 && !touchTarget.closest('.timer-view, .settings-layer')) {
            this.showSettings();
            this.triggerHaptic();
        }
        
        // Reset touch start time
        this.touchStartTime = 0;
    }

    handleScroll(e) {
        if (this.isScrolling) return;
        
        this.isScrolling = true;
        const timerView = document.getElementById('timerView');
        const currentScroll = window.scrollY;
        
        // Determine scroll direction
        const isScrollingDown = e.deltaY > 0 || currentScroll > this.lastScrollY;
        
        if (isScrollingDown) {
            timerView.classList.add('active');
        } else {
            timerView.classList.remove('active');
        }
        
        this.lastScrollY = currentScroll;
        
        setTimeout(() => {
            this.isScrolling = false;
        }, 300);
    }

    handleTouchMove(e) {
        if (e.touches && e.touches.length === 1) {
            const touch = e.touches[0];
            const moveY = touch.clientY;
            
            // Simple vertical swipe detection
            if (Math.abs(moveY - this.lastTouchY) > 10) {
                const isSwipingDown = moveY > (this.lastTouchY || moveY);
                const timerView = document.getElementById('timerView');
                
                if (isSwipingDown) {
                    timerView.classList.add('active');
                } else {
                    timerView.classList.remove('active');
                }
            }
            
            this.lastTouchY = moveY;
        }
    }

    resetIdleTimer() {
        // Brighten screen
        document.body.style.opacity = '1';
        
        // Clear existing timer
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        
        // Set new timer
        const dimTime = this.config?.display?.dimAfter || 120;
        this.idleTimer = setTimeout(() => {
            this.goInactive();
        }, dimTime * 1000);
    }

    goInactive() {
        document.body.style.opacity = '0.2';
        
        // Show ticker when dimmed
        const ticker = document.getElementById('ticker');
        ticker.classList.add('visible');
    }

    startTimeEngine() {
        // Anti-flicker time update
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
        // Check night shift periodically
        setInterval(() => this.checkNightShift(), 60000);
    }

    updateTime() {
        const now = new Date();
        const timeDisplay = document.getElementById('timeDisplay');
        const dateDisplay = document.getElementById('dateDisplay');
        
        // Format time based on config
        const format = this.config?.time?.format || '12h';
        const options = { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: format === '12h'
        };
        
        const timeStr = now.toLocaleTimeString('en-US', options);
        const dateStr = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Smooth update using requestAnimationFrame
        requestAnimationFrame(() => {
            timeDisplay.textContent = timeStr;
            dateDisplay.textContent = dateStr;
        });
    }

    checkNightShift() {
        const nightShift = document.getElementById('nightShift');
        const config = this.config?.display?.nightShift;
        
        if (!config?.enabled) {
            nightShift.classList.remove('active');
            return;
        }
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const startTime = this.timeToMinutes(config.startTime);
        const endTime = this.timeToMinutes(config.endTime);
        
        const isActive = (startTime > endTime) ?
            currentTime >= startTime || currentTime < endTime :
            currentTime >= startTime && currentTime < endTime;
        
        if (isActive) {
            nightShift.classList.add('active');
            nightShift.style.opacity = config.warmth;
        } else {
            nightShift.classList.remove('active');
        }
    }

    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    detectTimezone() {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (this.config && this.config.time) {
            this.config.time.timezone = timezone;
            window.electron.saveConfig(this.config);
        }
    }

    showSettings() {
        const settingsLayer = document.getElementById('settingsLayer');
        const settingsContent = document.getElementById('settingsContent');
        
        // Load settings UI
        if (this.modules.settings) {
            settingsContent.innerHTML = this.modules.settings.render();
        }
        
        settingsLayer.classList.add('active');
        
        // Add event listeners for settings controls
        this.setupSettingsListeners();
    }

    setupSettingsListeners() {
        // Toggle switches
        document.querySelectorAll('.toggle-switch input').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const setting = e.target.dataset.setting;
                const value = e.target.checked;
                this.updateSetting(setting, value);
            });
        });
        
        // Segmented controls
        document.querySelectorAll('.segmented-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const setting = e.target.dataset.setting;
                const value = e.target.dataset.value;
                this.updateSetting(setting, value);
                
                // Update UI
                e.target.parentElement.querySelectorAll('.segmented-btn').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
        
        // Sliders
        document.querySelectorAll('.slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const setting = e.target.dataset.setting;
                const value = e.target.value;
                this.updateSetting(setting, parseFloat(value));
            });
        });
        
        // Close button
        document.getElementById('closeSettings').addEventListener('click', () => {
            document.getElementById('settingsLayer').classList.remove('active');
        });
    }

    updateSetting(path, value) {
        // Update config object
        const keys = path.split('.');
        let obj = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        
        obj[keys[keys.length - 1]] = value;
        
        // Save config
        window.electron.saveConfig(this.config);
        
        // Apply changes
        this.applyDisplaySettings();
        this.applyTimeSettings();
        this.applyAnimationSettings();
        
        this.log(`Setting updated: ${path} = ${value}`, 'info');
    }

    async handleFlashUpdate(moduleName) {
        this.showUpdateModal(`Installing ${moduleName}...`);
        
        try {
            // Simulate update process
            for (let i = 0; i <= 100; i += 10) {
                await this.delay(200);
                document.getElementById('updateProgress').style.width = `${i}%`;
            }
            
            // Reload the module
            await this.loadExternalModules();
            
            this.showUpdateModal('Update complete! Reloading...');
            await this.delay(1000);
            
            // Reload the system
            window.location.reload();
            
        } catch (error) {
            this.showUpdateModal('Update failed. Please try again.');
            this.log(`Flash update failed: ${error.message}`, 'error');
        }
    }

    showUpdateModal(message) {
        const modal = document.getElementById('updateModal');
        const messageEl = document.getElementById('updateMessage');
        
        messageEl.textContent = message;
        modal.classList.add('active');
    }

    triggerHaptic() {
        if (!this.config?.features?.hapticFeedback) return;
        
        const visualizer = document.getElementById('hapticVisualizer');
        visualizer.classList.add('active');
        
        setTimeout(() => {
            visualizer.classList.remove('active');
        }, 300);
    }

    startPerformanceMonitor() {
        if (!this.config?.features?.performanceMonitor) return;
        
        // FPS counter
        const fpsCounter = document.getElementById('fpsCounter');
        const memoryCounter = document.getElementById('memoryCounter');
        
        const updatePerformance = () => {
            this.frameCount++;
            const currentTime = performance.now();
            const elapsed = currentTime - this.lastTime;
            
            if (elapsed >= 1000) {
                this.fps = Math.round((this.frameCount * 1000) / elapsed);
                this.frameCount = 0;
                this.lastTime = currentTime;
                
                // Update FPS display
                fpsCounter.textContent = `${this.fps} FPS`;
                fpsCounter.className = 'fps-counter ';
                
                if (this.fps >= 55) fpsCounter.className += 'good';
                else if (this.fps >= 30) fpsCounter.className += 'okay';
                else fpsCounter.className += 'poor';
                
                // Update memory display (simulated)
                const memory = Math.round(performance.memory?.usedJSHeapSize / 1048576) || '--';
                memoryCounter.textContent = `${memory} MB`;
            }
            
            requestAnimationFrame(updatePerformance);
        };
        
        requestAnimationFrame(updatePerformance);
    }

    log(message, type = 'info') {
        console[type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log'](`[Canvas] ${message}`);
        
        // Add to debug console if enabled
        if (this.config?.features?.debugMode) {
            const consoleEl = document.getElementById('debugConsole');
            const entry = document.createElement('div');
            entry.className = `debug-entry ${type}`;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            consoleEl.appendChild(entry);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    }

    showError(message) {
        this.log(message, 'error');
        this.triggerHaptic();
        
        // Could show a user-friendly error modal here
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Clock Module
class ClockModule {
    constructor(system) {
        this.system = system;
    }
    
    // Additional clock functionality can be added here
}

// Timer Module
class TimerModule {
    constructor(system) {
        this.system = system;
        this.seconds = 0;
        this.isRunning = false;
        this.interval = null;
        
        this.init();
    }
    
    init() {
        // Setup timer controls
        document.getElementById('add1Min').addEventListener('click', () => this.addTime(60));
        document.getElementById('add5Min').addEventListener('click', () => this.addTime(300));
        document.getElementById('add10Min').addEventListener('click', () => this.addTime(600));
        document.getElementById('startTimer').addEventListener('click', () => this.toggleTimer());
        document.getElementById('pauseTimer').addEventListener('click', () => this.pauseTimer());
        document.getElementById('clearTimer').addEventListener('click', () => this.clearTimer());
        
        this.updateDisplay();
    }
    
    addTime(seconds) {
        if (!this.isRunning) {
            this.seconds += seconds;
            this.updateDisplay();
            this.system.triggerHaptic();
        }
    }
    
    toggleTimer() {
        if (this.seconds === 0) return;
        
        if (!this.isRunning) {
            this.startTimer();
            document.getElementById('startTimer').textContent = 'Stop';
            document.getElementById('startTimer').classList.add('danger');
            document.getElementById('startTimer').classList.remove('primary');
        } else {
            this.pauseTimer();
            document.getElementById('startTimer').textContent = 'Start';
            document.getElementById('startTimer').classList.remove('danger');
            document.getElementById('startTimer').classList.add('primary');
        }
    }
    
    startTimer() {
        this.isRunning = true;
        this.interval = setInterval(() => {
            if (this.seconds > 0) {
                this.seconds--;
                this.updateDisplay();
                
                // Visual feedback for last seconds
                if (this.seconds <= 10) {
                    const display = document.getElementById('timerDisplay');
                    display.style.color = '#FF3B30';
                    
                    if (this.seconds <= 3) {
                        display.style.animation = 'pulse 0.5s ease-in-out infinite';
                    }
                }
            } else {
                this.clearTimer();
                this.system.triggerHaptic();
                this.showCompletion();
            }
        }, 1000);
    }
    
    pauseTimer() {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        const display = document.getElementById('timerDisplay');
        display.style.animation = '';
        display.style.color = '#FF9500';
    }
    
    clearTimer() {
        this.pauseTimer();
        this.seconds = 0;
        document.getElementById('startTimer').textContent = 'Start';
        document.getElementById('startTimer').classList.remove('danger');
        document.getElementById('startTimer').classList.add('primary');
        this.updateDisplay();
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.seconds / 60);
        const seconds = this.seconds % 60;
        const display = document.getElementById('timerDisplay');
        
        requestAnimationFrame(() => {
            display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (this.seconds === 0) {
                display.style.color = '#86868B';
            } else if (this.isRunning) {
                display.style.color = '#FF9500';
            } else {
                display.style.color = '#007AFF';
            }
        });
    }
    
    showCompletion() {
        // Could show a completion animation or notification
        this.system.log('Timer completed', 'info');
    }
}

// Settings Module
class SettingsModule {
    constructor(system) {
        this.system = system;
    }
    
    render() {
        const config = this.system.config;
        
        return `
            <div class="settings-section">
                <div class="section-title">Display</div>
                
                <div class="settings-item">
                    <div class="settings-label">Night Shift</div>
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="display.nightShift.enabled" ${config.display.nightShift.enabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="settings-item">
                    <div class="settings-label">Auto Dim</div>
                    <div class="slider-container">
                        <input type="range" class="slider" min="30" max="300" step="30" 
                               data-setting="display.dimAfter" value="${config.display.dimAfter}">
                    </div>
                </div>
                
                <div class="settings-item">
                    <div class="settings-label">Brightness Limit</div>
                    <div class="slider-container">
                        <input type="range" class="slider" min="10" max="100" step="10"
                               data-setting="display.brightness" value="${config.display.brightness}">
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <div class="section-title">Time</div>
                
                <div class="settings-item">
                    <div class="settings-label">Time Format</div>
                    <div class="segmented-control">
                        <button class="segmented-btn ${config.time.format === '12h' ? 'active' : ''}" 
                                data-setting="time.format" data-value="12h">12h</button>
                        <button class="segmented-btn ${config.time.format === '24h' ? 'active' : ''}"
                                data-setting="time.format" data-value="24h">24h</button>
                    </div>
                </div>
                
                <div class="settings-item">
                    <div class="settings-label">Timezone</div>
                    <div style="font-size: 16px; color: #86868B;">${config.time.timezone}</div>
                </div>
            </div>
            
            <div class="settings-section">
                <div class="section-title">Animations</div>
                
                <div class="settings-item">
                    <div class="settings-label">Motion Intensity</div>
                    <div class="segmented-control">
                        <button class="segmented-btn ${config.animations.intensity === 'low' ? 'active' : ''}"
                                data-setting="animations.intensity" data-value="low">Low</button>
                        <button class="segmented-btn ${config.animations.intensity === 'medium' ? 'active' : ''}"
                                data-setting="animations.intensity" data-value="medium">Medium</button>
                        <button class="segmented-btn ${config.animations.intensity === 'high' ? 'active' : ''}"
                                data-setting="animations.intensity" data-value="high">High</button>
                    </div>
                </div>
                
                <div class="settings-item">
                    <div class="settings-label">Spring Physics</div>
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="animations.springPhysics" ${config.animations.springPhysics ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <div class="section-title">Features</div>
                
                <div class="settings-item">
                    <div class="settings-label">Haptic Feedback</div>
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="features.hapticFeedback" ${config.features.hapticFeedback ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="settings-item">
                    <div class="settings-label">Performance Monitor</div>
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="features.performanceMonitor" ${config.features.performanceMonitor ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="settings-item">
                    <div class="settings-label">Debug Mode</div>
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="features.debugMode" ${config.features.debugMode ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <div class="section-title">System</div>
                
                <div class="settings-item">
                    <div class="settings-label">Version</div>
                    <div style="font-size: 16px; color: #86868B;">Canvas v${config.version}</div>
                </div>
                
                <div class="settings-item">
                    <div class="settings-label">Screen Cleaning Mode</div>
                    <button class="timer-btn" onclick="canvasSystem.startScreenCleaning()" style="font-size: 16px; padding: 12px 24px;">
                        Start Cleaning
                    </button>
                </div>
                
                <div class="settings-item">
                    <div class="settings-label">Export Configuration</div>
                    <button class="timer-btn" onclick="canvasSystem.exportConfig()" style="font-size: 16px; padding: 12px 24px;">
                        Export
                    </button>
                </div>
            </div>
        `;
    }
}

// Screen Cleaning Mode Extension
CanvasSystem.prototype.startScreenCleaning = function() {
    const cleaningMode = document.getElementById('cleaningMode');
    const cleaningTimer = document.getElementById('cleaningTimer');
    
    cleaningMode.classList.add('active');
    
    let seconds = 30;
    const countdown = setInterval(() => {
        seconds--;
        cleaningTimer.textContent = seconds;
        
        if (seconds <= 0) {
            clearInterval(countdown);
            cleaningMode.classList.remove('active');
            this.log('Screen cleaning completed', 'info');
        }
    }, 1000);
};

CanvasSystem.prototype.exportConfig = function() {
    const configStr = JSON.stringify(this.config, null, 2);
    const blob = new Blob([configStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    this.log('Configuration exported', 'info');
};

// Initialize the system
let canvasSystem;

document.addEventListener('DOMContentLoaded', () => {
    canvasSystem = new CanvasSystem();
});

// Make system available globally for debugging
window.canvasSystem = canvasSystem;
