// Email Generator module - generates witty weekly emails using Gemini AI

import { fetchAllData } from './data/data-fetcher.js';
import { processData, analyzePickDistribution } from './data/data-processor.js';
import { createGameKey, parsePlayerInfo } from './utils/parsers.js';

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
6. DO NOT comment on general contrarianism - only mention specific bold picks if they're in the Fun Facts and had a real impact on standings

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

        // Debug: Log first row to see actual column names
        if (data.matchups.length > 0) {
            console.log('First matchup row columns:', Object.keys(data.matchups[0]));
            console.log('Sample row:', data.matchups[0]);
        }

        data.matchups.forEach((row, index) => {
            const gameKey = createGameKey(row.Week, row.Date, row.Time, row.Sheet);

            // Construct team names, handling undefined/empty numbers
            const team1Name = row.Team1_Number && row.Team1_Number.trim()
                ? `${row.Team1_Number} ${row.Team1_Skip}`
                : row.Team1_Skip;
            const team2Name = row.Team2_Number && row.Team2_Number.trim()
                ? `${row.Team2_Number} ${row.Team2_Skip}`
                : row.Team2_Skip;

            // Try multiple possible column name variations for notes
            const preGameNotes = row.Pre_Game_Notes || row['Pre-Game Notes'] || row.PreGameNotes || row['Pre Game Notes'] || '';
            const postGameNotes = row.Post_Game_Notes || row['Post-Game Notes'] || row.PostGameNotes || row['Post Game Notes'] || '';

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
                preGameNotes: preGameNotes,
                postGameNotes: postGameNotes
            };

            // Debug: Log notes for games with winner or upcoming
            if (postGameNotes && row.Winner) {
                console.log(`Game ${index + 1} has post-game notes:`, postGameNotes);
            }
            if (preGameNotes && !row.Winner) {
                console.log(`Game ${index + 1} has pre-game notes:`, preGameNotes);
            }

            matchupsMap[gameKey] = game;
            allGames.push(game);
        });

        // Parse player info CSV to create a clean map
        const { playerMap } = parsePlayerInfo(data.playerInfo);

        // Analyze pick distribution
        const pickAnalysis = analyzePickDistribution(data.picks, matchupsMap);

        // Process leaderboard data
        const leaderboard = processData(data.picks, matchupsMap, allGames, pickAnalysis);

        gameData = {
            allGames,
            matchupsMap,
            pickAnalysis,
            playerInfoMap: playerMap,
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

// Generate the full AI prompt context
function generateFullPrompt() {
    const summary = generateDataSummary();
    const customPrompt = document.getElementById('promptTemplate')?.value || DEFAULT_PROMPT;

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
- Form: ALL game results chronologically (W = Win, L = Loss, most recent on right). Use this to identify streaks and trends!
- Movement: Rank change from last week (↑ = moved up, ↓ = moved down, − = no change)

**IMPORTANT - TEAM vs PICKS:**
Each player below shows their name followed by (Team, Position). The "Team" is the actual curling team they PLAY FOR in real life. This is separate from their picks - players predict which teams will win each game, and those picks can be ANY team, not just their own team. For example, "Pete Young (Ken Niedhart, Lead)" means Pete Young plays for Ken Niedhart's team, but Pete's picks for who will win games could include Jim Niedhart, Ken Niedhart, or any other team. Do NOT say a player "picks for" or "plays for" a team they selected to win - they are just predicting winners.

**FULL STANDINGS (All ${summary.allPlayers.length} Players):**
Goblet (Overall) Standings:
${summary.allPlayers.map((p, i) => {
    const rankChangeStr = p.rankChange > 0 ? ` (↑${p.rankChange})` : p.rankChange < 0 ? ` (↓${Math.abs(p.rankChange)})` : ' (−)';
    const formStr = p.allForm ? ` [Form: ${p.allForm}]` : '';
    return `${p.rank}. ${p.name} (${p.team}, ${p.position}): ${p.wins}-${p.losses} (Win%: ${p.winPct}%)${rankChangeStr}${formStr}`;
}).join('\n')}

Funk-Eng Cup Eligible Players (Leads & Seconds only):
${summary.allPlayers.filter(p => p.isFunkEngEligible).map((p, i) => {
    const rankChangeStr = p.rankChange > 0 ? ` (↑${p.rankChange})` : p.rankChange < 0 ? ` (↓${Math.abs(p.rankChange)})` : ' (−)';
    const formStr = p.allForm ? ` [Form: ${p.allForm}]` : '';
    return `${p.rank}. ${p.name} (${p.team}, ${p.position}): ${p.wins}-${p.losses} (Win%: ${p.winPct}%)${rankChangeStr}${formStr}`;
}).join('\n')}

**MOST RECENT RESULTS${summary.mostRecentGameDate ? ` (${summary.mostRecentGameDate})` : ''} - ${summary.recentWeekGames.length} game${summary.recentWeekGames.length !== 1 ? 's' : ''}:**
${summary.recentWeekGames.length > 0 ? summary.recentWeekGames.map(g => {
    const upsetText = g.isUpset ? ' (UPSET - only ' + (100 - g.chalkPercentage) + '% picked them!)' : '';
    const notesText = g.postGameNotes && g.postGameNotes.trim() ? ` [Post-Game Note: ${g.postGameNotes}]` : '';
    const winnerRosterText = g.winnerRoster.length > 0 ? ` (Players: ${g.winnerRoster.join(', ')})` : '';
    const loserRosterText = g.loserRoster.length > 0 ? ` (Players: ${g.loserRoster.join(', ')})` : '';
    return `- ${g.winner}${winnerRosterText} defeated ${g.loser}${loserRosterText}${upsetText}${notesText}`;
}).join('\n') : 'No games completed recently'}

**NEXT MATCHUPS${summary.nextUpcomingGameDate ? ` (${summary.nextUpcomingGameDate})` : ''} - ${summary.upcomingWeekGames.length} game${summary.upcomingWeekGames.length !== 1 ? 's' : ''}:**
${summary.upcomingWeekGames.length > 0 ? summary.upcomingWeekGames.map(g => {
    const notesText = g.preGameNotes && g.preGameNotes.trim() ? ` [Pre-Game Note: ${g.preGameNotes}]` : '';
    const team1RosterText = g.team1Roster.length > 0 ? ` (Players: ${g.team1Roster.join(', ')})` : '';
    const team2RosterText = g.team2Roster.length > 0 ? ` (Players: ${g.team2Roster.join(', ')})` : '';
    return `- ${g.team1Skip}${team1RosterText} vs ${g.team2Skip}${team2RosterText} (Sheet ${g.sheet}, ${g.date} ${g.time})${notesText}`;
}).join('\n') : 'No upcoming games scheduled'}

**FUN FACTS:**
${summary.funFacts.map(f => `- ${f}`).join('\n')}

Now write an engaging, witty email based on this data. Format it as HTML suitable for pasting into Gmail. Use basic HTML tags like <p>, <strong>, <em>, <h2>, <ul>, <li>, etc. Make it fun and entertaining!

CRITICAL FORMATTING INSTRUCTIONS:
1. Start with a brief, catchy subject line (5-10 words) on the FIRST line, formatted as: <!-- SUBJECT: Your Subject Here -->
2. (optional) bonus points if the subject is a slightly obscure, but not too obscure, popular movie/tv line, or popular music lyric, if so put it in quotes with a trailing elipsis: <!--- SUBJECT: "Like a dog without a bone, An actor out on loan"… -->
2. After the subject line, write the email body content (do NOT include greeting or signature)
3. The subject line comment will be extracted and used as a section header
4. Example format:
   <!-- SUBJECT: Ice Cold Takes and Hot Streaks -->
   <p>Your email content starts here...</p>

The email will have standings and matchups appended automatically.`;

    return fullPrompt;
}

// Display a preview of the data that will be sent to AI
function displayDataPreview() {
    const previewDiv = document.getElementById('dataPreview');

    if (!gameData || !leaderboardData) {
        previewDiv.innerHTML = '<div class="error">No data available</div>';
        return;
    }

    const fullPrompt = generateFullPrompt();

    // Calculate character and line counts
    const charCount = fullPrompt.length;
    const lineCount = fullPrompt.split('\n').length;
    const wordCount = fullPrompt.split(/\s+/).length;

    // Generate the deterministic email sections
    const recentResults = formatRecentMatchups();
    const upcomingMatchups = formatUpcomingMatchups();
    const standings = formatStandingsTable();

    previewDiv.innerHTML = `
        <div class="data-summary">
            <div class="summary-section">
                <h3>📧 Email Preview</h3>
                <p style="font-size: 0.9em; color: #666; margin-bottom: 1rem;">
                    The narrative section will be AI-generated. Other sections are generated from current data.
                </p>

                <div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; max-height: 600px; overflow-y: auto;">
                    <!-- Deterministic Sections -->
                    ${recentResults}
                    ${upcomingMatchups}

                    <!-- AI Narrative Placeholder -->
                    <div style="background: #fff9e6; padding: 1.5rem; border-radius: 4px; margin-bottom: 1.5rem; margin-top: 1.5rem; border-left: 4px solid #FFC107;">
                        <strong style="color: #f57c00;">📝 AI-Generated Narrative:</strong>
                        <p style="color: #666; font-style: italic; margin-top: 0.5rem;">
                            The AI will generate 3-5 witty paragraphs here based on the latest results, upcoming matchups, and standings...
                        </p>
                    </div>

                    ${standings}
                </div>

                <!-- AI Prompt Context (collapsible) -->
                <details style="margin-top: 1rem;">
                    <summary style="cursor: pointer; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; font-weight: bold;">
                        🤖 View AI Prompt Context (${charCount.toLocaleString()} chars | ${lineCount.toLocaleString()} lines | ${wordCount.toLocaleString()} words)
                    </summary>
                    <div style="position: relative; margin-top: 1rem;">
                        <button id="copyPrompt" style="position: absolute; top: 8px; right: 8px; padding: 6px 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; z-index: 10;">
                            📋 Copy Context
                        </button>
                        <pre style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; overflow-x: auto; max-height: 600px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word; font-size: 13px; line-height: 1.6; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; border: 1px solid #ddd;">${fullPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                    </div>
                </details>
            </div>
        </div>
    `;

    // Add copy functionality
    const copyButton = document.getElementById('copyPrompt');
    if (copyButton) {
        copyButton.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(fullPrompt);
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = '✅ Copied!';
                copyButton.style.background = '#2196F3';
                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                    copyButton.style.background = '#4CAF50';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                showStatus('Failed to copy to clipboard', 'error');
            }
        });
    }
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

    // Helper function to get players on a team by skip name
    const getPlayersByTeam = (skipName) => {
        if (!skipName || !gameData.playerInfoMap) return [];

        return leaderboardData
            .filter(p => {
                const playerInfo = gameData.playerInfoMap[p.name];
                return playerInfo && playerInfo.team === skipName;
            })
            .map(p => {
                const playerInfo = gameData.playerInfoMap[p.name];
                return `${p.name} (${playerInfo.position})`;
            });
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
        // Look up player info from the map (already trimmed and cleaned)
        const playerInfo = gameData.playerInfoMap?.[p.name] || { team: '', position: '' };
        const position = playerInfo.position || '';
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
            team: playerInfo.team || '',
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
                const winnerSkip = g.winner;
                const pickInfo = gameData.pickAnalysis[createGameKey(g.week, g.date, g.time, g.sheet)];
                const isUpset = pickInfo && pickInfo.chalkPick && g.winner !== pickInfo.chalkPick;

                // Get team rosters
                const winnerRoster = getPlayersByTeam(winnerSkip);
                const loserRoster = getPlayersByTeam(loserSkip);

                return {
                    winner: g.winner,
                    loser: g.winner === g.team1 ? g.team2 : g.team1,
                    winnerSkip: winnerSkip,
                    loserSkip: loserSkip,
                    winnerRoster: winnerRoster,
                    loserRoster: loserRoster,
                    date: g.date,
                    week: g.week,
                    isUpset: isUpset,
                    chalkPercentage: pickInfo ? pickInfo.chalkPercentage : null,
                    postGameNotes: g.postGameNotes || ''
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
                .map(g => {
                    // Get team rosters
                    const team1Roster = getPlayersByTeam(g.team1Skip);
                    const team2Roster = getPlayersByTeam(g.team2Skip);

                    return {
                        team1: g.team1,
                        team2: g.team2,
                        team1Skip: g.team1Skip,
                        team2Skip: g.team2Skip,
                        team1Roster: team1Roster,
                        team2Roster: team2Roster,
                        date: g.date,
                        time: g.time,
                        week: g.week,
                        sheet: g.sheet,
                        preGameNotes: g.preGameNotes || ''
                    };
                });
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

    // Find impactful contrarian picks from recent week
    // These are picks where someone went against the grain (<35% picked the team) and it paid off
    const impactfulPicks = [];
    recentWeekGames.forEach(game => {
        if (game.isUpset && game.chalkPercentage >= 65) { // Winner was picked by <35%
            // Find players who picked the winner
            leaderboardData.forEach(player => {
                const gameResult = player.allResults.find(r =>
                    r.matchup.week === game.week &&
                    r.matchup.date === game.date &&
                    r.pick === game.winner
                );

                if (gameResult && gameResult.result === 'W') {
                    // This is impactful if player is top 10 or moved up significantly
                    const isImpactful = player.rank <= 10 || player.rankChange > 2;
                    if (isImpactful) {
                        impactfulPicks.push({
                            player: player.name,
                            team: game.winner,
                            pickPercentage: 100 - game.chalkPercentage,
                            rank: player.rank,
                            rankChange: player.rankChange
                        });
                    }
                }
            });
        }
    });

    // Add the most impactful pick to fun facts
    if (impactfulPicks.length > 0) {
        // Sort by rank (better players first) then by pick percentage (bolder picks first)
        impactfulPicks.sort((a, b) => {
            if (a.rank !== b.rank) return a.rank - b.rank;
            return a.pickPercentage - b.pickPercentage;
        });
        const pick = impactfulPicks[0];
        const rankInfo = pick.rankChange > 2 ? ` (helping them jump up ${pick.rankChange} spots!)` : ` (currently rank ${pick.rank})`;
        funFacts.push(`${pick.player} made a bold call on ${pick.team} when only ${pick.pickPercentage}% picked them${rankInfo}`);
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

        // Generate the full prompt using the shared function
        const fullPrompt = generateFullPrompt();

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
                    return `
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e8e8e8 100%); border-radius: 8px; padding: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #4CAF50;">
                        <div style="text-align: center; font-size: 12px; margin-bottom: 0.75rem; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;">
                            Week ${game.week} • ${game.date}
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 16px; color: #2c3e50;">
                                <strong>${game.winner}</strong> <span style="color: #999;">DEFEATED</span> ${game.loser}
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
                        <div style="text-align: center;">
                            <div style="font-size: 16px; font-weight: bold;">
                                ${game.team1Skip} <span style="color: #C4B99B; font-weight: bold;">VS</span> ${game.team2Skip}
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

// Format the current standings as a narrative summary
function formatStandingsTable() {
    const summary = generateDataSummary();

    // Helper to format movement
    const formatMovement = (player) => {
        if (player.rankChange > 0) return ` <span style="color: #4CAF50;">↑${player.rankChange}</span>`;
        if (player.rankChange < 0) return ` <span style="color: #f44336;">↓${Math.abs(player.rankChange)}</span>`;
        return '';
    };

    // Helper to detect log-jam (3+ players with same record at the top)
    const detectLogJam = (players) => {
        if (players.length < 3) return null;

        // Get the top player's record
        const topRecord = `${players[0].wins}-${players[0].losses}`;

        // Count ALL players with the top record (not just top 5)
        const playersWithTopRecord = players.filter(p => `${p.wins}-${p.losses}` === topRecord);

        // If 3+ players share the top record, it's a log-jam
        if (playersWithTopRecord.length >= 3) {
            return {
                record: topRecord,
                players: playersWithTopRecord,
                count: playersWithTopRecord.length
            };
        }

        return null;
    };

    // Format top 5 for Goblet
    const gobletLogJam = detectLogJam(summary.allPlayers);
    let gobletHTML = '';

    if (gobletLogJam) {
        // For large log-jams (>5), just show the summary without names
        if (gobletLogJam.count > 5) {
            gobletHTML = `<p style="margin-bottom: 1rem;"><strong>Goblet:</strong> ${gobletLogJam.count} players are tied at <strong>${gobletLogJam.record}</strong></p>`;
        } else {
            // For small log-jams (≤5), show names without team/position/movement
            gobletHTML = `<p style="margin-bottom: 1rem;"><strong>Goblet - Tied at ${gobletLogJam.record}:</strong> ${gobletLogJam.players.map(p => p.name).join(', ')}</p>`;

            // Show next few players with different records (respecting ties)
            const remainingPlayers = summary.allPlayers.filter(p => `${p.wins}-${p.losses}` !== gobletLogJam.record);
            if (remainingPlayers.length > 0 && remainingPlayers.length <= 5) {
                // Only show if there are 5 or fewer remaining (otherwise it's another big group)
                const top5Remaining = remainingPlayers.slice(0, 5);
                const lastRecord = top5Remaining.length > 0 ? `${top5Remaining[top5Remaining.length - 1].wins}-${top5Remaining[top5Remaining.length - 1].losses}` : null;

                // Find how many are tied with the 5th player
                const tiedWithFifth = lastRecord ? remainingPlayers.filter(p => `${p.wins}-${p.losses}` === lastRecord).length : 0;

                // Only include ties if it doesn't explode the list
                const toShow = (lastRecord && tiedWithFifth <= 3)
                    ? remainingPlayers.slice(0, 5 + tiedWithFifth)
                    : top5Remaining;

                gobletHTML += '<ul style="list-style: none; padding-left: 0; margin-top: 1rem;">';
                toShow.forEach(p => {
                    gobletHTML += `<li style="margin-bottom: 0.5rem;"><strong>#${p.rank}:</strong> ${p.name} — ${p.wins}-${p.losses}</li>`;
                });
                gobletHTML += '</ul>';
            }
        }
    } else {
        // No log-jam at top - show top 5 (respecting ties)
        const top5 = summary.allPlayers.slice(0, 5);
        if (top5.length > 0) {
            const lastRecord = `${top5[top5.length - 1].wins}-${top5[top5.length - 1].losses}`;
            const tiedWithFifth = summary.allPlayers.filter(p => `${p.wins}-${p.losses}` === lastRecord).length;

            // Only include ties if reasonable
            const toShow = tiedWithFifth <= 3
                ? summary.allPlayers.filter((p, idx) => {
                    return idx < 5 || (idx >= 5 && `${p.wins}-${p.losses}` === lastRecord);
                  })
                : top5;

            gobletHTML = '<p style="margin-bottom: 0.5rem;"><strong>Goblet:</strong></p>';
            gobletHTML += '<ul style="list-style: none; padding-left: 0;">';
            toShow.forEach(p => {
                gobletHTML += `<li style="margin-bottom: 0.5rem;"><strong>#${p.rank}:</strong> ${p.name} — ${p.wins}-${p.losses}</li>`;
            });
            gobletHTML += '</ul>';
        }
    }

    // Format top 5 for Funk-Eng
    const funkEngPlayers = summary.allPlayers.filter(p => p.isFunkEngEligible);
    const funkEngLogJam = detectLogJam(funkEngPlayers);
    let funkEngHTML = '';

    if (funkEngLogJam) {
        // For large log-jams (>5), just show the summary without names
        if (funkEngLogJam.count > 5) {
            funkEngHTML = `<p style="margin-bottom: 1rem;"><strong>Funk-Eng Cup:</strong> ${funkEngLogJam.count} players are tied at <strong>${funkEngLogJam.record}</strong></p>`;
        } else {
            // For small log-jams (≤5), show names without team/position/movement
            funkEngHTML = `<p style="margin-bottom: 1rem;"><strong>Funk-Eng Cup - Tied at ${funkEngLogJam.record}:</strong> ${funkEngLogJam.players.map(p => p.name).join(', ')}</p>`;

            // Show next few players with different records (respecting ties)
            const remainingPlayers = funkEngPlayers.filter(p => `${p.wins}-${p.losses}` !== funkEngLogJam.record);
            if (remainingPlayers.length > 0 && remainingPlayers.length <= 5) {
                // Only show if there are 5 or fewer remaining (otherwise it's another big group)
                const top5Remaining = remainingPlayers.slice(0, 5);
                const lastRecord = top5Remaining.length > 0 ? `${top5Remaining[top5Remaining.length - 1].wins}-${top5Remaining[top5Remaining.length - 1].losses}` : null;

                // Find how many are tied with the 5th player
                const tiedWithFifth = lastRecord ? remainingPlayers.filter(p => `${p.wins}-${p.losses}` === lastRecord).length : 0;

                // Only include ties if it doesn't explode the list
                const toShow = (lastRecord && tiedWithFifth <= 3)
                    ? remainingPlayers.slice(0, 5 + tiedWithFifth)
                    : top5Remaining;

                funkEngHTML += '<ul style="list-style: none; padding-left: 0; margin-top: 1rem;">';
                toShow.forEach(p => {
                    const funkEngRank = funkEngPlayers.indexOf(p) + 1;
                    funkEngHTML += `<li style="margin-bottom: 0.5rem;"><strong>#${funkEngRank}:</strong> ${p.name} — ${p.wins}-${p.losses}</li>`;
                });
                funkEngHTML += '</ul>';
            }
        }
    } else {
        // No log-jam at top - show top 5 (respecting ties)
        const top5 = funkEngPlayers.slice(0, 5);
        if (top5.length > 0) {
            const lastRecord = `${top5[top5.length - 1].wins}-${top5[top5.length - 1].losses}`;
            const tiedWithFifth = funkEngPlayers.filter(p => `${p.wins}-${p.losses}` === lastRecord).length;

            // Only include ties if reasonable
            const toShow = tiedWithFifth <= 3
                ? funkEngPlayers.filter((p, idx) => {
                    return idx < 5 || (idx >= 5 && `${p.wins}-${p.losses}` === lastRecord);
                  })
                : top5;

            funkEngHTML = '<p style="margin-bottom: 0.5rem;"><strong>Funk-Eng Cup:</strong></p>';
            funkEngHTML += '<ul style="list-style: none; padding-left: 0;">';
            toShow.forEach(p => {
                const funkEngRank = funkEngPlayers.indexOf(p) + 1;
                funkEngHTML += `<li style="margin-bottom: 0.5rem;"><strong>#${funkEngRank}:</strong> ${p.name} — ${p.wins}-${p.losses}</li>`;
            });
            funkEngHTML += '</ul>';
        }
    }

    let tableHTML = `
        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid #e0e0e0;">
            <h2 style="color: #2c3e50; margin-bottom: 1rem;">Current Standings</h2>

            ${gobletHTML}

            <div style="margin-top: 2rem;">
                ${funkEngHTML}
            </div>

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
