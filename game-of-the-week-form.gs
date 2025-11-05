/**
 * Game of the Week Form Generator
 * Creates a simple Google Form for the 2025-2026 season
 *
 * To use this script:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create a new project
 * 3. Copy this code into the editor
 * 4. Run the createGameOfTheWeekForm() function
 * 5. Authorize the script when prompted
 * 6. Check the logs for the form URL
 */

// Schedule data for 2025-2026 season
const SCHEDULE = [
  {week: 3, date: "11/12/2025", time: "6:35 PM", sheet: 1, team1: "Allan Veler", team2: "Jim Neidhart"},
  {week: 4, date: "11/19/2025", time: "8:45 PM", sheet: 4, team1: "Dave Peterson", team2: "Allan Veler"},
  {week: 5, date: "11/26/2025", time: "6:35 PM", sheet: 4, team1: "Marcus Oldenburg", team2: "Steve Oakeson"},
  {week: 6, date: "12/10/2025", time: "8:45 PM", sheet: 2, team1: "Timothy J Ebert", team2: "Steve Oakeson"},
  {week: 7, date: "12/17/2025", time: "8:45 PM", sheet: 2, team1: "Matthew Hamilton", team2: "Ben McPhee"},
  {week: 8, date: "1/7/2026", time: "8:45 PM", sheet: 2, team1: "Paul Ryan", team2: "Mike Krajewski"},
  {week: 8, date: "1/7/2026", time: "8:45 PM", sheet: 6, team1: "Josh Koehler", team2: "Ken Neidhart"},
  {week: 9, date: "1/14/2026", time: "6:35 PM", sheet: 4, team1: "Andrew Kozloski", team2: "Justin Ramm"},
  {week: 9, date: "1/14/2026", time: "6:35 PM", sheet: 3, team1: "Charley Shilling", team2: "Aaren Christen"},
  {week: 10, date: "1/28/2026", time: "8:45 PM", sheet: 2, team1: "Timothy J Ebert", team2: "Josh Koehler"},
  {week: 10, date: "1/28/2026", time: "8:45 PM", sheet: 5, team1: "Andrew Kozloski", team2: "Garret Perry"},
  {week: 11, date: "2/4/2026", time: "6:35 PM", sheet: 5, team1: "Timothy J Ebert", team2: "Jim Neidhart"},
  {week: 11, date: "2/4/2026", time: "8:45 PM", sheet: 4, team1: "Paul Ryan", team2: "Justin Ramm"},
  {week: 12, date: "2/11/2026", time: "8:45 PM", sheet: 3, team1: "Marcus Oldenburg", team2: "Mike Krajewski"},
  {week: 12, date: "2/11/2026", time: "8:45 PM", sheet: 4, team1: "Justin Ramm", team2: "Jim Neidhart"},
  {week: 13, date: "2/18/2026", time: "6:35 PM", sheet: 1, team1: "Matthew Hamilton", team2: "Marcus Oldenburg"},
  {week: 13, date: "2/18/2026", time: "6:35 PM", sheet: 6, team1: "Dave Peterson", team2: "Timothy J Ebert"},
  {week: 13, date: "2/18/2026", time: "8:45 PM", sheet: 1, team1: "Charley Shilling", team2: "Steve Oakeson"},
  {week: 14, date: "2/25/2026", time: "6:35 PM", sheet: 3, team1: "Garret Perry", team2: "Aaren Christen"},
  {week: 14, date: "2/25/2026", time: "6:35 PM", sheet: 4, team1: "Andrew Kozloski", team2: "Marcus Oldenburg"},
  {week: 14, date: "2/25/2026", time: "8:45 PM", sheet: 5, team1: "Dave Peterson", team2: "Josh Koehler"},
  {week: 15, date: "3/4/2026", time: "6:35 PM", sheet: 6, team1: "Paul Ryan", team2: "Ben McPhee"},
  {week: 15, date: "3/4/2026", time: "8:45 PM", sheet: 5, team1: "Jim Neidhart", team2: "Ken Neidhart"},
  {week: 15, date: "3/4/2026", time: "8:45 PM", sheet: 6, team1: "Mike Krajewski", team2: "Allan Veler"},
  {week: 16, date: "3/11/2026", time: "8:45 PM", sheet: 3, team1: "Charley Shilling", team2: "Dave Peterson"},
  {week: 16, date: "3/11/2026", time: "8:45 PM", sheet: 4, team1: "Justin Ramm", team2: "Aaren Christen"},
  {week: 16, date: "3/11/2026", time: "8:45 PM", sheet: 5, team1: "Andrew Kozloski", team2: "Steve Oakeson"},
  {week: 17, date: "3/18/2026", time: "6:35 PM", sheet: 3, team1: "Charley Shilling", team2: "Ben McPhee"},
  {week: 17, date: "3/18/2026", time: "6:35 PM", sheet: 5, team1: "Matthew Hamilton", team2: "Josh Koehler"},
  {week: 17, date: "3/18/2026", time: "6:35 PM", sheet: 6, team1: "Allan Veler", team2: "Garret Perry"}
];

/**
 * Main function to create the Game of the Week form
 */
function createGameOfTheWeekForm() {
  // Create the form
  const form = FormApp.create('Game of the Week 2025-2026');

  // Set form properties
  form.setTitle('Game of the Week 2025-2026');
  form.setDescription('Pick the winner for each Game of the Week matchup.');

  // Collect responses only once
  form.setLimitOneResponsePerUser(true);
  form.setCollectEmail(true);

  // Add respondent name
  form.addTextItem()
    .setTitle('Your Name')
    .setRequired(true);

  // Add one question per game
  SCHEDULE.forEach((game, index) => {
    const questionTitle = `Week ${game.week} | ${game.date} | ${game.time} | Sheet ${game.sheet}`;

    form.addMultipleChoiceItem()
      .setTitle(questionTitle)
      .setHelpText(`${game.team1} vs ${game.team2}`)
      .setChoiceValues([
        game.team1,
        game.team2
      ])
      .setRequired(true);
  });

  // Log the form URL
  Logger.log('Form created successfully!');
  Logger.log('Form URL: ' + form.getPublishedUrl());
  Logger.log('Edit URL: ' + form.getEditUrl());

  return form;
}
