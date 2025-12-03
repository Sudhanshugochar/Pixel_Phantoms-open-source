document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const accessCard = document.getElementById('access-card');
    const authForm = document.getElementById('auth-form');
    const loginTabBtn = document.getElementById('login-tab-btn');
    const signupTabBtn = document.getElementById('signup-tab-btn');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const verificationView = document.getElementById('verification-view');
    const statusValue = document.getElementById('login-status-value');
    const feedbackMsg = document.getElementById('form-feedback');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    
    // Login form fields
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    
    // Sign Up form fields (placeholders for validation)
    const newUsernameInput = document.getElementById('new-username');
    const newEmailInput = document.getElementById('new-email');
    const newPasswordInput = document.getElementById('new-password');
    const signupBtn = document.getElementById('signup-btn');

    // Verification elements
    const verificationIcon = verificationView.querySelector('.verification-icon i');
    const verificationTitle = document.getElementById('verification-title');
    const verificationMessage = document.getElementById('verification-message');
    
    let originalLoginBtnText = loginBtn.innerHTML;
    let originalSignupBtnText = signupBtn.innerHTML;

    // --- UTILITY FUNCTIONS ---
    function showError(id, message) {
        const errorElement = document.getElementById(id);
        errorElement.textContent = message;
        errorElement.classList.add('show');
        // Add shake animation to the input card on validation error
        accessCard.classList.add('fail-icon');
        setTimeout(() => accessCard.classList.remove('fail-icon'), 500);
    }

    function hideError(id) {
        const errorElement = document.getElementById(id);
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }

    function validateField(input, errorId, message) {
        if (input.value.trim() === '') {
            showError(errorId, message);
            return false;
        }
        hideError(errorId);
        return true;
    }

    // --- STATE MANAGEMENT ---
    
    function setActiveView(viewId) {
        const views = [loginView, signupView, verificationView];
        views.forEach(view => {
            if (view.id === viewId) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });
        feedbackMsg.classList.remove('show', 'success', 'error'); // Clear general feedback on view switch
    }

    function setAuthMode(mode) {
        loginTabBtn.classList.remove('active');
        signupTabBtn.classList.remove('active');
        
        if (mode === 'login') {
            loginTabBtn.classList.add('active');
            setActiveView('login-view');
            statusValue.textContent = 'STATUS_IDLE';
        } else if (mode === 'signup') {
            signupTabBtn.classList.add('active');
            setActiveView('signup-view');
            statusValue.textContent = 'STATUS_REGISTRATION';
        }
    }

    // --- SCREENING/SIMULATION LOGIC ---

    function startVerificationSimulation(isLogin) {
        setAuthMode('verification'); // Activate the verification view
        statusValue.textContent = isLogin ? 'AUTH_SCREENING_INIT' : 'AGENT_CREATION_INIT';
        
        verificationIcon.className = 'fas fa-fingerprint fa-spin';
        verificationIcon.classList.remove('success-icon', 'fail-icon');
        verificationTitle.textContent = isLogin ? 'INITIATING ACCESS PROTOCOL...' : 'SECURE AGENT HASHING...';
        verificationMessage.textContent = 'Analyzing credentials against known hashes and security kernels.';
        
        const isSuccess = isLogin 
            ? (usernameInput.value.toLowerCase().trim() === 'neo_one' && passwordInput.value.trim() === 'matrix')
            : (newUsernameInput.value.trim() !== '' && newEmailInput.value.trim().includes('@') && newPasswordInput.value.length > 5);

        // Simulated steps for dramatic effect
        const sequenceSteps = isLogin ? [
            'VERIFYING CODENAME...',
            'DECRYPTING PASSKEY HASH...',
            'CHECKING HOST INTEGRITY...',
            'AWAITING GATEWAY RESPONSE...'
        ] : [
            'GENERATING UNIQUE AGENT ID...',
            'ENCRYPTING PASSKEY TO BLOCKCHAIN...',
            'ASSIGNING SECURE MAIL CHANNEL...',
            'FINALIZING NEW ACCOUNT CREATION...'
        ];
        
        let stepIndex = 0;
        const interval = setInterval(() => {
            if (stepIndex < sequenceSteps.length) {
                verificationTitle.textContent = sequenceSteps[stepIndex];
                stepIndex++;
            } else {
                clearInterval(interval);
            }
        }, 800 + Math.random() * 400); // Randomize step timing

        // Final result delay
        setTimeout(() => {
            clearInterval(interval);
            if (isSuccess) {
                handleSuccess(isLogin);
            } else {
                handleFailure(isLogin);
            }
        }, 4000 + Math.random() * 1000); // Total randomized delay
    }

    function handleSuccess(isLogin) {
        verificationIcon.className = 'fas fa-lock-open success-icon';
        verificationTitle.textContent = isLogin ? 'ACCESS GRANTED' : 'REGISTRATION COMPLETE';
        verificationMessage.textContent = isLogin ? 'Welcome back, Agent. Redirecting to Command Center...' : 'Agent ID successfully created. You can now log in.';
        statusValue.textContent = 'STATUS_ONLINE';

        // Redirect after Login
        if (isLogin) {
            setTimeout(() => {
                window.location.href = '../pages/leaderboard.html'; 
            }, 1000);
        }
        
        // Show success message and transition back to login for sign up
        if (!isLogin) {
            setTimeout(() => {
                setAuthMode('login');
                feedbackMsg.innerHTML = '✅ Registration successful! Please log in.';
                feedbackMsg.className = 'feedback-message success show';
            }, 1500);
        }
    }

    function handleFailure(isLogin) {
        const errorMessages = isLogin ? [
            'AUTH_FAIL: Invalid Codename or Passkey.',
            'UNAUTHORIZED ACCESS: Security violation detected.',
            'HASH_MISMATCH: Protocol rejected credentials.'
        ] : [
            'REGISTRATION FAILED: Codename already in use.',
            'PROTOCOL ERROR: Could not secure password hash.',
            'SERVER DENIED: Email key invalid.'
        ];
        
        verificationIcon.className = 'fas fa-times-circle fail-icon';
        verificationTitle.textContent = isLogin ? 'AUTHENTICATION FAILED' : 'REGISTRATION FAILED';
        verificationMessage.textContent = errorMessages[Math.floor(Math.random() * errorMessages.length)] + ' Please try again.';
        statusValue.textContent = 'STATUS_DENIED';
        
        // Keep verification view visible on failure, allowing restart/return
    }

    // --- EVENT HANDLERS ---
    
    loginTabBtn.addEventListener('click', () => setAuthMode('login'));
    signupTabBtn.addEventListener('click', () => setAuthMode('signup'));
    backToLoginBtn.addEventListener('click', () => setAuthMode('login'));

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Check which form is active
        if (loginView.classList.contains('active')) {
            const isUsernameValid = validateField(usernameInput, 'username-error', 'Codename is required');
            const isPasswordValid = validateField(passwordInput, 'password-error', 'Passkey is required');

            if (isUsernameValid && isPasswordValid) {
                startVerificationSimulation(true);
            }
        } else if (signupView.classList.contains('active')) {
            const isUsernameValid = validateField(newUsernameInput, 'new-username-error', 'Codename is required');
            const isEmailValid = validateField(newEmailInput, 'new-email-error', 'Email Key is required');
            const isPasswordValid = validateField(newPasswordInput, 'new-password-error', 'Passkey is required');

            if (isUsernameValid && isEmailValid && isPasswordValid) {
                startVerificationSimulation(false);
            }
        }
    });

    // --- INITIALIZATION ---
    function initMatrixRain() {
        const canvas = document.getElementById('cyber-rain-canvas');
        if (!canvas) return; 
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const katakana = 'アァカサタナハマヤラワガザダバパピビヂゾブヅエェケセテネヘメレヱゲゼデベペオォコソトノホモヨロヲゴゾドボポぷらーいむすたーわんきらーんあどみんいんぷっ';
        const fontSize = 16;
        const columns = canvas.width / fontSize;
        const drops = [];
        for (let i = 0; i < columns; i++) {
            drops[i] = 1;
        }
        function draw() {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + Math.random() * 0.05})`; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = fontSize + 'px "JetBrains Mono"';
            for (let i = 0; i < drops.length; i++) {
                const text = katakana[Math.floor(Math.random() * katakana.length)];
                const colorCode = Math.random() < 0.1 ? '#00ff88' : '#00aaff'; 
                ctx.fillStyle = colorCode;
                const x = i * fontSize;
                const y = drops[i] * fontSize;
                ctx.fillText(text, x, y);
                if (y * fontSize > canvas.height && Math.random() > 0.975) { 
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            drops.length = Math.floor(canvas.width / fontSize);
            for (let i = 0; i < drops.length; i++) {
                if(drops[i] === undefined) drops[i] = 0;
            }
        });
        let animationSpeed = 33 + Math.random() * 10;
        setInterval(draw, animationSpeed);
    }
    
    // Hacker stats initialization (implementation is in the previous step's JS, assumed here)
    function initHackerStats() {
        const STATS = [
            { label: "CPU_LOAD", unit: "%", min: 15, max: 80, isWarn: v => v > 90 },
            { label: "MEM_USAGE", unit: "GB", min: 2, max: 12, decimal: 1, isWarn: v => v > 10 },
            { label: "PING_LAT", unit: "ms", min: 5, max: 99, isWarn: v => v > 50 },
            { label: "CORE_TEMP", unit: "°C", min: 35, max: 65, isWarn: v => v > 60 }
        ];
        let currentStats = STATS.map(s => ({ 
            ...s, 
            value: s.min + Math.random() * (s.max - s.min) 
        }));

        function updateHackerStats() {
            const overlay = document.getElementById('hacker-stats-overlay');
            if (!overlay) return;

            let html = '<p style="color:#00aaff; margin-bottom: 10px;">SYSTEM_DIAGNOSTICS:</p>';
            
            currentStats = currentStats.map(stat => {
                const delta = (Math.random() * 10 - 5) / (stat.decimal ? 10 : 1);
                let newValue = stat.value + delta;
                newValue = Math.max(stat.min, Math.min(stat.max, newValue));

                let displayValue = stat.decimal ? newValue.toFixed(stat.decimal) : Math.round(newValue);
                let statusClass = stat.isWarn(newValue) ? 'hacker-status-warn' : 'hacker-status-ok';
                
                html += `<div class="hacker-stat-line"><span>${stat.label}</span><span class="${statusClass}">${displayValue}${stat.unit}</span></div>`;
                return { ...stat, value: newValue };
            });

            overlay.innerHTML = html;
        }
        setInterval(updateHackerStats, 750);
        updateHackerStats();
    }
    
    // Typewriter effect initialization (implementation is in the previous step's JS, assumed here)
    function selectAndAnimateMessage() {
        const dynamicMsgElement = document.getElementById('dynamic-login-message');
        const welcomeMessages = [
            "> SYSTEM_ACCESS_POINT",
            "> SYNCHRONIZING_ACCESS_KEYS",
            "> INITIATE_AGENT_HANDSHAKE"
        ];
        const targetText = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        
        dynamicMsgElement.style.animation = 'none';

        let textIndex = 0;
        dynamicMsgElement.textContent = ''; 

        const typewriter = () => {
            if (textIndex < targetText.length) {
                dynamicMsgElement.textContent += targetText.charAt(textIndex);
                textIndex++;
                setTimeout(typewriter, 75 + Math.random() * 50);
            }
        };

        typewriter();
    }
    
    selectAndAnimateMessage();
    initMatrixRain();
    initHackerStats(); 
    setAuthMode('login'); // Start in login mode
});