// Email Generator module - generates witty weekly emails using Gemini AI

import { fetchAllData } from './data/data-fetcher.js';
import { processData, analyzePickDistribution } from './data/data-processor.js';
import { createGameKey } from './utils/parsers.js';

// Gemini API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
const API_KEY_STORAGE_KEY = 'gemini_api_key';

// Default prompt template
const DEFAULT_PROMPT = `You are writing a weekly email to participants in "The Game of the Week" (GOTW). GOTW is the pick 'em game of the Madison Curling Club's Wednesday night shift of the Mansfield men's league. The GOTW winner gets possession of the "Goblet" for the following season. Write a witty, clever, and slightly absurd email that:

1. Highlights the most interesting recent results (upsets, interesting tie-ins, streaks, etc.)
2. Makes fun of the leaders and losers in a good-natured way
3. Previews the upcoming matchups with dramatic flair
4. Uses curling terminology and puns where appropriate
5. Keeps a light, entertaining tone - this is for fun!

Note: The teams players have picked are named after the curling team's skip. Some of those skips are also participants in the Game of the Week. All picks are submitted and locked in at the start of the season, there is no changing picks week to week.
The email should be 3-5 short paragraphs. Be creative and entertaining. Feel free to create amusing narratives or exaggerate for comedic effect.

IMPORTANT: Start directly with the email content. Do NOT include:
- Subject lines
- Greeting lines like "Hi team" or "Hello everyone"
- Signature lines or sign-offs at the end
Just write the body content that will go in the middle of an email.`;

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
                isKeyMatchup: row.Key_Matchup === 'TRUE',
                notes: row.Notes || ''
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
            playerInfo: data.playerInfo,
            weeklyNarratives: data.weeklyNarratives
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
                <p style="font-size: 0.9em; color: #666; margin-bottom: 1rem;">
                    <strong>Win%</strong> = games won | <strong>Contrarian%</strong> = to-date % of picks against majority (completed games only)
                </p>
                <ol>
                    ${summary.allPlayers.map(p => {
                        const rankChangeSymbol = p.rankChange > 0 ? `↑${p.rankChange}` : p.rankChange < 0 ? `↓${Math.abs(p.rankChange)}` : '−';
                        return `
                            <li>
                                <strong>${p.name}</strong> (${p.position || 'Unknown'}${p.isFunkEngEligible ? ' - Funk-Eng Eligible' : ''}):<br>
                                ${p.wins}-${p.losses} (Win: ${p.winPct}%, Contrarian: ${p.contrarianPct}%) | Form: ${p.allForm || 'N/A'} | Movement: ${rankChangeSymbol}
                            </li>
                        `;
                    }).join('')}
                </ol>
            </div>

            <div class="summary-section">
                <h3>🎯 Most Recent Results${summary.mostRecentGameDate ? ` - ${summary.mostRecentGameDate}` : ''} (${summary.recentWeekGames.length} game${summary.recentWeekGames.length !== 1 ? 's' : ''})</h3>
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
                <h3>📅 Next Matchups${summary.nextUpcomingGameDate ? ` - ${summary.nextUpcomingGameDate}` : ''} (${summary.upcomingWeekGames.length} game${summary.upcomingWeekGames.length !== 1 ? 's' : ''})</h3>
                ${summary.upcomingWeekGames.length > 0 ? `
                    <ul>
                        ${summary.upcomingWeekGames.map(g => {
                            const notesText = g.notes && g.notes.trim() ? ` <em>(Note: ${g.notes})</em>` : '';
                            return `<li>${g.team1Skip} vs ${g.team2Skip} - Sheet ${g.sheet}, ${g.date} ${g.time}${notesText}</li>`;
                        }).join('')}
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

// Calculate what the standings were before the most recent week
function calculatePreviousWeekStandings(mostRecentWeek) {
    const previousStandings = new Map();

    if (mostRecentWeek === 0) {
        // No games completed yet
        return previousStandings;
    }

    // Count wins/losses for each player excluding most recent week
    const playerStats = new Map();

    leaderboardData.forEach(player => {
        // Filter out games from the most recent week
        const gamesBeforeLastWeek = player.allResults.filter(result => {
            return parseInt(result.matchup.week) < mostRecentWeek;
        });

        const wins = gamesBeforeLastWeek.filter(g => g.result === 'W').length;
        const losses = gamesBeforeLastWeek.filter(g => g.result === 'L').length;
        const totalGames = wins + losses;
        const winPct = totalGames > 0 ? (wins / totalGames) * 100 : 0;

        playerStats.set(player.name, { name: player.name, wins, losses, winPct });
    });

    // Convert to array and sort
    const sortedPlayers = Array.from(playerStats.values()).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winPct - a.winPct;
    });

    // Assign ranks
    let currentRank = 1;
    sortedPlayers.forEach((player, index) => {
        if (index > 0) {
            const prevPlayer = sortedPlayers[index - 1];
            if (player.wins === prevPlayer.wins && player.winPct === prevPlayer.winPct) {
                previousStandings.set(player.name, previousStandings.get(prevPlayer.name));
            } else {
                currentRank = index + 1;
                previousStandings.set(player.name, currentRank);
            }
        } else {
            previousStandings.set(player.name, 1);
        }
    });

    return previousStandings;
}

// Generate a structured data summary for the AI
function generateDataSummary() {
    const completedGames = gameData.allGames.filter(g => g.winner);
    const upcomingGames = gameData.allGames.filter(g => !g.winner);

    // Helper function to parse game date
    const parseGameDate = (dateStr) => {
        // Date format is M/D/YYYY (e.g., "11/12/2025")
        const [month, day, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    };

    const now = new Date();

    // Find the most recent completed game(s) by date
    let mostRecentWeek = 0;

    if (completedGames.length > 0) {
        // Sort completed games by date (most recent first)
        const sortedCompleted = [...completedGames].sort((a, b) => {
            const dateA = parseGameDate(a.date);
            const dateB = parseGameDate(b.date);
            return dateB - dateA;
        });

        // Get the most recent week
        mostRecentWeek = parseInt(sortedCompleted[0].week);

        // Include all games from the same date as the most recent game
        // (handles multiple games on the same day)
        const mostRecentDateStr = sortedCompleted[0].date;
        const gamesOnMostRecentDate = completedGames.filter(g => g.date === mostRecentDateStr);

        // If there are multiple weeks on the same date, use the highest week number
        if (gamesOnMostRecentDate.length > 0) {
            mostRecentWeek = Math.max(...gamesOnMostRecentDate.map(g => parseInt(g.week)));
        }
    }

    // Find the next upcoming game(s) by date (excluding postponed/past games)
    let nextUpcomingWeek = 0;

    if (upcomingGames.length > 0) {
        // Get the most recent completed game date as a threshold
        let cutoffDate = new Date(0); // Start of epoch if no completed games
        if (completedGames.length > 0) {
            const mostRecentCompletedDateStr = [...completedGames]
                .sort((a, b) => parseGameDate(b.date) - parseGameDate(a.date))[0].date;
            cutoffDate = parseGameDate(mostRecentCompletedDateStr);
        }

        // Filter to only truly future games
        const futureGames = upcomingGames.filter(g => parseGameDate(g.date) > cutoffDate);

        if (futureGames.length > 0) {
            // Sort future games by date (soonest first)
            const sortedUpcoming = [...futureGames].sort((a, b) => {
                const dateA = parseGameDate(a.date);
                const dateB = parseGameDate(b.date);
                return dateA - dateB;
            });

            // Get the next upcoming game date
            const nextUpcomingDateStr = sortedUpcoming[0].date;
            const gamesOnNextDate = futureGames.filter(g => g.date === nextUpcomingDateStr);

            // If there are multiple weeks on the same date, use the lowest week number
            if (gamesOnNextDate.length > 0) {
                nextUpcomingWeek = Math.min(...gamesOnNextDate.map(g => parseInt(g.week)));
            }
        }
    }

    // Calculate previous week's standings (without most recent week's games)
    const previousWeekStandings = calculatePreviousWeekStandings(mostRecentWeek);

    // Get all players with Funk-Eng eligibility
    const allPlayers = leaderboardData.map(p => {
        // Find player info from the data
        const playerInfo = gameData.playerInfo?.find(pi => pi.Name === p.name) || {};
        const position = playerInfo.Position || '';
        const isFunkEngEligible = position === 'Lead' || position === 'Second';

        // Get all game results (W/L only, chronological order)
        const allForm = p.allResults.map(g => g.result).join('');

        // Calculate rank movement
        const previousRank = previousWeekStandings.get(p.name) || p.rank;
        const rankChange = previousRank - p.rank; // Positive = moved up

        return {
            name: p.name,
            wins: p.wins,
            losses: p.losses,
            winPct: p.winPct.toFixed(1),
            rank: p.rank,
            team: playerInfo.Team || '',
            position: position,
            isFunkEngEligible: isFunkEngEligible,
            allForm: allForm,
            rankChange: rankChange,
            contrarianPct: p.contrarianPct.toFixed(0)
        };
    });

    // Get games from most recent completed date (all games on that date)
    let recentWeekGames = [];
    if (completedGames.length > 0) {
        // Find the most recent date
        const mostRecentDateStr = [...completedGames]
            .sort((a, b) => parseGameDate(b.date) - parseGameDate(a.date))[0].date;

        recentWeekGames = completedGames
            .filter(g => g.date === mostRecentDateStr)
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
    }

    // Get games from next upcoming date (all games on that date)
    // Filter out postponed/past games by only including games after the most recent completed game
    let nextWeekGames = [];
    if (upcomingGames.length > 0) {
        // Get the most recent completed game date as a threshold
        let cutoffDate = new Date(0); // Start of epoch if no completed games
        if (recentWeekGames.length > 0) {
            cutoffDate = parseGameDate(recentWeekGames[0].date);
        }

        // Filter to only truly upcoming games (after the most recent completed game)
        const futureGames = upcomingGames.filter(g => parseGameDate(g.date) > cutoffDate);

        if (futureGames.length > 0) {
            // Find the next upcoming date from future games
            const nextUpcomingDateStr = [...futureGames]
                .sort((a, b) => parseGameDate(a.date) - parseGameDate(b.date))[0].date;

            nextWeekGames = futureGames
                .filter(g => g.date === nextUpcomingDateStr)
                .map(g => ({
                    team1: g.team1,
                    team2: g.team2,
                    team1Skip: g.team1Skip,
                    team2Skip: g.team2Skip,
                    date: g.date,
                    time: g.time,
                    week: g.week,
                    sheet: g.sheet,
                    notes: g.notes
                }));
        }
    }

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

    // Get the actual dates for display
    const mostRecentGameDate = recentWeekGames.length > 0 ? recentWeekGames[0].date : '';
    const nextUpcomingGameDate = nextWeekGames.length > 0 ? nextWeekGames[0].date : '';

    return {
        allPlayers,
        mostRecentWeek,
        nextUpcomingWeek,
        mostRecentGameDate,
        nextUpcomingGameDate,
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

        // Get previous weeks' narratives for context
        const previousNarratives = gameData.weeklyNarratives
            .filter(n => n.Narrative && n.Narrative.trim() && parseInt(n.Week) < summary.nextUpcomingWeek)
            .sort((a, b) => parseInt(a.Week) - parseInt(b.Week));

        // Format previous narratives for context
        const narrativesContext = previousNarratives.length > 0
            ? `**PREVIOUS WEEKS' NARRATIVES (for continuity and callbacks):**

${previousNarratives.map(n => `Week ${n.Week} (${n.Date}):
${n.Narrative}`).join('\n\n')}

`
            : '';

        // Build the full prompt with data
        let fullPrompt = `${customPrompt}

${narrativesContext}Here's the current data:

**LEGEND:**
- Win %: Percentage of games WON (e.g., 66.7% means they won 2 out of 3 games)
- Contrarian %: To-date percentage of picks AGAINST the majority, calculated only from completed games. Although all picks were locked in at the start of the season for the entire schedule, this percentage only reflects games played so far (e.g., 25% means in 1 out of every 4 completed games, they picked the team that fewer people picked). A player who consistently picked underdogs will have a higher contrarian %.
- Form: ALL game results chronologically (W = Win, L = Loss, most recent on right). Use this to identify streaks and trends!
- Movement: Rank change from last week (↑ = moved up, ↓ = moved down, − = no change)

**IMPORTANT - TEAM vs PICKS:**
Each player below shows their name followed by (Team, Position). The "Team" is the actual curling team they PLAY FOR in real life. This is separate from their picks - players predict which teams will win each game, and those picks can be ANY team, not just their own team. For example, "Pete Young (Ken Niedhart, Lead)" means Pete Young plays for Ken Niedhart's team, but Pete's picks for who will win games could include Jim Niedhart, Ken Niedhart, or any other team. Do NOT say a player "picks for" or "plays for" a team they selected to win - they are just predicting winners.

**FULL STANDINGS (All ${summary.allPlayers.length} Players):**
Goblet (Overall) Standings:
${summary.allPlayers.map((p, i) => {
    const rankChangeStr = p.rankChange > 0 ? ` (↑${p.rankChange})` : p.rankChange < 0 ? ` (↓${Math.abs(p.rankChange)})` : ' (−)';
    const formStr = p.allForm ? ` [Form: ${p.allForm}]` : '';
    return `${p.rank}. ${p.name} (${p.team}, ${p.position}): ${p.wins}-${p.losses} (Win%: ${p.winPct}%, Contrarian: ${p.contrarianPct}%)${rankChangeStr}${formStr}`;
}).join('\n')}

Funk-Eng Cup Eligible Players (Leads & Seconds only):
${summary.allPlayers.filter(p => p.isFunkEngEligible).map((p, i) => {
    const rankChangeStr = p.rankChange > 0 ? ` (↑${p.rankChange})` : p.rankChange < 0 ? ` (↓${Math.abs(p.rankChange)})` : ' (−)';
    const formStr = p.allForm ? ` [Form: ${p.allForm}]` : '';
    return `${p.rank}. ${p.name} (${p.team}, ${p.position}): ${p.wins}-${p.losses} (Win%: ${p.winPct}%, Contrarian: ${p.contrarianPct}%)${rankChangeStr}${formStr}`;
}).join('\n')}

**MOST RECENT RESULTS${summary.mostRecentGameDate ? ` (${summary.mostRecentGameDate})` : ''} - ${summary.recentWeekGames.length} game${summary.recentWeekGames.length !== 1 ? 's' : ''}:**
${summary.recentWeekGames.length > 0 ? summary.recentWeekGames.map(g => `- ${g.winner} defeated ${g.loser}${g.isUpset ? ' (UPSET - only ' + (100 - g.chalkPercentage) + '% picked them!)' : ''}`).join('\n') : 'No games completed recently'}

**NEXT MATCHUPS${summary.nextUpcomingGameDate ? ` (${summary.nextUpcomingGameDate})` : ''} - ${summary.upcomingWeekGames.length} game${summary.upcomingWeekGames.length !== 1 ? 's' : ''}:**
${summary.upcomingWeekGames.length > 0 ? summary.upcomingWeekGames.map(g => {
    const notesText = g.notes && g.notes.trim() ? ` [Note: ${g.notes}]` : '';
    return `- ${g.team1Skip} vs ${g.team2Skip} (Sheet ${g.sheet}, ${g.date} ${g.time})${notesText}`;
}).join('\n') : 'No upcoming games scheduled'}

**FUN FACTS:**
${summary.funFacts.map(f => `- ${f}`).join('\n')}

Now write an engaging, witty email based on this data. Format it as HTML suitable for pasting into Gmail. Use basic HTML tags like <p>, <strong>, <em>, <h2>, <ul>, <li>, etc. Make it fun and entertaining!

CRITICAL FORMATTING INSTRUCTIONS:
1. Start with a brief, catchy subject line (5-10 words) on the FIRST line, formatted as: <!-- SUBJECT: Your Subject Here -->
2. (optional) bonus points if the subject is a slightly obscure, but not too obscure, popular movie/tv line, or popular music lyric, if so put it in quotes with a trailing elipsis: <!--- SUBJECT: “Like a dog without a bone, An actor out on loan”… -->
2. After the subject line, write the email body content (do NOT include greeting or signature)
3. The subject line comment will be extracted and used as a section header
4. Example format:
   <!-- SUBJECT: Ice Cold Takes and Hot Streaks -->
   <p>Your email content starts here...</p>

The email will have standings and matchups appended automatically.`;

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
                    maxOutputTokens: 8192,
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
        const finishReason = result.candidates?.[0]?.finishReason;

        if (!generatedText) {
            throw new Error('No text generated from API');
        }

        // Check if response was truncated
        if (finishReason === 'MAX_TOKENS') {
            console.warn('Response was truncated due to token limit');
            hideLoading();
            showStatus('Email generated but may be incomplete. Try regenerating.', 'error');
            displayGeneratedEmail(generatedText + '\n\n<p><em>[Response was cut off - click Regenerate for a new attempt]</em></p>');
            return;
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

// Format the recent week's matchups with results
function formatRecentMatchups() {
    const summary = generateDataSummary();

    if (summary.recentWeekGames.length === 0) {
        return '';
    }

    return `
        <div style="margin-bottom: 2rem;">
            <h3 style="color: #34495e; margin-bottom: 1rem;">Most Recent Result${summary.recentWeekGames.length !== 1 ? 's' : ''}${summary.mostRecentGameDate ? ` (${summary.mostRecentGameDate})` : ''}</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                ${summary.recentWeekGames.map(game => {
                    // Determine winner and loser
                    const team1IsWinner = game.winner === game.winner; // winner field contains the winning team name
                    const team2IsWinner = !team1IsWinner;

                    // Extract skip names from winner/loser
                    const winnerSkip = game.winnerSkip;
                    const loserSkip = game.loserSkip;

                    // Check if it was an upset
                    const upsetBadge = game.isUpset ? '<span style="background: #ff9800; color: white; font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-left: 4px;">UPSET</span>' : '';

                    return `
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e8e8e8 100%); border-radius: 8px; padding: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #4CAF50;">
                        <div style="text-align: center; font-size: 12px; margin-bottom: 0.75rem; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;">
                            Week ${game.week} • ${game.date}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;">
                            <div style="flex: 1; text-align: left;">
                                <div style="font-size: 16px; font-weight: bold; margin-bottom: 0.25rem; color: #2c3e50;">
                                    ${game.winner}
                                    <span style="background: #4CAF50; color: white; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-left: 4px;">W</span>
                                    ${upsetBadge}
                                </div>
                            </div>
                            <div style="text-align: center; padding: 0 0.5rem;">
                                <div style="font-size: 14px; font-weight: bold; color: #999;">VS</div>
                            </div>
                            <div style="flex: 1; text-align: right;">
                                <div style="font-size: 16px; font-weight: bold; margin-bottom: 0.25rem; color: #999;">
                                    ${game.loser}
                                    <span style="background: #e74c3c; color: white; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-left: 4px;">L</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                }).join('')}
            </div>
        </div>
    `;
}

// Format the upcoming matchups
function formatUpcomingMatchups() {
    const summary = generateDataSummary();

    if (summary.upcomingWeekGames.length === 0) {
        return '';
    }

    return `
        <div style="margin-bottom: 2rem;">
            <h3 style="color: #34495e; margin-bottom: 1rem;">Next Matchup${summary.upcomingWeekGames.length !== 1 ? 's' : ''}${summary.nextUpcomingGameDate ? ` (${summary.nextUpcomingGameDate})` : ''}</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                ${summary.upcomingWeekGames.map(game => {
                    // Only show full team name if it's different from skip name
                    const team1Detail = game.team1 !== game.team1Skip ? game.team1 : '';
                    const team2Detail = game.team2 !== game.team2Skip ? game.team2 : '';

                    return `
                    <div style="background: linear-gradient(135deg, #303E45 0%, #485962 100%); border-radius: 8px; padding: 1rem; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="text-align: center; font-size: 12px; margin-bottom: 0.75rem; opacity: 0.9; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 0.5rem;">
                            ${game.date} • ${game.time} • Sheet ${game.sheet}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;">
                            <div style="flex: 1; text-align: left;">
                                <div style="font-size: 16px; font-weight: bold; margin-bottom: 0.25rem;">${game.team1Skip}</div>
                                ${team1Detail ? `<div style="font-size: 11px; opacity: 0.8;">${team1Detail}</div>` : ''}
                            </div>
                            <div style="text-align: center; padding: 0 0.5rem;">
                                <div style="font-size: 18px; font-weight: bold; color: #C4B99B;">VS</div>
                            </div>
                            <div style="flex: 1; text-align: right;">
                                <div style="font-size: 16px; font-weight: bold; margin-bottom: 0.25rem;">${game.team2Skip}</div>
                                ${team2Detail ? `<div style="font-size: 11px; opacity: 0.8;">${team2Detail}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                }).join('')}
            </div>
        </div>
        

        <p style="text-align: center; margin-top: 2rem; font-size: 16px;">
            <strong><a href="https://pesayo.github.io/game-of-the-week/" style="color: #3498db; text-decoration: none;">View Full Dashboard</a> →</strong>
        </p>
    `;
}

// Format the current standings as an HTML table
function formatStandingsTable() {
    const summary = generateDataSummary();

    let tableHTML = `
        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid #e0e0e0;">
            <h2 style="color: #2c3e50; margin-bottom: 1rem;">Current Standings</h2>

            <h3 style="color: #34495e; margin-top: 1.5rem; margin-bottom: 0.5rem;">Goblet (Overall) Standings</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 14px;">
                <thead>
                    <tr style="background-color: #485962; color: white;">
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd; color: white;">Rank</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd; color: white;">Player</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd; color: white;">Team</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd; color: white;">Position</th>
                        <th style="padding: 10px; text-align: center; border: 1px solid #ddd; color: white;">Record</th>
                        <th style="padding: 10px; text-align: center; border: 1px solid #ddd; color: white;">Win %</th>
                        <th style="padding: 10px; text-align: center; border: 1px solid #ddd; color: white;">Movement</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.allPlayers.map((player, index) => {
                        const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
                        let movementIcon = '−';
                        let movementColor = '#95a5a6';

                        if (player.rankChange > 0) {
                            movementIcon = `↑ ${player.rankChange}`;
                            movementColor = '#4CAF50';
                        } else if (player.rankChange < 0) {
                            movementIcon = `↓ ${Math.abs(player.rankChange)}`;
                            movementColor = '#f44336';
                        }

                        return `
                            <tr style="background-color: ${bgColor};">
                                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${player.rank}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${player.name}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${player.team}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${player.position}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${player.wins}-${player.losses}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${player.winPct}%</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${movementColor}; font-weight: bold;">${movementIcon}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <h3 style="color: #34495e; margin-top: 1.5rem; margin-bottom: 0.5rem;">Funk-Eng Cup Standings (Leads & Seconds Only)</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 14px;">
                <thead>
                    <tr style="background-color: #50536A; color: white;">
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd; color: white;">Rank</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd; color: white;">Player</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd; color: white;">Team</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd; color: white;">Position</th>
                        <th style="padding: 10px; text-align: center; border: 1px solid #ddd; color: white;">Record</th>
                        <th style="padding: 10px; text-align: center; border: 1px solid #ddd; color: white;">Win %</th>
                        <th style="padding: 10px; text-align: center; border: 1px solid #ddd; color: white;">Movement</th>
                    </tr>
                </thead>
                <tbody>
                    ${(() => {
                        // Filter to eligible players and sort by wins/win%
                        const eligiblePlayers = summary.allPlayers.filter(p => p.isFunkEngEligible);

                        // Assign Funk-Eng specific ranks
                        let currentRank = 1;
                        eligiblePlayers.forEach((player, index) => {
                            if (index > 0) {
                                const prevPlayer = eligiblePlayers[index - 1];
                                if (player.wins === prevPlayer.wins && player.winPct === prevPlayer.winPct) {
                                    player.funkEngRank = prevPlayer.funkEngRank;
                                } else {
                                    currentRank = index + 1;
                                    player.funkEngRank = currentRank;
                                }
                            } else {
                                player.funkEngRank = 1;
                            }
                        });

                        return eligiblePlayers.map((player, index) => {
                            const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
                            let movementIcon = '−';
                            let movementColor = '#95a5a6';

                            if (player.rankChange > 0) {
                                movementIcon = `↑ ${player.rankChange}`;
                                movementColor = '#4CAF50';
                            } else if (player.rankChange < 0) {
                                movementIcon = `↓ ${Math.abs(player.rankChange)}`;
                                movementColor = '#f44336';
                            }

                            return `
                                <tr style="background-color: ${bgColor};">
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${player.funkEngRank}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${player.name}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${player.team}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${player.position}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${player.wins}-${player.losses}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${player.winPct}%</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${movementColor}; font-weight: bold;">${movementIcon}</td>
                                </tr>
                            `;
                        }).join('');
                    })()}
                </tbody>
            </table>

            <p style="text-align: center; margin-top: 2rem; font-size: 16px;">
                <strong><a href="https://pesayo.github.io/game-of-the-week/" style="color: #3498db; text-decoration: none;">View Full Dashboard</a> →</strong>
            </p>
        </div>
    `;

    return tableHTML;
}

// Display the generated email in the preview section
function displayGeneratedEmail(htmlContent) {
    const previewSection = document.getElementById('previewSection');
    const emailPreview = document.getElementById('emailPreview');

    // Extract subject line from HTML comment
    const subjectRegex = /<!--\s*SUBJECT:\s*(.+?)\s*-->/i;
    const subjectMatch = htmlContent.match(subjectRegex);

    let subjectLine = "This Week's Narrative"; // Default fallback
    let contentWithoutSubject = htmlContent;

    if (subjectMatch) {
        subjectLine = subjectMatch[1].trim();
        // Remove the subject comment from content
        contentWithoutSubject = htmlContent.replace(subjectRegex, '').trim();
    }

    // Build full email in order:
    // 1. Recent week's matchups (results)
    // 2. Upcoming matchups (with dashboard link)
    // 3. Narrative heading with horizontal rule (using extracted subject)
    // 4. AI-generated content (narrative) - wrapped in editable div
    // 5. Standings tables
    const recentMatchups = formatRecentMatchups();
    const upcomingMatchups = formatUpcomingMatchups();
    const narrativeHeading = `
        <hr style="border: none; border-top: 2px solid #e0e0e0; margin: 2rem 0;">
        <h2 style="color: #2c3e50; margin-bottom: 1rem;">${subjectLine}</h2>
    `;

    // Wrap narrative in an editable div with clear styling
    const editableNarrative = `
        <div class="editable-narrative" contenteditable="true" style="outline: none; padding: 1rem; border-radius: 4px; transition: background-color 0.2s;">
            ${contentWithoutSubject}
        </div>
        <div style="text-align: right; margin-top: 0.5rem; font-size: 12px; color: #666; font-style: italic;">
            <i class="fas fa-edit"></i> Click above to edit the narrative
        </div>
    `;

    const standingsTable = formatStandingsTable();

    const fullContent = recentMatchups + upcomingMatchups + narrativeHeading + editableNarrative + standingsTable;

    // Store the HTML for copying
    emailPreview.dataset.htmlContent = fullContent;

    // Display the formatted email
    emailPreview.innerHTML = fullContent;

    // Add hover effect to editable narrative
    setTimeout(() => {
        const editableDiv = emailPreview.querySelector('.editable-narrative');
        if (editableDiv) {
            editableDiv.addEventListener('mouseenter', () => {
                editableDiv.style.backgroundColor = '#f8f9fa';
            });
            editableDiv.addEventListener('mouseleave', () => {
                editableDiv.style.backgroundColor = 'transparent';
            });
            editableDiv.addEventListener('focus', () => {
                editableDiv.style.backgroundColor = '#fff3cd';
                editableDiv.style.border = '2px dashed #ffc107';
            });
            editableDiv.addEventListener('blur', () => {
                editableDiv.style.backgroundColor = 'transparent';
                editableDiv.style.border = 'none';
            });
        }
    }, 0);

    // Show the preview section
    previewSection.style.display = 'block';

    // Scroll to preview
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Copy email HTML to clipboard as rich text (for pasting into Gmail)
async function copyEmailToClipboard() {
    const emailPreview = document.getElementById('emailPreview');

    if (!emailPreview.innerHTML) {
        showStatus('No email to copy', 'error');
        return;
    }

    // Clone the preview and remove the edit hint
    const clone = emailPreview.cloneNode(true);
    const editHint = clone.querySelector('.editable-narrative + div');
    if (editHint) {
        editHint.remove();
    }

    // Get the edited content (captures any inline edits made by user)
    const editableDiv = clone.querySelector('.editable-narrative');
    if (editableDiv) {
        // Replace the editable div with its content (removes contenteditable attribute)
        const narrativeContent = editableDiv.innerHTML;
        editableDiv.outerHTML = narrativeContent;
    }

    const htmlContent = clone.innerHTML;

    try {
        // Create a blob with HTML content
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const plainTextBlob = new Blob([clone.innerText], { type: 'text/plain' });

        // Use the modern Clipboard API with multiple formats
        const clipboardItem = new ClipboardItem({
            'text/html': blob,
            'text/plain': plainTextBlob
        });

        await navigator.clipboard.write([clipboardItem]);
        showStatus('Email copied with your edits! You can now paste it directly into Gmail.', 'success');

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

        // Fallback: try to copy just the HTML source
        try {
            await navigator.clipboard.writeText(htmlContent);
            showStatus('Email HTML copied (paste into Gmail compose window in HTML mode)', 'success');

            const copyButton = document.getElementById('copyEmail');
            const originalText = copyButton.innerHTML;
            copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyButton.classList.add('success');

            setTimeout(() => {
                copyButton.innerHTML = originalText;
                copyButton.classList.remove('success');
            }, 2000);
        } catch (fallbackError) {
            showStatus('Error copying to clipboard: ' + error.message, 'error');
        }
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
