// Data processing module for analyzing picks and generating leaderboard data

import { createGameKey, parseGameColumn } from '../utils/parsers.js';

/**
 * Analyze pick distribution for each game to identify chalk (majority) picks
 * @param {Array} rawPicks - Raw picks data from CSV
 * @param {Object} gameMap - Map of gameKey -> game info
 * @returns {Object} Analysis object with pick distribution per game
 */
export function analyzePickDistribution(rawPicks, gameMap) {
    const analysis = {};

    // Get all game column headers from picks CSV
    const headers = Object.keys(rawPicks[0] || {});
    const gameHeaders = headers.filter(h => h.includes('Week'));

    // For each game column, count picks
    gameHeaders.forEach(header => {
        const gameInfo = parseGameColumn(header);
        if (!gameInfo) return;

        const gameKey = createGameKey(gameInfo.week, gameInfo.date, gameInfo.time, gameInfo.sheet);
        const game = gameMap[gameKey];
        if (!game) return;

        const pickCounts = {};
        pickCounts[game.team1] = 0;
        pickCounts[game.team2] = 0;
        let totalPicks = 0;

        // Count picks for this game
        rawPicks.forEach(row => {
            const pick = row[header];
            if (pick === game.team1) {
                pickCounts[game.team1]++;
                totalPicks++;
            } else if (pick === game.team2) {
                pickCounts[game.team2]++;
                totalPicks++;
            }
        });

        // Calculate percentages for each team
        let team1Percentage = 0;
        let team2Percentage = 0;
        if (totalPicks > 0) {
            team1Percentage = Math.round((pickCounts[game.team1] / totalPicks) * 100);
            team2Percentage = Math.round((pickCounts[game.team2] / totalPicks) * 100);
        }

        // Determine chalk (majority pick)
        let chalkPick = null;
        let chalkPercentage = 50;

        if (totalPicks > 0) {
            if (pickCounts[game.team1] > pickCounts[game.team2]) {
                chalkPick = game.team1;
                chalkPercentage = team1Percentage;
            } else if (pickCounts[game.team2] > pickCounts[game.team1]) {
                chalkPick = game.team2;
                chalkPercentage = team2Percentage;
            }
        }

        analysis[gameKey] = {
            team1: game.team1,
            team2: game.team2,
            team1Picks: pickCounts[game.team1],
            team2Picks: pickCounts[game.team2],
            team1Percentage: team1Percentage,
            team2Percentage: team2Percentage,
            totalPicks: totalPicks,
            chalkPick: chalkPick,
            chalkPercentage: chalkPercentage
        };
    });

    return analysis;
}

/**
 * Process picks data into leaderboard format with player statistics
 * @param {Array} rawPicks - Raw picks data from CSV
 * @param {Object} gameMap - Map of gameKey -> game info
 * @param {Array} gamesArray - Array of all games in order
 * @param {Object} pickAnalysis - Pick distribution analysis from analyzePickDistribution
 * @returns {Array} Processed leaderboard data with player stats and rankings
 */
export function processData(rawPicks, gameMap, gamesArray, pickAnalysis) {
    if (!rawPicks || rawPicks.length === 0) return [];

    const headers = Object.keys(rawPicks[0]);
    const nameHeader = headers.find(h => h.toLowerCase().includes('name'));
    const gameHeaders = headers.filter(h => h.includes('Week'));

    const players = rawPicks.map(row => {
        const name = row[nameHeader] ? row[nameHeader].trim() : '';
        if (!name) return null;

        const gameResults = [];
        let totalWins = 0;
        let totalLosses = 0;
        let currentStreak = { type: null, count: 0 };

        // Process each game column
        gameHeaders.forEach((gameHeader, headerIndex) => {
            const gameInfo = parseGameColumn(gameHeader);
            if (!gameInfo) return;

            const gameKey = createGameKey(gameInfo.week, gameInfo.date, gameInfo.time, gameInfo.sheet);
            const game = gameMap[gameKey];
            if (!game) return;

            const playerPick = row[gameHeader];
            if (!playerPick) return; // Player didn't make a pick

            // Determine result
            let result = null;
            if (game.winner) {
                // Game has been played
                result = (playerPick === game.winner) ? 'W' : 'L';
                if (result === 'W') {
                    totalWins++;
                } else {
                    totalLosses++;
                }

                // Track streaks
                if (currentStreak.type === result) {
                    currentStreak.count++;
                } else {
                    currentStreak = { type: result, count: 1 };
                }
            }
            // If no winner yet, result stays null (game not played)

            // Determine opponent
            const opponent = (playerPick === game.team1) ? game.team2 : game.team1;

            // Check if this was a contrarian pick
            const gameAnalysis = pickAnalysis[gameKey];
            const isContrarian = gameAnalysis && gameAnalysis.chalkPick &&
                playerPick !== gameAnalysis.chalkPick;

            gameResults.push({
                game: game.gameNumber,
                result: result,
                cumulativeWins: totalWins,
                cumulativeLosses: totalLosses,
                isStreak: currentStreak.count >= 3 && result !== null,
                matchup: {
                    opponent: opponent,
                    week: game.week,
                    date: game.date,
                    time: game.time,
                    sheet: game.sheet
                },
                pick: playerPick,
                isContrarian: isContrarian,
                pickAnalysis: gameAnalysis
            });
        });

        // Filter only completed games for stats
        const completedGames = gameResults.filter(g => g.result !== null);
        const totalGames = completedGames.length;
        const totalLosses = completedGames.filter(g => g.result === 'L').length;
        const winPct = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

        // Calculate contrarian stats
        const contrarianPicks = completedGames.filter(g => g.isContrarian);
        const contrarianWins = contrarianPicks.filter(g => g.result === 'W').length;
        const contrarianTotal = contrarianPicks.length;
        const contrarianPct = totalGames > 0 ? (contrarianTotal / totalGames * 100) : 0;
        const contrarianWinRate = contrarianTotal > 0 ? (contrarianWins / contrarianTotal * 100) : 0;

        // Get recent form (last 5 completed games)
        const recentForm = completedGames.slice(-5);

        return {
            name: name,
            games: totalGames,
            wins: totalWins,
            losses: totalLosses,
            winPct: winPct,
            recentForm: recentForm,
            allResults: completedGames, // Only show completed games
            contrarianTotal: contrarianTotal,
            contrarianWins: contrarianWins,
            contrarianLosses: contrarianTotal - contrarianWins,
            contrarianPct: contrarianPct,
            contrarianWinRate: contrarianWinRate
        };
    }).filter(p => p !== null);

    // Sort by wins (descending), then by win percentage
    players.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winPct - a.winPct;
    });

    // Add rank with tie handling
    let currentRank = 1;
    players.forEach((player, index) => {
        if (index > 0) {
            const prevPlayer = players[index - 1];
            // Check if tied with previous player (same wins and win percentage)
            if (player.wins === prevPlayer.wins && player.winPct === prevPlayer.winPct) {
                player.rank = prevPlayer.rank;
            } else {
                player.rank = index + 1;
            }
        } else {
            player.rank = 1;
        }
    });

    return players;
}
