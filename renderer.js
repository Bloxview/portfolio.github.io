// Canvas v1.4.1 Core System
class CanvasSystem {
    constructor() {
        this.config = null;
        this.isInitialized = false;
        this.idleTimer = null;
        this.touchStartTime = 0;
        this.lastScrollY = 0;
        this.isScrolling = false;
        this.isTimerRunning = false;
        this.timerSeconds = 0;
        this.timerInterval = null;
        
        // Performance monitoring
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        this.init();
    }

    async init() {
        try {
            await this.bootSequence();
            await this.loadConfig();
            this.setupEventListeners();
            this.initClock();
            this.initTimer();
            this.isInitialized = true;
            console.log('Canvas System initialized');
        } catch (error) {
            console.error('System init failed:', error);
            this.showError('System error. Please restart.');
        }
    }

    async bootSequence() {
        const bootSequence = document.getElementById('bootSequence');
        const bootProgress = document.querySelector('.boot-progress-bar');
        const bootStatus = document.getElementById('bootStatus');
        
        const steps = [
            { progress: 20, message: 'Starting system...' },
            { progress: 40, message: 'Loading modules...' },
            { progress: 60, message: 'Initializing display...' },
            { progress: 80, message: 'Finalizing...' },
            { progress: 100, message: 'Ready' }
        ];

        for (let i = 0; i < steps.length; i++) {
            await this.sleep(300);
            bootProgress.style.width = `${steps[i].progress}%`;
            bootStatus.textContent = steps[i].message;
        }

        await this.sleep(500);
        bootSequence.style.opacity = '0';
        
        await this.sleep(300);
        bootSequence.style.display = 'none';
        
        document.getElementById('mainInterface').style.opacity = '1';
        this.resetIdleTimer();
    }

    async loadConfig() {
        try {
            this.config = await window.electronAPI.getConfig();
            if (!this.config) {
                this.config = this.getDefaultConfig();
                await window.electronAPI.saveConfig(this.config);
            }
            this.applyConfig();
        } catch (error) {
            console.warn('Using default config:', error);
            this.config = this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            version: '1.4.1',
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
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
            },
            animations: {
                intensity: 'medium',
                springPhysics: true,
                durationMultiplier: 1.0
            },
            features: {
                hapticFeedback: true,
                devTools: false,
                performanceMonitor: false
            }
        };
    }

    applyConfig() {
        // Apply brightness
        document.body.style.filter = `brightness(${this.config.display.brightness}%)`;
        
        // Show/hide dev overlay
        const devOverlay = document.getElementById('devOverlay');
        devOverlay.style.display = this.config.features.performanceMonitor ? 'block' : 'none';
        
        // Start performance monitor if enabled
        if (this.config.features.performanceMonitor) {
            this.startPerformanceMonitor();
        }
        
        // Check night shift
        this.checkNightShift();
    }

    setupEventListeners() {
        // Touch/Mouse events
        const handleInteraction = () => this.resetIdleTimer();
        ['mousedown', 'mousemove', 'keydown', 'wheel', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, handleInteraction, true);
        });

        // Long press for settings
        document.addEventListener('mousedown', (e) => this.handleTouchStart(e));
        document.addEventListener('mouseup', (e) => this.handleTouchEnd(e));
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Scroll for timer
        document.addEventListener('wheel', (e) => this.handleScroll(e));
        
        // Prevent context menu
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        // Settings close
        document.getElementById('closeSettings').addEventListener('click', () => {
            document.getElementById('settingsLayer').classList.remove('active');
        });

        // Flash updates
        const cleanup = window.electronAPI.onFlashUpdate((moduleName) => {
            this.handleFlashUpdate(moduleName);
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            cleanup && cleanup();
        });
    }

    handleTouchStart(e) {
        this.touchStartTime = Date.now();
        // Prevent default on touch devices
        if (e.type === 'touchstart') {
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        const duration = Date.now() - this.touchStartTime;
        
        // Long press (2 seconds) for settings
        if (duration > 2000 && !e.target.closest('.timer-view, .settings-layer')) {
            this.showSettings();
        }
        
        this.touchStartTime = 0;
    }

    handleScroll(e) {
        if (this.isScrolling) return;
        
        this.isScrolling = true;
        const timerView = document.getElementById('timerView');
        
        // Show/hide timer based on scroll direction
        if (e.deltaY > 0) {
            timerView.classList.add('active');
        } else {
            timerView.classList.remove('active');
        }
        
        setTimeout(() => {
            this.isScrolling = false;
        }, 300);
    }

    resetIdleTimer() {
        // Brighten screen
        document.body.style.opacity = '1';
        
        // Hide ticker
        document.getElementById('ticker').style.opacity = '0';
        
        // Clear existing timer
        clearTimeout(this.idleTimer);
        
        // Set new timer
        this.idleTimer = setTimeout(() => {
            this.goInactive();
        }, (this.config?.display?.dimAfter || 120) * 1000);
    }

    goInactive() {
        document.body.style.opacity = '0.3';
        
        // Show ticker
        document.getElementById('ticker').style.opacity = '1';
    }

    initClock() {
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
        // Check night shift periodically
        setInterval(() => this.checkNightShift(), 60000);
    }

    updateTime() {
        const now = new Date();
        const timeDisplay = document.getElementById('timeDisplay');
        const dateDisplay = document.getElementById('dateDisplay');
        
        // Format time
        const is12h = this.config?.time?.format !== '24h';
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        if (is12h) {
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            timeDisplay.textContent = `${hours}:${minutes} ${ampm}`;
        } else {
            hours = hours.toString().padStart(2, '0');
            timeDisplay.textContent = `${hours}:${minutes}`;
        }
        
        // Format date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = now.toLocaleDateString('en-US', options);
    }

    checkNightShift() {
        const nightShift = document.getElementById('nightShift');
        const config = this.config?.display?.nightShift;
        
        if (!config?.enabled) {
            nightShift.style.opacity = '0';
            return;
        }
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const startTime = this.timeToMinutes(config.startTime);
        const endTime = this.timeToMinutes(config.endTime);
        
        const isActive = (startTime > endTime) ?
            currentTime >= startTime || currentTime < endTime :
            currentTime >= startTime && currentTime < endTime;
        
        nightShift.style.opacity = isActive ? config.warmth : '0';
    }

    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    initTimer() {
        const add1Min = document.getElementById('add1Min');
        const add5Min = document.getElementById('add5Min');
        const add10Min = document.getElementById('add10Min');
        const startTimer = document.getElementById('startTimer');
        const pauseTimer = document.getElementById('pauseTimer');
        const clearTimer = document.getElementById('clearTimer');

        add1Min.addEventListener('click', () => this.addTimerTime(60));
        add5Min.addEventListener('click', () => this.addTimerTime(300));
        add10Min.addEventListener('click', () => this.addTimerTime(600));
        startTimer.addEventListener('click', () => this.toggleTimer());
        pauseTimer.addEventListener('click', () => this.pauseTimer());
        clearTimer.addEventListener('click', () => this.clearTimer());
    }

    addTimerTime(seconds) {
        if (!this.isTimerRunning) {
            this.timerSeconds += seconds;
            this.updateTimerDisplay();
        }
    }

    toggleTimer() {
        if (this.timerSeconds === 0) return;
        
        if (!this.isTimerRunning) {
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
        this.isTimerRunning = true;
        this.timerInterval = setInterval(() => {
            if (this.timerSeconds > 0) {
                this.timerSeconds--;
                this.updateTimerDisplay();
                
                // Visual feedback for last seconds
                if (this.timerSeconds <= 10) {
                    const display = document.getElementById('timerDisplay');
                    display.style.color = '#FF3B30';
                    
                    if (this.timerSeconds <= 3) {
                        display.style.animation = 'pulse 0.5s infinite';
                    }
                }
            } else {
                this.clearTimer();
                this.playTimerComplete();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isTimerRunning = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        
        const display = document.getElementById('timerDisplay');
        display.style.animation = '';
        display.style.color = '#007AFF';
    }

    clearTimer() {
        this.pauseTimer();
        this.timerSeconds = 0;
        document.getElementById('startTimer').textContent = 'Start';
        document.getElementById('startTimer').classList.remove('danger');
        document.getElementById('startTimer').classList.add('primary');
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timerSeconds / 60);
        const seconds = this.timerSeconds % 60;
        const display = document.getElementById('timerDisplay');
        
        display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (this.timerSeconds === 0) {
            display.style.color = '#86868B';
        } else if (this.isTimerRunning) {
            display.style.color = '#FF9500';
        } else {
            display.style.color = '#007AFF';
        }
    }

    playTimerComplete() {
        // Simple beep using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.start();
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio not available');
        }
    }

    showSettings() {
        const settingsLayer = document.getElementById('settingsLayer');
        const settingsList = document.getElementById('settingsList');
        
        settingsList.innerHTML = this.renderSettings();
        settingsLayer.classList.add('active');
        
        // Setup setting controls
        this.setupSettingControls();
    }

    renderSettings() {
        const config = this.config;
        
        return `
            <div class="settings-item">
                <div class="settings-label">Night Shift</div>
                <label class="toggle-switch">
                    <input type="checkbox" data-setting="nightShift" ${config.display.nightShift.enabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="settings-item">
                <div class="settings-label">Haptic Feedback</div>
                <label class="toggle-switch">
                    <input type="checkbox" data-setting="hapticFeedback" ${config.features.hapticFeedback ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="settings-item">
                <div class="settings-label">Performance Monitor</div>
                <label class="toggle-switch">
                    <input type="checkbox" data-setting="performanceMonitor" ${config.features.performanceMonitor ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="settings-item">
                <div class="settings-label">Time Format</div>
                <select style="padding: 8px; border-radius: 8px; border: 1px solid #E5E5E7;" data-setting="timeFormat">
                    <option value="12h" ${config.time.format === '12h' ? 'selected' : ''}>12-hour</option>
                    <option value="24h" ${config.time.format === '24h' ? 'selected' : ''}>24-hour</option>
                </select>
            </div>
            
            <div class="settings-item">
                <div class="settings-label">Auto Dim</div>
                <select style="padding: 8px; border-radius: 8px; border: 1px solid #E5E5E7;" data-setting="dimAfter">
                    <option value="60" ${config.display.dimAfter === 60 ? 'selected' : ''}>1 minute</option>
                    <option value="120" ${config.display.dimAfter === 120 ? 'selected' : ''}>2 minutes</option>
                    <option value="300" ${config.display.dimAfter === 300 ? 'selected' : ''}>5 minutes</option>
                </select>
            </div>
        `;
    }

    setupSettingControls() {
        // Toggle switches
        document.querySelectorAll('.toggle-switch input').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const setting = e.target.dataset.setting;
                const value = e.target.checked;
                this.updateSetting(setting, value);
            });
        });
        
        // Select dropdowns
        document.querySelectorAll('select[data-setting]').forEach(select => {
            select.addEventListener('change', (e) => {
                const setting = e.target.dataset.setting;
                const value = e.target.value;
                this.updateSetting(setting, setting === 'dimAfter' ? parseInt(value) : value);
            });
        });
    }

    updateSetting(setting, value) {
        // Update config based on setting
        switch(setting) {
            case 'nightShift':
                this.config.display.nightShift.enabled = value;
                break;
            case 'hapticFeedback':
                this.config.features.hapticFeedback = value;
                break;
            case 'performanceMonitor':
                this.config.features.performanceMonitor = value;
                const devOverlay = document.getElementById('devOverlay');
                devOverlay.style.display = value ? 'block' : 'none';
                if (value) this.startPerformanceMonitor();
                break;
            case 'timeFormat':
                this.config.time.format = value;
                break;
            case 'dimAfter':
                this.config.display.dimAfter = value;
                this.resetIdleTimer();
                break;
        }
        
        // Save config
        window.electronAPI.saveConfig(this.config);
        
        // Apply changes
        this.applyConfig();
    }

    async handleFlashUpdate(moduleName) {
        console.log('Flash update detected:', moduleName);
        // In a real implementation, this would load and execute the module
        // For now, just show a notification
        const ticker = document.getElementById('ticker');
        ticker.textContent = `Update available: ${moduleName}`;
        ticker.style.opacity = '1';
        
        setTimeout(() => {
            ticker.style.opacity = '0';
        }, 3000);
    }

    startPerformanceMonitor() {
        const fpsCounter = document.getElementById('fpsCounter');
        
        const updateFPS = () => {
            this.frameCount++;
            const currentTime = performance.now();
            const elapsed = currentTime - this.lastTime;
            
            if (elapsed >= 1000) {
                this.fps = Math.round((this.frameCount * 1000) / elapsed);
                this.frameCount = 0;
                this.lastTime = currentTime;
                
                fpsCounter.textContent = `${this.fps} FPS`;
                fpsCounter.style.color = this.fps >= 55 ? '#34C759' : 
                                        this.fps >= 30 ? '#FF9500' : '#FF3B30';
            }
            
            requestAnimationFrame(updateFPS);
        };
        
        requestAnimationFrame(updateFPS);
    }

    showError(message) {
        console.error('System Error:', message);
        // Could show a user-friendly error message
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the system when DOM is loaded
let canvasSystem;

document.addEventListener('DOMContentLoaded', () => {
    canvasSystem = new CanvasSystem();
});

// Add CSS for pulse animation
document.head.insertAdjacentHTML('beforeend', `
<style>
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
    }
</style>
`);
