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
 * @param {number|null} upToWeek - Optional week number to filter games (null = all completed games)
 * @returns {Array} Processed leaderboard data with player stats and rankings
 */
export function processData(rawPicks, gameMap, gamesArray, pickAnalysis, upToWeek = null) {
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
        let longestWinStreak = { count: 0, startGame: null, endGame: null };
        let longestLossStreak = { count: 0, startGame: null, endGame: null };
        let tempStreak = { type: null, count: 0, startGame: null };

        // Process each game column
        gameHeaders.forEach((gameHeader, headerIndex) => {
            const gameInfo = parseGameColumn(gameHeader);
            if (!gameInfo) return;

            const gameKey = createGameKey(gameInfo.week, gameInfo.date, gameInfo.time, gameInfo.sheet);
            const game = gameMap[gameKey];
            if (!game) return;

            // Skip games beyond the selected week if upToWeek is specified
            if (upToWeek !== null && game.week > upToWeek) {
                return;
            }

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

                // Track current streak (for real-time display)
                if (currentStreak.type === result) {
                    currentStreak.count++;
                } else {
                    currentStreak = { type: result, count: 1 };
                }

                // Track longest streaks
                if (tempStreak.type === result) {
                    tempStreak.count++;
                } else {
                    // Previous streak ended, check if it was a record
                    if (tempStreak.type === 'W' && tempStreak.count > longestWinStreak.count) {
                        longestWinStreak = {
                            count: tempStreak.count,
                            startGame: tempStreak.startGame,
                            endGame: game.gameNumber - 1
                        };
                    } else if (tempStreak.type === 'L' && tempStreak.count > longestLossStreak.count) {
                        longestLossStreak = {
                            count: tempStreak.count,
                            startGame: tempStreak.startGame,
                            endGame: game.gameNumber - 1
                        };
                    }
                    // Start new streak
                    tempStreak = { type: result, count: 1, startGame: game.gameNumber };
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

        // Check if the final ongoing streak is a record
        if (tempStreak.type === 'W' && tempStreak.count > longestWinStreak.count) {
            longestWinStreak = {
                count: tempStreak.count,
                startGame: tempStreak.startGame,
                endGame: tempStreak.startGame + tempStreak.count - 1
            };
        } else if (tempStreak.type === 'L' && tempStreak.count > longestLossStreak.count) {
            longestLossStreak = {
                count: tempStreak.count,
                startGame: tempStreak.startGame,
                endGame: tempStreak.startGame + tempStreak.count - 1
            };
        }

        // Filter only completed games for stats
        const completedGames = gameResults.filter(g => g.result !== null);
        const totalGames = completedGames.length;
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
            contrarianWinRate: contrarianWinRate,
            // Streak data
            currentStreak: currentStreak,
            longestWinStreak: longestWinStreak,
            longestLossStreak: longestLossStreak
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

/**
 * Aggregate player data by team
 * @param {Array} playerData - Processed player data
 * @param {Object} playerInfoMap - Map of player name to {team, position}
 * @returns {Array} Aggregated team data with averaged stats
 */
export function aggregateByTeam(playerData, playerInfoMap) {
    const teamStats = {};

    // Group players by team
    playerData.forEach(player => {
        const playerInfo = playerInfoMap[player.name];
        if (!playerInfo || !playerInfo.team) return;

        const team = playerInfo.team;
        if (!teamStats[team]) {
            teamStats[team] = {
                name: team,
                players: [],
                totalWins: 0,
                totalLosses: 0,
                totalGames: 0
            };
        }

        teamStats[team].players.push(player); // Store full player object for hover cards
        teamStats[team].totalWins += player.wins;
        teamStats[team].totalLosses += player.losses;
        teamStats[team].totalGames += player.games;
    });

    // Convert to array and calculate averages
    const teams = Object.values(teamStats).map(team => {
        const playerCount = team.players.length;
        const avgWins = playerCount > 0 ? team.totalWins / playerCount : 0;
        const avgLosses = playerCount > 0 ? team.totalLosses / playerCount : 0;
        const avgGames = playerCount > 0 ? team.totalGames / playerCount : 0;
        const winPct = avgGames > 0 ? (avgWins / avgGames * 100) : 0;

        return {
            name: team.name,
            playerCount: playerCount,
            players: team.players, // Include full player objects for hover cards
            wins: parseFloat(avgWins.toFixed(1)),
            losses: parseFloat(avgLosses.toFixed(1)),
            games: avgGames,
            winPct: winPct
        };
    });

    // Sort by wins (descending), then by win percentage
    teams.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winPct - a.winPct;
    });

    // Add rank with tie handling
    teams.forEach((team, index) => {
        if (index > 0) {
            const prevTeam = teams[index - 1];
            // Check if tied with previous team (same wins and win percentage)
            if (team.wins === prevTeam.wins && team.winPct === prevTeam.winPct) {
                team.rank = prevTeam.rank;
            } else {
                team.rank = index + 1;
            }
        } else {
            team.rank = 1;
        }
    });

    return teams;
}

/**
 * Aggregate player data by position
 * @param {Array} playerData - Processed player data
 * @param {Object} playerInfoMap - Map of player name to {team, position}
 * @returns {Array} Aggregated position data with averaged stats
 */
export function aggregateByPosition(playerData, playerInfoMap) {
    const positionStats = {};

    // Group players by position
    playerData.forEach(player => {
        const playerInfo = playerInfoMap[player.name];
        if (!playerInfo || !playerInfo.position) return;

        const position = playerInfo.position;
        if (!positionStats[position]) {
            positionStats[position] = {
                name: position,
                players: [],
                totalWins: 0,
                totalLosses: 0,
                totalGames: 0
            };
        }

        positionStats[position].players.push(player); // Store full player object for hover cards
        positionStats[position].totalWins += player.wins;
        positionStats[position].totalLosses += player.losses;
        positionStats[position].totalGames += player.games;
    });

    // Convert to array and calculate averages
    const positions = Object.values(positionStats).map(position => {
        const playerCount = position.players.length;
        const avgWins = playerCount > 0 ? position.totalWins / playerCount : 0;
        const avgLosses = playerCount > 0 ? position.totalLosses / playerCount : 0;
        const avgGames = playerCount > 0 ? position.totalGames / playerCount : 0;
        const winPct = avgGames > 0 ? (avgWins / avgGames * 100) : 0;

        return {
            name: position.name,
            playerCount: playerCount,
            players: position.players, // Include full player objects for hover cards
            wins: parseFloat(avgWins.toFixed(1)),
            losses: parseFloat(avgLosses.toFixed(1)),
            games: avgGames,
            winPct: winPct
        };
    });

    // Sort by wins (descending), then by win percentage
    positions.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winPct - a.winPct;
    });

    // Add rank with tie handling
    positions.forEach((position, index) => {
        if (index > 0) {
            const prevPosition = positions[index - 1];
            // Check if tied with previous position (same wins and win percentage)
            if (position.wins === prevPosition.wins && position.winPct === prevPosition.winPct) {
                position.rank = prevPosition.rank;
            } else {
                position.rank = index + 1;
            }
        } else {
            position.rank = 1;
        }
    });

    return positions;
}
