// Create a unique key for a game based on Week, Date, Time, Sheet
export function createGameKey(week, date, time, sheet) {
    return `${week}_${date}_${time}_${sheet}`;
}

// Parse game column header to extract Week, Date, Time, Sheet
export function parseGameColumn(header) {
    // Format: "Week 3 | 11/12/2025 | 6:35 PM | Sheet 1"
    const match = header.match(/Week\s+(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*Sheet\s+(\d+)/i);
    if (match) {
        return {
            week: match[1].trim(),
            date: match[2].trim(),
            time: match[3].trim(),
            sheet: match[4].trim()
        };
    }
    return null;
}

// Parse player info CSV and create map
export function parsePlayerInfo(rawPlayerInfo) {
    const playerMap = {};
    const teams = new Set();
    const positions = new Set();

    rawPlayerInfo.forEach(row => {
        const name = row.Name ? row.Name.trim() : '';
        const team = row.Team ? row.Team.trim() : '';
        const position = row.Position ? row.Position.trim() : '';

        if (name && name !== '') {
            playerMap[name] = {
                team: team,
                position: position
            };

            if (team && team !== '') {
                teams.add(team);
            }
            if (position && position !== '') {
                positions.add(position);
            }
        }
    });

    return {
        playerMap,
        teams: Array.from(teams).sort(),
        positions: Array.from(positions).sort()
    };
}

// Parse matchups CSV and create game map
export function parseMatchups(rawMatchups) {
    const gameMap = {};
    const gamesArray = [];

    rawMatchups.forEach((row, index) => {
        const gameKey = createGameKey(row.Week, row.Date, row.Time, row.Sheet);
        // Check if winner exists and is not just whitespace
        const winner = row.Winner && row.Winner.trim() !== '' ? row.Winner.trim() : null;

        const gameInfo = {
            gameNumber: index + 1,
            week: row.Week,
            date: row.Date,
            time: row.Time,
            sheet: row.Sheet,
            team1: row.Team1_Skip,
            team2: row.Team2_Skip,
            winner: winner,
            gameKey: gameKey
        };
        gameMap[gameKey] = gameInfo;
        gamesArray.push(gameInfo);
    });

    return { gameMap, gamesArray };
}

// Parse game date string into Date object
export function parseGameDate(dateString) {
    try {
        const [month, day, year] = dateString.split('/').map(s => parseInt(s));
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
    } catch (e) {
        console.error('Error parsing date:', dateString, e);
        return null;
    }
}
