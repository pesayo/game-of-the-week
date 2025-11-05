/**
 * Game of the Week Form Generator
 * Creates a Google Form for the 2025-2026 season Game of the Week schedule
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
  // Week 3
  {week: 3, date: "11/12/2025", time: "6:35 PM", sheet: 1, team1: "Allan Veler", team2: "Jim Neidhart", keyMatchup: true},

  // Week 4
  {week: 4, date: "11/19/2025", time: "8:45 PM", sheet: 4, team1: "Dave Peterson", team2: "Allan Veler", keyMatchup: true},

  // Week 5
  {week: 5, date: "11/26/2025", time: "6:35 PM", sheet: 4, team1: "Marcus Oldenburg", team2: "Steve Oakeson", keyMatchup: true},

  // Week 6
  {week: 6, date: "12/10/2025", time: "8:45 PM", sheet: 2, team1: "Timothy J Ebert", team2: "Steve Oakeson", keyMatchup: true},

  // Week 7
  {week: 7, date: "12/17/2025", time: "8:45 PM", sheet: 2, team1: "Matthew Hamilton", team2: "Ben McPhee", keyMatchup: true},

  // Week 8
  {week: 8, date: "1/7/2026", time: "8:45 PM", sheet: 2, team1: "Paul Ryan", team2: "Mike Krajewski", keyMatchup: true},
  {week: 8, date: "1/7/2026", time: "8:45 PM", sheet: 6, team1: "Josh Koehler", team2: "Ken Neidhart", keyMatchup: true},

  // Week 9
  {week: 9, date: "1/14/2026", time: "6:35 PM", sheet: 4, team1: "Andrew Kozloski", team2: "Justin Ramm", keyMatchup: false},
  {week: 9, date: "1/14/2026", time: "6:35 PM", sheet: 3, team1: "Charley Shilling", team2: "Aaren Christen", keyMatchup: false},

  // Week 10
  {week: 10, date: "1/28/2026", time: "8:45 PM", sheet: 2, team1: "Timothy J Ebert", team2: "Josh Koehler", keyMatchup: true},
  {week: 10, date: "1/28/2026", time: "8:45 PM", sheet: 5, team1: "Andrew Kozloski", team2: "Garret Perry", keyMatchup: false},

  // Week 11
  {week: 11, date: "2/4/2026", time: "6:35 PM", sheet: 5, team1: "Timothy J Ebert", team2: "Jim Neidhart", keyMatchup: true},
  {week: 11, date: "2/4/2026", time: "8:45 PM", sheet: 4, team1: "Paul Ryan", team2: "Justin Ramm", keyMatchup: false},

  // Week 12
  {week: 12, date: "2/11/2026", time: "8:45 PM", sheet: 3, team1: "Marcus Oldenburg", team2: "Mike Krajewski", keyMatchup: true},
  {week: 12, date: "2/11/2026", time: "8:45 PM", sheet: 4, team1: "Justin Ramm", team2: "Jim Neidhart", keyMatchup: false},

  // Week 13
  {week: 13, date: "2/18/2026", time: "6:35 PM", sheet: 1, team1: "Matthew Hamilton", team2: "Marcus Oldenburg", keyMatchup: true},
  {week: 13, date: "2/18/2026", time: "6:35 PM", sheet: 6, team1: "Dave Peterson", team2: "Timothy J Ebert", keyMatchup: false},
  {week: 13, date: "2/18/2026", time: "8:45 PM", sheet: 1, team1: "Charley Shilling", team2: "Steve Oakeson", keyMatchup: false},

  // Week 14
  {week: 14, date: "2/25/2026", time: "6:35 PM", sheet: 3, team1: "Garret Perry", team2: "Aaren Christen", keyMatchup: true},
  {week: 14, date: "2/25/2026", time: "6:35 PM", sheet: 4, team1: "Andrew Kozloski", team2: "Marcus Oldenburg", keyMatchup: true},
  {week: 14, date: "2/25/2026", time: "8:45 PM", sheet: 5, team1: "Dave Peterson", team2: "Josh Koehler", keyMatchup: true},

  // Week 15
  {week: 15, date: "3/4/2026", time: "6:35 PM", sheet: 6, team1: "Paul Ryan", team2: "Ben McPhee", keyMatchup: true},
  {week: 15, date: "3/4/2026", time: "8:45 PM", sheet: 5, team1: "Jim Neidhart", team2: "Ken Neidhart", keyMatchup: true},
  {week: 15, date: "3/4/2026", time: "8:45 PM", sheet: 6, team1: "Mike Krajewski", team2: "Allan Veler", keyMatchup: false},

  // Week 16
  {week: 16, date: "3/11/2026", time: "8:45 PM", sheet: 3, team1: "Charley Shilling", team2: "Dave Peterson", keyMatchup: true},
  {week: 16, date: "3/11/2026", time: "8:45 PM", sheet: 4, team1: "Justin Ramm", team2: "Aaren Christen", keyMatchup: true},
  {week: 16, date: "3/11/2026", time: "8:45 PM", sheet: 5, team1: "Andrew Kozloski", team2: "Steve Oakeson", keyMatchup: true},

  // Week 17
  {week: 17, date: "3/18/2026", time: "6:35 PM", sheet: 3, team1: "Charley Shilling", team2: "Ben McPhee", keyMatchup: false},
  {week: 17, date: "3/18/2026", time: "6:35 PM", sheet: 5, team1: "Matthew Hamilton", team2: "Josh Koehler", keyMatchup: false},
  {week: 17, date: "3/18/2026", time: "6:35 PM", sheet: 6, team1: "Allan Veler", team2: "Garret Perry", keyMatchup: false}
];

/**
 * Main function to create the Game of the Week form
 */
function createGameOfTheWeekForm() {
  // Create the form
  const form = FormApp.create('Game of the Week 2025-2026 - Predictions');

  // Set form properties
  form.setTitle('🥌 Game of the Week 2025-2026 Season - Pick Your Winners!');
  form.setDescription(
    'Predict the winners for each Game of the Week matchup throughout the season. ' +
    'Your predictions will be tracked and you can compete against other league members!\n\n' +
    '⭐ = Key Rivalry Matchup from Last Season\n\n' +
    'Total Games: 30 (Weeks 3-17)\n' +
    'Phase 1 (Weeks 3-7): 1 game per week\n' +
    'Phase 2 (Weeks 8-12): 2 games per week\n' +
    'Phase 3 (Weeks 13-17): 3 games per week'
  );

  // Collect responses only once
  form.setLimitOneResponsePerUser(true);
  form.setCollectEmail(true);

  // Add respondent name
  form.addTextItem()
    .setTitle('Your Name')
    .setRequired(true);

  // Group games by week
  const gamesByWeek = {};
  SCHEDULE.forEach(game => {
    if (!gamesByWeek[game.week]) {
      gamesByWeek[game.week] = [];
    }
    gamesByWeek[game.week].push(game);
  });

  // Add sections for each week
  const weeks = Object.keys(gamesByWeek).sort((a, b) => parseInt(a) - parseInt(b));

  weeks.forEach((week, index) => {
    const games = gamesByWeek[week];

    // Add page break between weeks (except for first week)
    if (index > 0) {
      form.addPageBreakItem()
        .setTitle(`Week ${week}`)
        .setHelpText(getWeekPhaseDescription(parseInt(week)));
    }

    // Add section header
    const gameCount = games.length;
    const phaseInfo = getWeekPhase(parseInt(week));
    form.addSectionHeaderItem()
      .setTitle(`Week ${week} - ${games[0].date} (${gameCount} Game${gameCount > 1 ? 's' : ''})`)
      .setHelpText(`${phaseInfo.name} | ${phaseInfo.description}`);

    // Add prediction question for each game
    games.forEach((game, gameIndex) => {
      const keyMatchupBadge = game.keyMatchup ? ' ⭐' : '';
      const gameTitle = `Game ${gameIndex + 1}: ${game.team1} vs ${game.team2}${keyMatchupBadge}`;
      const gameDetails = `${game.time} | Sheet ${game.sheet}${game.keyMatchup ? ' | KEY RIVALRY MATCHUP' : ''}`;

      form.addMultipleChoiceItem()
        .setTitle(gameTitle)
        .setHelpText(gameDetails)
        .setChoiceValues([
          game.team1,
          game.team2,
          'Too Close to Call'
        ])
        .setRequired(true);
    });
  });

  // Add final page for predictions confidence
  form.addPageBreakItem()
    .setTitle('Final Questions');

  form.addScaleItem()
    .setTitle('How confident are you in your predictions overall?')
    .setHelpText('1 = Not confident at all, 5 = Very confident')
    .setBounds(1, 5)
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Any bold predictions or comments about the season?')
    .setRequired(false);

  // Log the form URL
  Logger.log('Form created successfully!');
  Logger.log('Form URL: ' + form.getPublishedUrl());
  Logger.log('Edit URL: ' + form.getEditUrl());

  return form;
}

/**
 * Get phase information for a given week
 */
function getWeekPhase(week) {
  if (week >= 3 && week <= 7) {
    return {
      name: 'Phase 1: Building Momentum',
      description: '1 Game of the Week - Establishing early storylines'
    };
  } else if (week >= 8 && week <= 12) {
    return {
      name: 'Phase 2: Heating Up',
      description: '2 Games of the Week - Competition intensifies'
    };
  } else if (week >= 13 && week <= 17) {
    return {
      name: 'Phase 3: Championship Push',
      description: '3 Games of the Week - Maximum excitement!'
    };
  }
  return {name: '', description: ''};
}

/**
 * Get detailed description for week phase
 */
function getWeekPhaseDescription(week) {
  const phase = getWeekPhase(week);
  return phase.description;
}

/**
 * Create a results tracking form (for after games are played)
 */
function createGameOfTheWeekResultsForm() {
  const form = FormApp.create('Game of the Week 2025-2026 - Results Entry');

  form.setTitle('🥌 Game of the Week 2025-2026 - Enter Results');
  form.setDescription(
    'Enter the results for completed Game of the Week matchups. ' +
    'This form should be filled out after each week\'s games are completed.'
  );

  // Add week selector
  const weekChoices = [];
  for (let i = 3; i <= 17; i++) {
    weekChoices.push(`Week ${i}`);
  }

  form.addListItem()
    .setTitle('Which week are you entering results for?')
    .setChoiceValues(weekChoices)
    .setRequired(true);

  form.addDateItem()
    .setTitle('Game Date')
    .setRequired(true);

  // Group games by week
  const gamesByWeek = {};
  SCHEDULE.forEach(game => {
    if (!gamesByWeek[game.week]) {
      gamesByWeek[game.week] = [];
    }
    gamesByWeek[game.week].push(game);
  });

  // Add result entry sections for each matchup
  form.addSectionHeaderItem()
    .setTitle('Game Results')
    .setHelpText('For each game, select the winner and optionally enter the final score');

  // Add a generic result entry template
  form.addTextItem()
    .setTitle('Team 1 Name')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Team 2 Name')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Winner')
    .setChoiceValues(['Team 1', 'Team 2'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Final Score (optional)')
    .setHelpText('Format: 8-5')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Game Notes/Highlights (optional)')
    .setRequired(false);

  Logger.log('Results form created successfully!');
  Logger.log('Form URL: ' + form.getPublishedUrl());
  Logger.log('Edit URL: ' + form.getEditUrl());

  return form;
}

/**
 * Create a simple attendance tracking form
 */
function createGameOfTheWeekAttendanceForm() {
  const form = FormApp.create('Game of the Week 2025-2026 - Attendance Check');

  form.setTitle('🥌 Game of the Week - Will You Be There?');
  form.setDescription(
    'Let us know if you\'ll be attending this week\'s Game of the Week matchup(s)!'
  );

  form.setLimitOneResponsePerUser(false); // Can respond multiple times
  form.setCollectEmail(true);

  form.addTextItem()
    .setTitle('Your Name')
    .setRequired(true);

  const weekChoices = [];
  for (let i = 3; i <= 17; i++) {
    weekChoices.push(`Week ${i}`);
  }

  form.addListItem()
    .setTitle('Which week?')
    .setChoiceValues(weekChoices)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Will you attend?')
    .setChoiceValues([
      'Yes, definitely!',
      'Probably',
      'Maybe',
      'Probably not',
      'No, can\'t make it'
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Which games are you most interested in? (Check all that apply)')
    .setChoiceValues([
      'All games',
      '6:35 PM games only',
      '8:45 PM games only',
      'Key rivalry matchups only'
    ]);

  form.addParagraphTextItem()
    .setTitle('Comments or questions?')
    .setRequired(false);

  Logger.log('Attendance form created successfully!');
  Logger.log('Form URL: ' + form.getPublishedUrl());
  Logger.log('Edit URL: ' + form.getEditUrl());

  return form;
}

/**
 * Helper function to create all three forms at once
 */
function createAllForms() {
  Logger.log('Creating all Game of the Week forms...\n');

  Logger.log('1. Creating Predictions Form...');
  createGameOfTheWeekForm();

  Logger.log('\n2. Creating Results Entry Form...');
  createGameOfTheWeekResultsForm();

  Logger.log('\n3. Creating Attendance Form...');
  createGameOfTheWeekAttendanceForm();

  Logger.log('\n✅ All forms created successfully! Check the logs above for URLs.');
}
