# Game of the Week

A static web application for tracking and predicting curling game outcomes for the Madison Curling Club.

## Features

- 📊 **Interactive Leaderboard**: Track player predictions and win rates
- 📈 **Win Progression Chart**: Visualize performance over time
- 🔮 **What-If Analysis**: Predict future standings based on game outcomes
- 🏆 **Team Cards**: Display Wednesday night Mansfield teams with player avatars
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
game-of-the-week/
├── leaderboard.html              # Main dashboard with predictions
├── game-of-the-week-2025-2026.html  # Game schedule
├── game-of-the-week-form.gs      # Google Apps Script for forms
├── game-of-the-week-2025-2026.csv   # Schedule data
├── APPS_SCRIPT_INSTRUCTIONS.md   # Setup guide
├── mcc_integration/              # Madison Curling Club API integration
│   ├── README.md                 # Integration documentation
│   ├── mcc_api.py               # API client
│   ├── export_team_cards.py     # Team data export script
│   ├── quick_start.sh           # Quick setup script
│   └── team_cards_example.html  # Example team cards display
└── README.md                     # This file
```

## Quick Start

### Viewing the Dashboard

1. Open `leaderboard.html` in your browser
2. The dashboard fetches data from published Google Sheets CSV exports

### Running the Google Form

See `APPS_SCRIPT_INSTRUCTIONS.md` for instructions on:
- Creating the predictions form
- Collecting responses
- Publishing data for the dashboard

## Madison Curling Club Integration

The `mcc_integration/` directory contains tools to fetch team and player data from the Madison Curling Club member site.

### Features

- 🏒 Fetch Wednesday night Mansfield league teams (6:35 PM and 8:45 PM by default)
- 👤 Download player avatars automatically
- 📊 Generate JSON data for easy integration
- 💾 Smart caching to minimize API calls
- ⏰ Configurable time filtering

### Quick Setup

```bash
cd mcc_integration

# Install dependencies
pip install -r requirements.txt

# Configure credentials
cp .env.example .env
# Edit .env with your Madison Curling Club credentials

# Generate team cards
python export_team_cards.py

# View results
open team_cards_example.html
```

For detailed instructions, see [mcc_integration/README.md](mcc_integration/README.md).

## Data Sources

The dashboard uses three Google Sheets CSV exports:

1. **Matchups**: Game schedule with winners
2. **Picks**: Player predictions for each game
3. **Player Info**: Team and position information

These are published from Google Sheets and fetched dynamically by the dashboard.

## Dashboard Features

### Current Standings

- Sortable leaderboard with win/loss records
- Win percentage calculations
- Recent form indicators
- Filter by team or position

### Win Progression Chart

- Interactive line chart showing cumulative wins
- Hover for game-by-game details
- Toggle player visibility
- Color-coded by player

### What-If Analysis

- Select winners for upcoming games
- See projected standings impact
- Copy picks from other players
- "Pick all chalk" option

### Team Cards (via MCC Integration)

- Display Wednesday night Mansfield teams
- Player avatars and positions
- Responsive card layout
- Hover effects and animations

## Development

### Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Charts**: D3.js
- **Data**: CSV from Google Sheets
- **Backend**: Python (for MCC integration)

### File Descriptions

- `leaderboard.html`: Main dashboard with all features
- `game-of-the-week-2025-2026.html`: Static schedule display
- `game-of-the-week-form.gs`: Google Apps Script for form generation
- `game-of-the-week-2025-2026.csv`: Schedule data

### Modifying the Dashboard

To customize the dashboard:

1. Edit `leaderboard.html` for UI changes
2. Update the CSV URLs in the JavaScript section
3. Modify styles in the `<style>` section

### Adding New Features

Common additions:
- Additional filters
- New statistics
- Different chart types
- Integration with team cards

## MCC Integration Usage

### Generate Team Cards Data

```bash
cd mcc_integration
python export_team_cards.py
```

### Integrate with Dashboard

```javascript
// Add to leaderboard.html
fetch('mcc_integration/team_cards.json')
    .then(response => response.json())
    .then(data => {
        displayTeamCards(data.teams);
    });
```

See `mcc_integration/team_cards_example.html` for a complete implementation.

## Deployment

### GitHub Pages

1. Push to GitHub
2. Enable GitHub Pages in repository settings
3. Select main branch
4. Dashboard will be available at `https://username.github.io/game-of-the-week/leaderboard.html`

### Custom Server

Simply copy all HTML files to your web server. No backend required.

## Troubleshooting

### Dashboard Shows "Loading..."

- Check that CSV URLs are accessible
- Verify Google Sheets are published
- Open browser console for error messages

### Team Cards Not Loading

- Ensure `team_cards.json` exists
- Check that file path is correct
- Verify JSON is valid

### MCC Integration Errors

- Check `.env` credentials
- Verify internet connection
- See `mcc_integration/README.md` for detailed troubleshooting

## Contributing

To add features or fix bugs:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for use by Madison Curling Club members.

## Support

For issues or questions:
- **Dashboard**: Check browser console for errors
- **Google Forms**: See `APPS_SCRIPT_INSTRUCTIONS.md`
- **MCC Integration**: See `mcc_integration/README.md`

## Credits

Developed for the Madison Curling Club's Wednesday night Mansfield league.

## Changelog

### 2025-11-06
- Added Madison Curling Club integration
- Support for fetching Wednesday night Mansfield teams
- Automatic avatar downloading
- Team cards display template
- Smart caching for API data

### Previous
- Initial dashboard release
- What-if analysis feature
- Horse race chart
- Filtering and sorting
