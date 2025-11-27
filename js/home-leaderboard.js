// js/home-leaderboard.js

const REPO_OWNER = 'sayeeg-11';
const REPO_NAME = 'Pixel_Phantoms';
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const XP_MULTIPLIER = 100; // 1 Point = 100 XP

// Scoring System
const POINTS = {
    L3: 11,
    L2: 5,
    L1: 2,
    DEFAULT: 1
};

// League Perks Definition
const LEAGUES = {
    GOLD: { threshold: 15000, name: 'Gold', perk: '🏆 Access to Core Team', color: '#FFD700' },
    SILVER: { threshold: 7500, name: 'Silver', perk: '👕 Exclusive Merch', color: '#C0C0C0' },
    BRONZE: { threshold: 3000, name: 'Bronze', perk: '👾 Discord VIP Badge', color: '#CD7F32' },
    ROOKIE: { threshold: 0, name: 'Rookie', perk: '🌱 Contributor Role', color: '#00aaff' }
};

document.addEventListener('DOMContentLoaded', () => {
    initLeaderboard();
});

async function initLeaderboard() {
    try {
        const pulls = await fetchAllPulls();
        const scores = calculateScores(pulls);
        const topContributors = getTopContributors(scores);
        updateLeaderboardUI(topContributors);
    } catch (error) {
        console.error("Leaderboard Sync Failed:", error);
    }
}

// Fetch recent PR history (limit 3 pages for performance)
async function fetchAllPulls() {
    let pulls = [];
    let page = 1;
    while (page <= 3) {
        try {
            const res = await fetch(`${API_BASE}/pulls?state=all&per_page=100&page=${page}`);
            if (!res.ok) break;
            const data = await res.json();
            if (!data.length) break;
            pulls = pulls.concat(data);
            page++;
        } catch (e) { break; }
    }
    return pulls;
}

function calculateScores(pulls) {
    const statsMap = {};

    pulls.forEach(pr => {
        if (!pr.merged_at) return;

        const user = pr.user.login;
        if (user.toLowerCase() === REPO_OWNER.toLowerCase()) return; // Exclude Admin

        if (!statsMap[user]) statsMap[user] = 0;

        let prPoints = 0;
        let hasLevel = false;

        pr.labels.forEach(label => {
            const name = label.name.toLowerCase();
            if (name.includes('level 3')) { prPoints += POINTS.L3; hasLevel = true; }
            else if (name.includes('level 2')) { prPoints += POINTS.L2; hasLevel = true; }
            else if (name.includes('level 1')) { prPoints += POINTS.L1; hasLevel = true; }
        });

        if (!hasLevel) prPoints += POINTS.DEFAULT;
        statsMap[user] += prPoints;
    });

    return statsMap;
}

function getTopContributors(statsMap) {
    return Object.entries(statsMap)
        .map(([login, points]) => ({ login, xp: points * XP_MULTIPLIER }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 3);
}

function getLeagueInfo(xp) {
    if (xp >= LEAGUES.GOLD.threshold) return LEAGUES.GOLD;
    if (xp >= LEAGUES.SILVER.threshold) return LEAGUES.SILVER;
    if (xp >= LEAGUES.BRONZE.threshold) return LEAGUES.BRONZE;
    return LEAGUES.ROOKIE;
}

function updateLeaderboardUI(top3) {
    const rows = [
        { selector: '.lb-row.gold', data: top3[0], rank: 1 },
        { selector: '.lb-row.silver', data: top3[1], rank: 2 },
        { selector: '.lb-row.bronze', data: top3[2], rank: 3 }
    ];

    rows.forEach(row => {
        const el = document.querySelector(row.selector);
        if (el) {
            // Clear existing placeholder content
            el.innerHTML = ''; 

            if (row.data) {
                const league = getLeagueInfo(row.data.xp);
                
                // Rank Badge
                const rankSpan = document.createElement('div');
                rankSpan.className = 'lb-rank';
                rankSpan.innerHTML = `<span>#${row.rank}</span>`;
                
                // User Info
                const userDiv = document.createElement('div');
                userDiv.className = 'lb-user';
                userDiv.innerHTML = `
                    <span class="lb-name">@${row.data.login}</span>
                    <span class="lb-perk" style="color:${league.color}; font-size: 0.75rem;">${league.perk}</span>
                `;

                // XP Info
                const xpDiv = document.createElement('div');
                xpDiv.className = 'lb-xp';
                xpDiv.innerHTML = `${row.data.xp.toLocaleString()} <span class="xp-label">XP</span>`;

                el.appendChild(rankSpan);
                el.appendChild(userDiv);
                el.appendChild(xpDiv);
                
                // Add league specific class for styling
                el.style.borderLeftColor = league.color;
            } else {
                el.innerHTML = `<div class="lb-rank">#${row.rank}</div><div class="lb-user">---</div><div class="lb-xp">0 XP</div>`;
            }
        }
    });
}