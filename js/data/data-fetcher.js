// Data fetching module for loading CSV data from Google Sheets
// Uses d3.csv for parsing CSV data into JSON format

import { matchupsUrl, picksUrl, playerInfoUrl, weeklyNarrativesUrl, winnersUrl } from '../config/constants.js';

/**
 * Fetches all required data from Google Sheets CSV exports
 * @returns {Promise<Object>} Promise that resolves with matchups, picks, playerInfo, weeklyNarratives, and winners data
 */
export async function fetchAllData() {
    try {
        // Fetch all CSV files in parallel using d3.csv
        const [matchups, picks, playerInfo, weeklyNarratives, winners] = await Promise.all([
            d3.csv(matchupsUrl),
            d3.csv(picksUrl),
            d3.csv(playerInfoUrl),
            d3.csv(weeklyNarrativesUrl),
            d3.csv(winnersUrl)
        ]);

        return {
            matchups,
            picks,
            playerInfo,
            weeklyNarratives,
            winners
        };
    } catch (error) {
        console.error("Error fetching or parsing CSV:", error);
        throw new Error(`Failed to fetch data: ${error.message}`);
    }
}
