// DOM Elements
const bootSequence = document.getElementById('bootSequence');
const dashboard = document.getElementById('dashboard');
const userNameInput = document.getElementById('userNameInput');
const bootSubmit = document.getElementById('bootSubmit');
const welcomeMessage = document.getElementById('welcomeMessage');
const dashboardWelcome = document.getElementById('dashboardWelcome');
const timeDisplay = document.getElementById('timeDisplay');
const dateDisplay = document.getElementById('dateDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const add1MinBtn = document.getElementById('add1Min');
const add5MinBtn = document.getElementById('add5Min');
const startTimerBtn = document.getElementById('startTimer');
const clearTimerBtn = document.getElementById('clearTimer');

// State Variables
let userName = '';
let timerSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;
let hasInitialized = false;

// Boot Sequence Logic
function initBootSequence() {
    // Focus on input immediately
    userNameInput.focus();
    
    bootSubmit.addEventListener('click', handleBootSubmit);
    userNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleBootSubmit();
        }
    });
    
    // Add input validation
    userNameInput.addEventListener('input', (e) => {
        // Remove any special characters, allow letters and spaces
        e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    });
}

function handleBootSubmit() {
    userName = userNameInput.value.trim();
    
    if (userName && userName.length >= 2) {
        // Disable input and button during transition
        userNameInput.disabled = true;
        bootSubmit.disabled = true;
        
        // Staggered exit animation
        animateBootExit();
    } else {
        // Shake animation for invalid input
        triggerShake(userNameInput);
        
        // Update placeholder for guidance
        userNameInput.placeholder = "Please enter at least 2 letters";
    }
}

function animateBootExit() {
    // Phase 1: Fade out boot logo
    document.querySelector('.boot-logo').style.opacity = '0';
    
    // Phase 2: Slide up input container and fade message
    setTimeout(() => {
        document.querySelector('.boot-message').style.opacity = '0';
        document.querySelector('.boot-input-container').style.transform = 'translateY(-20px)';
        document.querySelector('.boot-input-container').style.opacity = '0.7';
    }, 300);
    
    // Phase 3: Show welcome message
    setTimeout(() => {
        welcomeMessage.textContent = `Welcome to Canvas, ${userName}`;
        welcomeMessage.style.opacity = '1';
        welcomeMessage.style.transform = 'translateY(0)';
    }, 600);
    
    // Phase 4: Transition to dashboard
    setTimeout(() => {
        bootSequence.style.opacity = '0';
        
        setTimeout(() => {
            bootSequence.style.display = 'none';
            showDashboard();
        }, 700);
    }, 2000);
}

function showDashboard() {
    // Show dashboard
    dashboard.style.display = 'block';
    dashboardWelcome.textContent = `Hello, ${userName}!`;
    
    // Initialize clock and timer
    updateClock();
    setInterval(updateClock, 1000);
    initTimer();
    
    // Staggered entrance animation
    setTimeout(() => {
        dashboard.style.opacity = '1';
        
        // Animate header
        setTimeout(() => {
            document.querySelector('.header').style.opacity = '1';
            document.querySelector('.header').style.transform = 'translateY(0)';
            document.querySelector('.welcome-container').style.transform = 'scale(1)';
        }, 100);
        
        // Animate clock section with spring
        setTimeout(() => {
            document.querySelector('.clock-section').style.opacity = '1';
            document.querySelector('.clock-section').style.transform = 'translateY(0) scale(1)';
        }, 200);
        
        // Animate timer section with spring (delayed)
        setTimeout(() => {
            document.querySelector('.timer-section').style.opacity = '1';
            document.querySelector('.timer-section').style.transform = 'translateY(0) scale(1)';
        }, 300);
    }, 100);
}

// Clock Logic
function updateClock() {
    const now = new Date();
    
    // Format time (12-hour format)
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const formattedTime = `${hours}:${minutes} ${ampm}`;
    
    // Format date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', options);
    
    // Smooth update with crossfade effect
    timeDisplay.style.opacity = '0.7';
    dateDisplay.style.opacity = '0.7';
    
    setTimeout(() => {
        timeDisplay.textContent = formattedTime;
        dateDisplay.textContent = formattedDate;
        
        timeDisplay.style.opacity = '1';
        dateDisplay.style.opacity = '1';
    }, 100);
}

// Timer Logic
function initTimer() {
    // Add event listeners to timer buttons
    add1MinBtn.addEventListener('click', () => addTime(60));
    add5MinBtn.addEventListener('click', () => addTime(300));
    startTimerBtn.addEventListener('click', toggleTimer);
    clearTimerBtn.addEventListener('click', clearTimer);
    
    updateTimerDisplay();
}

function addTime(seconds) {
    if (!isTimerRunning) {
        // Add bounce feedback
        add1MinBtn.style.transform = 'scale(0.96)';
        add5MinBtn.style.transform = 'scale(0.96)';
        
        setTimeout(() => {
            add1MinBtn.style.transform = '';
            add5MinBtn.style.transform = '';
        }, 150);
        
        timerSeconds += seconds;
        updateTimerDisplay();
    }
}

function toggleTimer() {
    if (timerSeconds === 0) return;
    
    // Button press feedback
    startTimerBtn.style.transform = 'scale(0.96)';
    setTimeout(() => {
        startTimerBtn.style.transform = '';
    }, 150);
    
    if (!isTimerRunning) {
        startTimer();
        startTimerBtn.textContent = 'Pause';
        startTimerBtn.style.backgroundColor = '#FF9500';
        timerDisplay.classList.add('timer-running');
    } else {
        pauseTimer();
        startTimerBtn.textContent = 'Start';
        startTimerBtn.style.backgroundColor = '#34C759';
        timerDisplay.classList.remove('timer-running');
    }
}

function startTimer() {
    isTimerRunning = true;
    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
            
            // Visual feedback for last 10 seconds
            if (timerSeconds <= 10) {
                timerDisplay.style.color = '#FF3B30';
                if (timerSeconds <= 5) {
                    timerDisplay.style.animation = 'pulse 0.5s ease-in-out infinite';
                }
            }
        } else {
            clearTimer();
            // Play completion sound simulation
            playCompletionSound();
        }
    }, 1000);
}

function pauseTimer() {
    isTimerRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerDisplay.style.animation = '';
}

function clearTimer() {
    pauseTimer();
    timerSeconds = 0;
    startTimerBtn.textContent = 'Start';
    startTimerBtn.style.backgroundColor = '#34C759';
    timerDisplay.classList.remove('timer-running');
    timerDisplay.style.animation = '';
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Change color based on timer state
    if (timerSeconds === 0) {
        timerDisplay.style.color = '#86868B';
    } else if (isTimerRunning) {
        timerDisplay.style.color = '#FF9500';
    } else {
        timerDisplay.style.color = '#007AFF';
    }
}

function playCompletionSound() {
    // Create a simple beep using Web Audio API
    if (window.AudioContext || window.webkitAudioContext) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
            
            // Visual feedback for completion
            timerDisplay.style.color = '#34C759';
            setTimeout(() => {
                if (timerSeconds === 0) {
                    timerDisplay.style.color = '#86868B';
                }
            }, 1000);
        } catch (e) {
            console.log('Audio context not available:', e);
        }
    }
}

function triggerShake(element) {
    element.style.animation = 'none';
    setTimeout(() => {
        element.style.animation = 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)';
    }, 10);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS for shake animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes gentlePulse {
            0% { opacity: 1; }
            50% { opacity: 0.8; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Add gentle pulse to boot message
    document.querySelector('.boot-message').style.animation = 'gentlePulse 2s ease-in-out infinite';
    
    initBootSequence();
    
    // Initialize with a focus effect
    setTimeout(() => {
        userNameInput.focus();
        userNameInput.select();
    }, 500);
});
