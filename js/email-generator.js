// Email Generator module - generates witty weekly emails using Gemini AI

import { fetchAllData } from './data/data-fetcher.js';
import { processData, analyzePickDistribution } from './data/data-processor.js';
import { createGameKey } from './utils/parsers.js';

// Gemini API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
const API_KEY_STORAGE_KEY = 'gemini_api_key';

// Default prompt template
const DEFAULT_PROMPT = `You are writing a weekly email to participants in a curling pick'em league. Write a witty, clever, and slightly absurd email that:

1. Highlights the most interesting recent results (upsets, blowouts, close games)
2. Makes fun of the leaders and losers in a good-natured way
3. Previews the upcoming matchups with dramatic flair
4. Uses curling terminology and puns where appropriate
5. Keeps a light, entertaining tone - this is for fun!

The email should be 3-5 short paragraphs. Be creative and entertaining. Feel free to create amusing narratives or exaggerate for comedic effect.`;

// State
let gameData = null;
let leaderboardData = null;

// Initialize the application
async function init() {
    loadApiKey();
    setupEventListeners();
    await loadGameData();
}

// Load API key from localStorage
function loadApiKey() {
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
    }

    // Load default prompt
    document.getElementById('promptTemplate').value = DEFAULT_PROMPT;
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
    document.getElementById('clearApiKey').addEventListener('click', clearApiKey);
    document.getElementById('generateEmail').addEventListener('click', generateEmail);
    document.getElementById('regenerateEmail').addEventListener('click', generateEmail);
    document.getElementById('copyEmail').addEventListener('click', copyEmailToClipboard);
}

// Save API key to localStorage
function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        showStatus('Please enter an API key', 'error');
        return;
    }

    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    showStatus('API key saved successfully', 'success');
}

// Clear API key from localStorage
function clearApiKey() {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    document.getElementById('apiKey').value = '';
    showStatus('API key cleared', 'success');
}

// Load and process game data
async function loadGameData() {
    try {
        showStatus('Loading game data...', 'info');

        const data = await fetchAllData();

        // Process matchups into a map
        const matchupsMap = {};
        const allGames = [];

        data.matchups.forEach((row, index) => {
            const gameKey = createGameKey(row.Week, row.Date, row.Time, row.Sheet);

            // Construct team names, handling undefined/empty numbers
            const team1Name = row.Team1_Number && row.Team1_Number.trim()
                ? `${row.Team1_Number} ${row.Team1_Skip}`
                : row.Team1_Skip;
            const team2Name = row.Team2_Number && row.Team2_Number.trim()
                ? `${row.Team2_Number} ${row.Team2_Skip}`
                : row.Team2_Skip;

            const game = {
                gameNumber: index + 1,
                week: row.Week,
                date: row.Date,
                phase: row.Phase || '',
                time: row.Time,
                sheet: row.Sheet,
                team1: team1Name,
                team2: team2Name,
                team1Skip: row.Team1_Skip,
                team2Skip: row.Team2_Skip,
                winner: row.Winner || null,
                isKeyMatchup: row.Key_Matchup === 'TRUE'
            };
            matchupsMap[gameKey] = game;
            allGames.push(game);
        });

        // Analyze pick distribution
        const pickAnalysis = analyzePickDistribution(data.picks, matchupsMap);

        // Process leaderboard data
        const leaderboard = processData(data.picks, matchupsMap, allGames, pickAnalysis);

        gameData = {
            allGames,
            matchupsMap,
            pickAnalysis,
            playerInfo: data.playerInfo
        };
        leaderboardData = leaderboard;

        displayDataPreview();
        showStatus('Data loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showStatus('Error loading data: ' + error.message, 'error');
    }
}

// Display a preview of the data that will be sent to AI
function displayDataPreview() {
    const previewDiv = document.getElementById('dataPreview');

    if (!gameData || !leaderboardData) {
        previewDiv.innerHTML = '<div class="error">No data available</div>';
        return;
    }

    const summary = generateDataSummary();

    previewDiv.innerHTML = `
        <div class="data-summary">
            <div class="summary-section">
                <h3>📊 Full Standings (${summary.allPlayers.length} Players)</h3>
                <ol>
                    ${summary.allPlayers.map(p => `
                        <li>
                            <strong>${p.name}</strong> (${p.position || 'Unknown'}${p.isFunkEngEligible ? ' - Funk-Eng Eligible' : ''}):
                            ${p.wins}-${p.losses} (${p.winPct}%)
                        </li>
                    `).join('')}
                </ol>
            </div>

            <div class="summary-section">
                <h3>🎯 Week ${summary.mostRecentWeek} Results (${summary.recentWeekGames.length} game${summary.recentWeekGames.length !== 1 ? 's' : ''})</h3>
                ${summary.recentWeekGames.length > 0 ? `
                    <ul>
                        ${summary.recentWeekGames.map(g => `
                            <li>
                                <strong>${g.winner}</strong> beat ${g.loser}
                                ${g.isUpset ? ' <span class="upset-tag">UPSET!</span>' : ''}
                            </li>
                        `).join('')}
                    </ul>
                ` : '<p>No results yet for this week</p>'}
            </div>

            <div class="summary-section">
                <h3>📅 Week ${summary.nextUpcomingWeek} Matchups (${summary.upcomingWeekGames.length} game${summary.upcomingWeekGames.length !== 1 ? 's' : ''})</h3>
                ${summary.upcomingWeekGames.length > 0 ? `
                    <ul>
                        ${summary.upcomingWeekGames.map(g => `
                            <li>${g.team1Skip} vs ${g.team2Skip} - ${g.date} ${g.time}</li>
                        `).join('')}
                    </ul>
                ` : '<p>No upcoming games scheduled</p>'}
            </div>

            ${summary.funFacts.length > 0 ? `
                <div class="summary-section">
                    <h3>🎉 Fun Facts</h3>
                    <ul>
                        ${summary.funFacts.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
}

// Generate a structured data summary for the AI
function generateDataSummary() {
    const completedGames = gameData.allGames.filter(g => g.winner);
    const upcomingGames = gameData.allGames.filter(g => !g.winner);

    // Get the most recent week number with completed games
    const mostRecentWeek = completedGames.length > 0
        ? Math.max(...completedGames.map(g => parseInt(g.week)))
        : 0;

    // Get the next upcoming week number
    const nextUpcomingWeek = upcomingGames.length > 0
        ? Math.min(...upcomingGames.map(g => parseInt(g.week)))
        : 0;

    // Get all players with Funk-Eng eligibility
    const allPlayers = leaderboardData.map(p => {
        // Find player info from the data
        const playerInfo = gameData.playerInfo?.find(pi => pi.Name === p.name) || {};
        const position = playerInfo.Position || '';
        const isFunkEngEligible = position === 'Lead' || position === 'Second';

        return {
            name: p.name,
            wins: p.wins,
            losses: p.losses,
            winPct: p.winPct.toFixed(1),
            rank: p.rank,
            team: playerInfo.Team || '',
            position: position,
            isFunkEngEligible: isFunkEngEligible
        };
    });

    // Get games from most recent completed week
    const recentWeekGames = completedGames
        .filter(g => parseInt(g.week) === mostRecentWeek)
        .map(g => {
            const loserSkip = g.winner === g.team1 ? g.team2Skip : g.team1Skip;
            const pickInfo = gameData.pickAnalysis[createGameKey(g.week, g.date, g.time, g.sheet)];
            const isUpset = pickInfo && pickInfo.chalkPick && g.winner !== pickInfo.chalkPick;

            return {
                winner: g.winner,
                loser: g.winner === g.team1 ? g.team2 : g.team1,
                winnerSkip: g.winner,
                loserSkip: loserSkip,
                date: g.date,
                week: g.week,
                isUpset: isUpset,
                chalkPercentage: pickInfo ? pickInfo.chalkPercentage : null
            };
        });

    // Get games from next upcoming week
    const nextWeekGames = upcomingGames
        .filter(g => parseInt(g.week) === nextUpcomingWeek)
        .map(g => ({
            team1: g.team1,
            team2: g.team2,
            team1Skip: g.team1Skip,
            team2Skip: g.team2Skip,
            date: g.date,
            time: g.time,
            week: g.week
        }));

    // Generate fun facts
    const funFacts = [];

    // Find longest winning streak
    const streakPlayers = leaderboardData.filter(p =>
        p.recentForm.length >= 3 &&
        p.recentForm.slice(-3).every(g => g.result === 'W')
    );
    if (streakPlayers.length > 0) {
        const bestStreak = streakPlayers[0];
        const streakLength = [...bestStreak.recentForm].reverse().findIndex(g => g.result !== 'W');
        const actualStreak = streakLength === -1 ? bestStreak.recentForm.length : streakLength;
        funFacts.push(`${bestStreak.name} is on a ${actualStreak}-game winning streak!`);
    }

    // Find biggest contrarian
    const contrarians = leaderboardData.filter(p => p.contrarianPct > 0)
        .sort((a, b) => b.contrarianPct - a.contrarianPct);
    if (contrarians.length > 0) {
        const topContrarian = contrarians[0];
        funFacts.push(`${topContrarian.name} goes against the grain ${topContrarian.contrarianPct.toFixed(0)}% of the time`);
    }

    // Find most recent upset from recent week
    const recentUpset = recentWeekGames.find(g => g.isUpset);
    if (recentUpset) {
        funFacts.push(`Week ${mostRecentWeek} upset: ${recentUpset.winner} beat ${recentUpset.loser} (only ${100 - recentUpset.chalkPercentage}% picked them)`);
    }

    return {
        allPlayers,
        mostRecentWeek,
        nextUpcomingWeek,
        recentWeekGames,
        upcomingWeekGames: nextWeekGames,
        funFacts,
        totalGamesPlayed: completedGames.length,
        totalPlayers: leaderboardData.length
    };
}

// Generate email using Gemini API
async function generateEmail() {
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (!apiKey) {
        showStatus('Please enter and save your Gemini API key first', 'error');
        return;
    }

    if (!gameData || !leaderboardData) {
        showStatus('Please wait for game data to load', 'error');
        return;
    }

    try {
        showLoading();

        const summary = generateDataSummary();
        const customPrompt = document.getElementById('promptTemplate').value;

        // Build the full prompt with data
        const fullPrompt = `${customPrompt}

Here's the current data:

**FULL STANDINGS (All ${summary.allPlayers.length} Players):**
Goblet (Overall) Standings:
${summary.allPlayers.map((p, i) => `${p.rank}. ${p.name} (${p.team}, ${p.position}): ${p.wins}-${p.losses} (${p.winPct}%)`).join('\n')}

Funk-Eng Cup Eligible Players (Leads & Seconds only):
${summary.allPlayers.filter(p => p.isFunkEngEligible).map((p, i) => `${p.rank}. ${p.name} (${p.team}, ${p.position}): ${p.wins}-${p.losses} (${p.winPct}%)`).join('\n')}

**WEEK ${summary.mostRecentWeek} RESULTS (${summary.recentWeekGames.length} game${summary.recentWeekGames.length !== 1 ? 's' : ''}):**
${summary.recentWeekGames.length > 0 ? summary.recentWeekGames.map(g => `- ${g.winner} defeated ${g.loser}${g.isUpset ? ' (UPSET - only ' + (100 - g.chalkPercentage) + '% picked them!)' : ''}`).join('\n') : 'No games completed this week yet'}

**WEEK ${summary.nextUpcomingWeek} MATCHUPS (${summary.upcomingWeekGames.length} game${summary.upcomingWeekGames.length !== 1 ? 's' : ''}):**
${summary.upcomingWeekGames.length > 0 ? summary.upcomingWeekGames.map(g => `- ${g.team1Skip} vs ${g.team2Skip} (${g.date} ${g.time})`).join('\n') : 'No upcoming games scheduled'}

**FUN FACTS:**
${summary.funFacts.map(f => `- ${f}`).join('\n')}

Now write an engaging, witty email based on this data. Format it as HTML suitable for pasting into Gmail. Use basic HTML tags like <p>, <strong>, <em>, <h2>, <ul>, <li>, etc. Make it fun and entertaining!`;

        // Call Gemini API
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: fullPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 1.0,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }

        const result = await response.json();

        // Extract the generated text
        const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            throw new Error('No text generated from API');
        }

        // Display the generated email
        displayGeneratedEmail(generatedText);
        hideLoading();
        showStatus('Email generated successfully!', 'success');

    } catch (error) {
        console.error('Error generating email:', error);
        hideLoading();
        showStatus('Error generating email: ' + error.message, 'error');
    }
}

// Display the generated email in the preview section
function displayGeneratedEmail(htmlContent) {
    const previewSection = document.getElementById('previewSection');
    const emailPreview = document.getElementById('emailPreview');

    // Store the HTML for copying
    emailPreview.dataset.htmlContent = htmlContent;

    // Display the formatted email
    emailPreview.innerHTML = htmlContent;

    // Show the preview section
    previewSection.style.display = 'block';

    // Scroll to preview
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Copy email HTML to clipboard
async function copyEmailToClipboard() {
    const emailPreview = document.getElementById('emailPreview');
    const htmlContent = emailPreview.dataset.htmlContent;

    if (!htmlContent) {
        showStatus('No email to copy', 'error');
        return;
    }

    try {
        // Copy HTML to clipboard
        await navigator.clipboard.writeText(htmlContent);
        showStatus('Email HTML copied to clipboard!', 'success');

        // Visual feedback
        const copyButton = document.getElementById('copyEmail');
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyButton.classList.add('success');

        setTimeout(() => {
            copyButton.innerHTML = originalText;
            copyButton.classList.remove('success');
        }, 2000);

    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showStatus('Error copying to clipboard: ' + error.message, 'error');
    }
}

// Show status message
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Show loading overlay
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none';
}

// Start the application
init();
