/* =========================================
   PIXEL PHANTOMS | GLOBAL COMMAND CENTER
   Core Logic: GitHub API + Event Data + HUD Navigation
   ========================================= */

const REPO_OWNER = 'sayeeg-11';
const REPO_NAME = 'Pixel_Phantoms';
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const EVENTS_DATA_URL = 'data/events.json';

// --- SCORING MATRIX (Inspired by Contributors.js) ---
// Scaled up for "XP" feel
const SCORING = {
    PR: {
        L3: 1100,    // High Complexity (was 11)
        L2: 500,     // Medium Complexity (was 5)
        L1: 200,     // Low Complexity (was 2)
        DEFAULT: 100
    },
    EVENT: {
        ATTENDANCE: 250, // Points per event attended
        HOSTING: 500     // Points for hosting (derived logic if needed)
    }
};

// --- ACHIEVEMENT SYSTEM ---
const ACHIEVEMENTS = [
    { id: 'first_pr', name: 'First PR', description: 'Submitted your first pull request', icon: 'fas fa-code-branch', xp: 100 },
    { id: 'ten_prs', name: 'PR Master', description: 'Submitted 10 pull requests', icon: 'fas fa-code', xp: 500 },
    { id: 'high_complexity', name: 'Complex Solver', description: 'Submitted a Level 3 PR', icon: 'fas fa-brain', xp: 300 },
    { id: 'consistent_contributor', name: 'Consistent Contributor', description: 'Active for 30 days', icon: 'fas fa-calendar-check', xp: 400 },
    { id: 'team_player', name: 'Team Player', description: 'Participated in 3 events', icon: 'fas fa-users', xp: 250 },
    { id: 'speed_demon', name: 'Speed Demon', description: 'Merged PR within 24 hours', icon: 'fas fa-bolt', xp: 200 },
    { id: 'quality_assurance', name: 'Quality Assurance', description: 'PR with no review comments', icon: 'fas fa-check-circle', xp: 150 },
    { id: 'community_leader', name: 'Community Leader', description: 'Hosted an event', icon: 'fas fa-crown', xp: 1000 }
];

// --- STATE MANAGEMENT ---
let globalState = {
    contributors: [],
    pullRequests: [],
    events: [],
    eventStats: {
        totalEvents: 0,
        totalAttendance: 0
    },
    physics: {
        totalMass: 0,
        avgVelocity: 0
    },
    achievements: {}, // Track user achievements
    currentUser: null // Track currently viewed user
};

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initNavigation();
    init3DInteraction();
    initComparisonFeature();
});

/* =========================================
   1. NAVIGATION SYSTEM (HUD TABS)
   ========================================= */
function initNavigation() {
    const buttons = document.querySelectorAll('.sidebar-icon');
    const sections = document.querySelectorAll('.hud-section');
    const title = document.getElementById('page-title');
    const subtitle = document.getElementById('page-subtitle');

    const titles = {
        'dashboard-view': { t: 'PERFORMANCE_MATRIX', s: ':: SYSTEM OVERRIDE // EVENT_PROTOCOL_V2 ::' },
        'teams-view':     { t: 'AGENT_ROSTER', s: ':: CLASSIFIED PERSONNEL DATABASE ::' },
        'projects-view':  { t: 'PROJECT_SCHEMATICS', s: ':: R&D ARCHIVES ::' },
        'achievements-view': { t: 'ACHIEVEMENTS', s: ':: UNLOCK YOUR POTENTIAL ::' },
        'settings-view':  { t: 'SYSTEM_CONFIG', s: ':: ROOT ACCESS REQUIRED ::' }
    };

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            buttons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active to current
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');

            // Update Header Text
            if (titles[targetId] && title && subtitle) {
                // Optional glitch effect reset could go here
                title.setAttribute('data-text', titles[targetId].t);
                title.innerText = titles[targetId].t;
                subtitle.innerText = titles[targetId].s;
            }

            // Initialize view-specific features
            if (targetId === 'achievements-view') {
                renderAchievements();
            }
        });
    });
}

/* =========================================
   2. DATA AGGREGATION SYSTEM
   ========================================= */
async function initDashboard() {
    const tableBody = document.getElementById('leaderboard-body');
    if(tableBody) tableBody.innerHTML = '<tr><td colspan="6" class="loading-text">INITIALIZING DATA STREAMS...</td></tr>';

    try {
        // Parallel Data Fetching
        const [repoData, prData, eventsData] = await Promise.all([
            fetch(API_BASE).then(res => res.json()),
            fetchAllPulls(),
            fetchEventsData()
        ]);

        // Process Data
        globalState.events = eventsData;
        globalState.eventStats = {
            totalEvents: eventsData.length,
            totalAttendance: eventsData.length * 20 // Mock value
        };
        globalState.pullRequests = prData;

        // Calculate Scores
        const leaderboard = calculateLeaderboard(prData, eventsData);
        
        // Render UI Components
        updateGlobalHUD(leaderboard, globalState.eventStats);
        renderLeaderboardTable(leaderboard);
        renderPhysicsEngine(leaderboard);
        renderVisualizers(leaderboard);
        
        // Render Roster (Teams View)
        populateRoster(leaderboard);

        // Store contributors for later use
        globalState.contributors = leaderboard;

    } catch (error) {
        console.warn("⚠️ System Offline or Rate Limited. engaging_mock_protocol();", error);
        loadMockProtocol();
    }
}

// --- GITHUB API: FETCH ALL PRS ---
async function fetchAllPulls() {
    let pulls = [];
    let page = 1;
    // Limit to 3 pages to prevent API lockout during demo/dev
    while (page <= 3) {
        try {
            const res = await fetch(`${API_BASE}/pulls?state=all&per_page=100&page=${page}`);
            if (!res.ok) break;
            const data = await res.json();
            if (!data.length) break;
            pulls = pulls.concat(data);
            page++;
        } catch(e) { break; }
    }
    return pulls;
}

// --- FETCH EVENTS DATA ---
async function fetchEventsData() {
    try {
        const res = await fetch(EVENTS_DATA_URL);
        if(!res.ok) return []; 
        const data = await res.json();
        return data;
    } catch (e) {
        console.warn("Failed to fetch events data:", e);
        return [];
    }
}

/* =========================================
   3. SCORING & PHYSICS ALGORITHM
   ========================================= */
function calculateLeaderboard(pulls, eventsData) {
    const userMap = {};

    // Date for Velocity Calculation (e.g., last 60 days)
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 60);

    // A. Process Pull Requests
    pulls.forEach(pr => {
        if (!pr.merged_at) return; // Only merged PRs count
        
        const user = pr.user.login;
        if (user.toLowerCase() === REPO_OWNER.toLowerCase()) return; // Optional: Exclude owner from ranking

        if (!userMap[user]) initUser(userMap, user, pr.user.avatar_url);

        // -- Mass Calculation (Complexity based on labels) --
        let prPoints = SCORING.PR.DEFAULT;
        let massGain = 5; // Base mass
        let hasHighComplexity = false;

        pr.labels.forEach(label => {
            const name = label.name.toLowerCase();
            if (name.includes('level 3')) { 
                prPoints = SCORING.PR.L3; 
                massGain = 30; 
                hasHighComplexity = true;
            }
            else if (name.includes('level 2')) { 
                prPoints = SCORING.PR.L2; 
                massGain = 15; 
            }
            else if (name.includes('level 1')) { 
                prPoints = SCORING.PR.L1; 
                massGain = 10; 
            }
        });

        userMap[user].xp += prPoints;
        userMap[user].mass += massGain;
        userMap[user].prCount++;

        // Track achievements
        if (!userMap[user].achievements) userMap[user].achievements = {};
        
        // First PR achievement
        if (userMap[user].prCount === 1) {
            userMap[user].achievements['first_pr'] = true;
            userMap[user].xp += ACHIEVEMENTS.find(a => a.id === 'first_pr').xp;
        }
        
        // Ten PRs achievement
        if (userMap[user].prCount === 10) {
            userMap[user].achievements['ten_prs'] = true;
            userMap[user].xp += ACHIEVEMENTS.find(a => a.id === 'ten_prs').xp;
        }
        
        // High complexity achievement
        if (hasHighComplexity) {
            userMap[user].achievements['high_complexity'] = true;
            userMap[user].xp += ACHIEVEMENTS.find(a => a.id === 'high_complexity').xp;
        }

        // -- Velocity Calculation (Recent Activity) --
        if (new Date(pr.merged_at) > recentCutoff) {
            userMap[user].velocity += 10; // Speed boost for recency
        }
    });

    // B. Process Events Participation
    // In a real implementation, this would come from actual attendance data
    // For now, we'll simulate event participation based on PR activity
    Object.keys(userMap).forEach(user => {
        // Users with more PRs are likely to attend more events
        const eventParticipation = Math.min(Math.floor(userMap[user].prCount / 2), eventsData.length);
        
        const eventXP = eventParticipation * SCORING.EVENT.ATTENDANCE;
        
        userMap[user].xp += eventXP;
        userMap[user].events += eventParticipation;
        // Events add momentum (Mass + Velocity impact)
        userMap[user].mass += (eventParticipation * 2); 
        userMap[user].velocity += (eventParticipation * 5); 
    });

    // C. Finalize & Sort
    const leaderboard = Object.values(userMap).sort((a, b) => b.xp - a.xp);
    
    // Assign Ranks, Classes & Status
    return leaderboard.map((agent, index) => {
        agent.rank = index + 1;
        
        // Determine Class (Role)
        if (agent.mass > 100) agent.class = 'TITAN'; // Heavy contributor
        else if (agent.velocity > 50) agent.class = 'STRIKER'; // Fast contributor
        else if (agent.events > 3) agent.class = 'SCOUT'; // Community active
        else agent.class = 'ROOKIE';

        // Determine Status
        if (agent.velocity > 80) agent.status = 'OVERDRIVE';
        else if (agent.velocity > 20) agent.status = 'ONLINE';
        else agent.status = 'IDLE';

        return agent;
    });
}

function initUser(map, login, avatar) {
    map[login] = {
        login,
        avatar,
        xp: 0,
        mass: 0,      
        velocity: 0,  
        events: 0,
        prCount: 0,
        achievements: {}
    };
}

/* =========================================
   4. RENDERING & UI UPDATES
   ========================================= */

function updateGlobalHUD(data, eventStats) {
    animateCount('total-performers', data.length);
    animateCount('total-events', eventStats.totalEvents);
    animateCount('total-attendance', eventStats.totalAttendance);
    
    // Fake Ping Update
    setInterval(() => {
        const ping = Math.floor(Math.random() * 20) + 10;
        const pingEl = document.getElementById('ping-counter');
        if(pingEl) {
            pingEl.innerText = `${ping}ms`;
            pingEl.style.color = ping > 30 ? '#ff0055' : '#0aff60';
        }
    }, 2000);
}

function renderLeaderboardTable(data) {
    const tbody = document.getElementById('leaderboard-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    // Show top 50
    data.slice(0, 50).forEach(agent => {
        const row = document.createElement('tr');
        row.addEventListener('click', () => openModal(agent));
        
        // Dynamic colors based on status/class
        let classColor = '#00f3ff'; // Default Cyan
        if(agent.class === 'TITAN') classColor = '#ff0055'; // Pink
        if(agent.class === 'STRIKER') classColor = '#ffd700'; // Gold

        const velPercent = Math.min(agent.velocity, 100);

        row.innerHTML = `
            <td class="rank-cell">#${String(agent.rank).padStart(2,'0')}</td>
            <td class="agent-cell">
                <img src="${agent.avatar}" onerror="this.src='assets/logo.png'">
                <div>
                    <span class="agent-name">${agent.login}</span>
                    <span class="agent-sub">Events: ${agent.events} | PRs: ${agent.prCount}</span>
                </div>
            </td>
            <td style="color:${classColor}; font-weight:800; letter-spacing:1px;">${agent.class}</td>
            <td class="velocity-cell">
                <div class="v-bar-bg" title="Velocity: ${agent.velocity}">
                    <div class="v-bar-fill" style="width:${velPercent}%"></div>
                </div>
            </td>
            <td class="xp-cell">${agent.xp.toLocaleString()}</td>
            <td><span class="status-badge ${agent.status.toLowerCase()}">${agent.status}</span></td>
        `;
        tbody.appendChild(row);
    });

    // Search Feature
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }
    
    // Add export functionality
    const exportBtn = document.getElementById('export-leaderboard');
    if(exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportLeaderboard(data);
        });
    }
}

function renderPhysicsEngine(data) {
    if(!data.length) return;
    const topAgent = data[0];

    // Normalize stats for visualization (relative to top agent or fixed max)
    // Cap bars at 100%
    const maxV = 150; // Arbitrary max velocity
    const maxM = 200; // Arbitrary max mass
    
    const vPct = Math.min((topAgent.velocity / maxV) * 100, 100);
    const mPct = Math.min((topAgent.mass / maxM) * 100, 100); 
    const fPct = 100; // Top agent always impacts max relative to leaderboard context

    const bars = document.querySelectorAll('.physics-stat .bar-fill');
    if(bars.length >= 3) {
        bars[0].style.width = `${vPct}%`; // Velocity
        bars[1].style.width = `${mPct}%`; // Mass
        bars[2].style.width = `${fPct}%`; // Impact
    }
}

function renderVisualizers(data) {
    const container = document.getElementById('chart-bars');
    if(!container) return;
    container.innerHTML = '';
    
    // Visualize Top 20 XP distribution
    const slice = data.slice(0, 20);
    if(slice.length === 0) return;
    
    const maxScore = slice[0].xp;

    slice.forEach((agent, i) => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        const height = Math.max((agent.xp / maxScore) * 100, 5); // Min 5% height
        bar.style.height = `${height}%`;
        bar.style.animationDelay = `${i * 0.05}s`;
        bar.title = `${agent.login}: ${agent.xp} XP`;
        container.appendChild(bar);
    });
}

function populateRoster(data) {
    const goldList = document.getElementById('roster-gold');
    const silverList = document.getElementById('roster-silver');
    const bronzeList = document.getElementById('roster-bronze');
    
    if (!goldList || !silverList || !bronzeList) return;
    
    goldList.innerHTML = ''; silverList.innerHTML = ''; bronzeList.innerHTML = '';

    data.forEach(agent => {
        const item = document.createElement('li');
        item.className = 'roster-item';
        item.innerHTML = `
            <img src="${agent.avatar}" onerror="this.src='assets/logo.png'">
            <div>
                <strong style="color:#e0f7ff; display:block; font-size:0.9rem;">${agent.login}</strong>
                <span style="font-size:0.7rem; color:#5c7080;">${agent.xp} XP</span>
            </div>
        `;

        // Logic for Roster Tiers
        if (agent.xp >= 5000) goldList.appendChild(item);
        else if (agent.xp >= 2000) silverList.appendChild(item);
        else bronzeList.appendChild(item);
    });
}

/* =========================================
   5. 3D INTERACTION LOGIC
   ========================================= */
function init3DInteraction() {
    const container = document.querySelector('.stage-3d-panel');
    const cube = document.getElementById('cube');

    if (!container || !cube) return;

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left; 
        const y = e.clientY - rect.top; 
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateY = ((x - centerX) / centerX) * 45; 
        const rotateX = -((y - centerY) / centerY) * 45;

        cube.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    container.addEventListener('mouseleave', () => {
        cube.style.transform = `rotateX(-20deg) rotateY(-30deg)`; // Reset position
    });
}

/* =========================================
   6. ACHIEVEMENTS SYSTEM
   ========================================= */
function renderAchievements() {
    const container = document.getElementById('achievements-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    ACHIEVEMENTS.forEach(achievement => {
        const card = document.createElement('div');
        card.className = 'achievement-card';
        card.innerHTML = `
            <div class="achievement-icon">
                <i class="${achievement.icon}"></i>
            </div>
            <div class="achievement-info">
                <h4>${achievement.name}</h4>
                <p>${achievement.description}</p>
                <span class="xp-value">+${achievement.xp} XP</span>
            </div>
        `;
        container.appendChild(card);
    });
}

/* =========================================
   7. COMPARISON FEATURE
   ========================================= */
function initComparisonFeature() {
    const compareBtn = document.getElementById('compare-btn');
    if (compareBtn) {
        compareBtn.addEventListener('click', () => {
            const select = document.getElementById('compare-user-select');
            const selectedUser = select.value;
            if (selectedUser && globalState.contributors.length > 0) {
                const user = globalState.contributors.find(u => u.login === selectedUser);
                if (user) showComparison(user);
            }
        });
    }
}

function populateUserSelect(users) {
    const select = document.getElementById('compare-user-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select a user to compare</option>';
    
    users.slice(0, 20).forEach(user => {
        const option = document.createElement('option');
        option.value = user.login;
        option.textContent = `${user.login} (${user.xp} XP)`;
        select.appendChild(option);
    });
}

function showComparison(compareUser) {
    const currentUser = globalState.currentUser;
    const container = document.getElementById('comparison-results');
    if (!container || !currentUser) return;
    
    // Find the current user in the contributors list
    const current = globalState.contributors.find(u => u.login === currentUser);
    if (!current) return;
    
    container.innerHTML = `
        <div class="comparison-charts">
            <div class="chart-container">
                <h4>XP Comparison</h4>
                <div class="comparison-bar">
                    <div class="bar-label">${current.login}</div>
                    <div class="bar-track">
                        <div class="bar-fill current" style="width: ${Math.min((current.xp / Math.max(current.xp, compareUser.xp)) * 100, 100)}%"></div>
                    </div>
                    <div class="bar-value">${current.xp.toLocaleString()}</div>
                </div>
                <div class="comparison-bar">
                    <div class="bar-label">${compareUser.login}</div>
                    <div class="bar-track">
                        <div class="bar-fill compare" style="width: ${Math.min((compareUser.xp / Math.max(current.xp, compareUser.xp)) * 100, 100)}%"></div>
                    </div>
                    <div class="bar-value">${compareUser.xp.toLocaleString()}</div>
                </div>
            </div>
            
            <div class="chart-container">
                <h4>PR Count Comparison</h4>
                <div class="comparison-bar">
                    <div class="bar-label">${current.login}</div>
                    <div class="bar-track">
                        <div class="bar-fill current" style="width: ${Math.min((current.prCount / Math.max(current.prCount, compareUser.prCount)) * 100, 100)}%"></div>
                    </div>
                    <div class="bar-value">${current.prCount}</div>
                </div>
                <div class="comparison-bar">
                    <div class="bar-label">${compareUser.login}</div>
                    <div class="bar-track">
                        <div class="bar-fill compare" style="width: ${Math.min((compareUser.prCount / Math.max(current.prCount, compareUser.prCount)) * 100, 100)}%"></div>
                    </div>
                    <div class="bar-value">${compareUser.prCount}</div>
                </div>
            </div>
        </div>
        
        <div class="comparison-stats">
            <div class="stat-card">
                <h4>Winner</h4>
                <p class="winner">${current.xp > compareUser.xp ? current.login : compareUser.login}</p>
            </div>
            <div class="stat-card">
                <h4>XP Difference</h4>
                <p>${Math.abs(current.xp - compareUser.xp).toLocaleString()} XP</p>
            </div>
            <div class="stat-card">
                <h4>PR Difference</h4>
                <p>${Math.abs(current.prCount - compareUser.prCount)}</p>
            </div>
        </div>
    `;
}

/* =========================================
   8. MODAL FUNCTIONALITY
   ========================================= */
function openModal(contributor) {
    globalState.currentUser = contributor.login;
    
    const modal = document.getElementById('contributor-modal');
    const modalContainer = modal.querySelector('.modal-container');
    document.getElementById('modal-avatar').src = contributor.avatar;
    document.getElementById('modal-name').textContent = contributor.login;
    document.getElementById('modal-id').textContent = `ID: ${contributor.id || 'N/A'}`; 
    document.getElementById('modal-rank').textContent = `#${contributor.rank}`;
    document.getElementById('modal-score').textContent = contributor.xp;
    document.getElementById('modal-prs').textContent = contributor.prCount;
    document.getElementById('modal-commits').textContent = contributor.contributions || 0;
    document.getElementById('modal-league-badge').textContent = contributor.class || 'Contributor';
    
    // Progress bar
    const levelProgress = (contributor.xp % 1000) / 10; // Simple progress calculation
    document.getElementById('progress-fill').style.width = `${levelProgress}%`;
    document.getElementById('progress-text').textContent = `Level Progress: ${Math.round(levelProgress)}%`;
    
    // Check for links in mock mode
    const prLink = contributor.html_url && contributor.html_url !== '#' 
        ? `https://github.com/${REPO_OWNER}/${REPO_NAME}/pulls?q=is%3Apr+author%3A${contributor.login}` 
        : '#';
        
    document.getElementById('modal-pr-link').href = prLink;
    document.getElementById('modal-profile-link').href = contributor.html_url || '#';

    // Render achievements
    renderUserAchievements(contributor.achievements);

    modalContainer.className = 'modal-container'; 
    // Add class based on contributor class for styling
    if (contributor.class) {
        modalContainer.classList.add(`tier-${contributor.class.toLowerCase()}`);
    }
    modal.classList.add('active');
}

function renderUserAchievements(achievements) {
    const container = document.getElementById('modal-achievements');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!achievements || Object.keys(achievements).length === 0) {
        container.innerHTML = '<p class="no-achievements">No achievements yet. Keep contributing!</p>';
        return;
    }
    
    Object.keys(achievements).forEach(achId => {
        if (achievements[achId]) {
            const achievement = ACHIEVEMENTS.find(a => a.id === achId);
            if (achievement) {
                const achElement = document.createElement('div');
                achElement.className = 'modal-achievement';
                achElement.innerHTML = `
                    <i class="${achievement.icon}"></i>
                    <div>
                        <h5>${achievement.name}</h5>
                        <p>${achievement.description}</p>
                    </div>
                `;
                container.appendChild(achElement);
            }
        }
    });
}

window.closeModal = function() {
    const modal = document.getElementById('contributor-modal');
    if(modal) modal.classList.remove('active');
}

/* =========================================
   UTILS & MOCK DATA (Fallback)
   ========================================= */
function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let start = 0;
    const duration = 2000;
    let startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        
        el.innerHTML = Math.floor(ease * target).toLocaleString();
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    }
    window.requestAnimationFrame(step);
}

function exportLeaderboard(data) {
    // Create CSV content
    let csvContent = "Rank,Username,XP,Class,Status,PRs,Events,Mass,Velocity\n";
    data.forEach(agent => {
        csvContent += `${agent.rank},${agent.login},${agent.xp},${agent.class},${agent.status},${agent.prCount},${agent.events},${agent.mass},${agent.velocity}\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pixel_phantoms_leaderboard_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function loadMockProtocol() {
    // Fallback data if API fails
    const mockData = [
        { login: "Neo_One", avatar_url: "", xp: 15000, velocity: 90, mass: 80, prCount: 15, events: 5, rank: 1, class: "TITAN", status: "OVERDRIVE", achievements: {'first_pr': true, 'ten_prs': true, 'high_complexity': true} },
        { login: "Trinity", avatar_url: "", xp: 12500, velocity: 75, mass: 50, prCount: 12, events: 4, rank: 2, class: "STRIKER", status: "ONLINE", achievements: {'first_pr': true, 'ten_prs': true} },
        { login: "Morpheus", avatar_url: "", xp: 9800, velocity: 40, mass: 60, prCount: 20, events: 1, rank: 3, class: "TITAN", status: "ONLINE", achievements: {'first_pr': true, 'ten_prs': true, 'team_player': true} },
        { login: "Cipher", avatar_url: "", xp: 5000, velocity: 10, mass: 20, prCount: 5, events: 8, rank: 4, class: "SCOUT", status: "IDLE", achievements: {'first_pr': true, 'team_player': true} },
        { login: "Switch", avatar_url: "", xp: 3200, velocity: 85, mass: 10, prCount: 8, events: 0, rank: 5, class: "STRIKER", status: "ONLINE", achievements: {'first_pr': true} },
    ];
    
    const mockStats = { totalEvents: 15, totalAttendance: 450 };
    
    updateGlobalHUD(mockData, mockStats);
    renderLeaderboardTable(mockData);
    renderPhysicsEngine(mockData);
    renderVisualizers(mockData);
    populateRoster(mockData);
    
    // Store contributors for later use
    globalState.contributors = mockData;
}