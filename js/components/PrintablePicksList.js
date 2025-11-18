// PrintablePicksList component - renders a print-optimized picks matrix

import {
    getLeaderboardData,
    getRawPicksData,
    getMatchupsData,
} from '../state/app-state.js';
import { createGameKey, parseGameColumn } from '../utils/parsers.js';

/**
 * Render printable picks list
 * Optimized for printing with automatic pagination
 */
export function renderPrintablePicksList() {
    const container = document.getElementById('printablePicksContainer');
    const rawPicksData = getRawPicksData();
    const matchupsData = getMatchupsData();
    const leaderboardData = getLeaderboardData();

    // Get all game headers
    const headers = Object.keys(rawPicksData[0]);
    const gameHeaders = headers.filter(h => h.includes('Week'));

    // Build game list with full info
    const games = [];
    gameHeaders.forEach(gameHeader => {
        const gameInfo = parseGameColumn(gameHeader);
        if (!gameInfo) return;

        const gameKey = createGameKey(gameInfo.week, gameInfo.date, gameInfo.time, gameInfo.sheet);
        const game = matchupsData[gameKey];
        if (!game) return;

        games.push({
            header: gameHeader,
            ...game
        });
    });

    // Sort by game number
    games.sort((a, b) => a.gameNumber - b.gameNumber);

    // Get name header for finding player rows
    const allHeaders = Object.keys(rawPicksData[0]);
    const nameHeader = allHeaders.find(h => h.toLowerCase().includes('name'));

    // Calculate how many games can fit per page (estimate based on landscape orientation)
    // We'll use ~12 games per page for landscape letter size
    const gamesPerPage = 12;
    const totalPages = Math.ceil(games.length / gamesPerPage);

    container.innerHTML = '';

    // Create pages
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const startIdx = pageNum * gamesPerPage;
        const endIdx = Math.min(startIdx + gamesPerPage, games.length);
        const pageGames = games.slice(startIdx, endIdx);

        // Create page container
        const page = document.createElement('div');
        page.className = 'printable-page';

        // Page header
        const pageHeader = document.createElement('div');
        pageHeader.className = 'printable-page-header';
        pageHeader.innerHTML = `
            <h2>Game of the Week - Player Picks</h2>
            <div class="page-info">
                <span>Games ${startIdx + 1}-${endIdx} of ${games.length}</span>
                <span>Page ${pageNum + 1} of ${totalPages}</span>
            </div>
        `;
        page.appendChild(pageHeader);

        // Create table
        const table = document.createElement('table');
        table.className = 'printable-picks-table';

        // Table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // Player column
        const playerHeader = document.createElement('th');
        playerHeader.className = 'player-col';
        playerHeader.textContent = 'Player';
        headerRow.appendChild(playerHeader);

        // Game columns
        pageGames.forEach(game => {
            const gameHeader = document.createElement('th');
            gameHeader.className = 'game-col';

            // Determine matchup display
            let team1 = game.team1;
            let team2 = game.team2;

            // For decided games, show winner first with trophy
            if (game.winner) {
                if (game.winner === game.team2) {
                    [team1, team2] = [team2, team1];
                }
            }

            const winnerBadge = game.winner ? '<i class="fas fa-trophy"></i>' : '';

            gameHeader.innerHTML = `
                <div class="game-header-content">
                    <div class="game-number">G${game.gameNumber}</div>
                    <div class="game-week">Wk ${game.week}</div>
                    <div class="game-matchup">
                        <div class="team ${game.winner === team1 ? 'winner' : ''}">${team1}${game.winner === team1 ? ' ' + winnerBadge : ''}</div>
                        <div class="vs">vs</div>
                        <div class="team ${game.winner === team2 ? 'winner' : ''}">${team2}${game.winner === team2 ? ' ' + winnerBadge : ''}</div>
                    </div>
                </div>
            `;
            headerRow.appendChild(gameHeader);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Table body
        const tbody = document.createElement('tbody');

        leaderboardData.forEach(player => {
            const row = document.createElement('tr');

            // Player name cell
            const nameCell = document.createElement('td');
            nameCell.className = 'player-col';
            nameCell.textContent = player.name;
            row.appendChild(nameCell);

            // Find player row in raw data
            const playerRow = rawPicksData.find(r => {
                const rowName = r[nameHeader] ? r[nameHeader].trim() : '';
                return rowName === player.name;
            });

            // Add pick cells
            pageGames.forEach(game => {
                const pickCell = document.createElement('td');
                pickCell.className = 'game-col';

                if (playerRow && playerRow[game.header]) {
                    const pick = playerRow[game.header];
                    const pickDiv = document.createElement('div');
                    pickDiv.className = 'pick-cell';

                    // Determine result class
                    let resultClass = 'pending';
                    if (game.winner) {
                        resultClass = (pick === game.winner) ? 'correct' : 'incorrect';
                    }
                    pickDiv.classList.add(resultClass);

                    pickDiv.textContent = pick;
                    pickCell.appendChild(pickDiv);
                } else {
                    pickCell.textContent = '-';
                    pickCell.className = 'game-col empty';
                }

                row.appendChild(pickCell);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        page.appendChild(table);

        container.appendChild(page);
    }
}

/**
 * Setup printable picks view
 */
export function setupPrintablePicksView() {
    renderPrintablePicksList();

    // Add print button handler
    const printBtn = document.getElementById('printPicksBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Add back button handler
    const backBtn = document.getElementById('backFromPrintBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.hash = '#picks';
        });
    }
}
