# Madison Curling Club Integration

This directory contains Python scripts to fetch team and player data from the Madison Curling Club member site (curlingmembers.com) for use in the Game of the Week static app.

## Features

- 🏒 Fetch Wednesday night Mansfield league teams (6:35 PM and 8:45 PM by default)
- 👤 Download player avatars automatically
- 📊 Generate JSON data for easy integration with static HTML
- 💾 Smart caching to avoid unnecessary API calls
- 🎨 Base64 embedding option for fully portable HTML
- ⏰ Configurable time filtering

## Quick Start

### 1. Install Dependencies

```bash
cd mcc_integration
pip install -r requirements.txt
```

### 2. Configure Credentials

Copy the example environment file and add your Madison Curling Club credentials:

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```
MCC_USERNAME=your_username_here
MCC_PASSWORD=your_password_here
```

### 3. Generate Team Cards Data

```bash
python export_team_cards.py
```

This will:
- Authenticate with the Madison Curling Club API
- Fetch Wednesday night Mansfield teams for the current season (6:35 PM and 8:45 PM only)
- Download player avatars
- Generate `team_cards.json` with all team data

### 4. View the Results

Open `team_cards_example.html` in your browser to see the generated team cards.

## Usage

### Basic Usage

Generate team cards for the current season:

```bash
python export_team_cards.py
```

### Advanced Options

```bash
# Generate for a specific season
python export_team_cards.py --year 2025

# Specify custom output file
python export_team_cards.py --output ../team_data.json

# Use file paths instead of embedding avatars as base64
python export_team_cards.py --no-embed

# Filter for specific times (default is 6:35 PM and 8:45 PM)
python export_team_cards.py --times "6:35 PM" "8:45 PM"

# Filter for only one time
python export_team_cards.py --times "6:35 PM"

# Get all Wednesday teams regardless of time
python export_team_cards.py --all-times
```

### Help

```bash
python export_team_cards.py --help
```

## Output Format

The generated `team_cards.json` file has the following structure:

```json
{
  "season": 2025,
  "league": "Mansfield",
  "day": "Wednesday",
  "generated_at": "timestamp",
  "teams": [
    {
      "team_name": "Smith",
      "skip_id": 1234,
      "day": "Wednesday",
      "time": "6:35 PM",
      "league": "Mansfield",
      "season": 2025,
      "members": [
        {
          "member_id": 1001,
          "first_name": "John",
          "last_name": "Doe",
          "full_name": "John Doe",
          "position": "Lead",
          "avatar": "data:image/jpeg;base64,..."
        },
        // ... more members
      ]
    },
    // ... more teams
  ]
}
```

## Integration with Your Static App

### Option 1: Fetch JSON (Recommended for Development)

```javascript
fetch('team_cards.json')
    .then(response => response.json())
    .then(data => {
        // Use the team data
        displayTeams(data.teams);
    });
```

### Option 2: Inline JSON (For Single-File HTML)

```html
<script>
const teamData = /* paste team_cards.json content here */;
displayTeams(teamData.teams);
</script>
```

### Example Team Card Display

See `team_cards_example.html` for a complete example with:
- Responsive grid layout
- Team cards with avatars
- Position badges
- Hover effects
- Mobile-friendly design

## Caching

The integration uses smart caching to minimize API calls:

- **Member data**: Cached in `cache/member_jsons/`
- **Team data**: Cached in `cache/member_season_teams/`
- **Avatars**: Cached in `cache/avatars/`

To force a refresh, delete the relevant cache directory and run the export script again.

## API Reference

### `get_mansfield_teams(year=None, filter_times=None)`

Fetches Wednesday night Mansfield teams for a given season.

**Parameters:**
- `year` (int, optional): Season year. Defaults to current season.
- `filter_times` (List[str], optional): List of times to filter (e.g., `["6:35 PM", "8:45 PM"]`). Defaults to `["6:35 PM", "8:45 PM"]`.

**Returns:**
- List of team dictionaries with player information

**Example:**
```python
from mcc_api import get_mansfield_teams, get_current_season_year

# Get current season teams (6:35 PM and 8:45 PM only)
teams = get_mansfield_teams()

# Get specific season
teams = get_mansfield_teams(2024)

# Get only 6:35 PM teams
teams = get_mansfield_teams(filter_times=["6:35 PM"])

# Get all Wednesday teams (pass empty list)
teams = get_mansfield_teams(filter_times=[])
```

### `download_team_avatars(teams, api=None)`

Downloads avatars for all players in the given teams.

**Parameters:**
- `teams` (List[Dict]): List of team dictionaries
- `api` (MCCApi, optional): API instance. Creates one if not provided.

**Returns:**
- Dictionary mapping member_id to avatar file path

**Example:**
```python
from mcc_api import MCCApi, get_mansfield_teams, download_team_avatars

api = MCCApi()
teams = get_mansfield_teams()
avatars = download_team_avatars(teams, api)

print(f"Downloaded {len(avatars)} avatars")
```

### `MCCApi` Class

Main API client for Madison Curling Club.

**Methods:**

- `get_session()`: Get authenticated session
- `get_seasonid(year)`: Convert year to season ID
- `get_members_json(year)`: Get all members for a season
- `get_member_data(member_id, year)`: Get detailed member data
- `get_member_teams(member_id, year)`: Get teams for a member
- `get_avatar_image(member_id, size=150)`: Download member avatar

**Example:**
```python
from mcc_api import MCCApi

api = MCCApi()
session = api.get_session()

# Get member teams
teams = api.get_member_teams(member_id=1234, year=2025)

# Download avatar
avatar_path = api.get_avatar_image(member_id=1234)
```

## Troubleshooting

### Authentication Failed

Make sure your `.env` file has the correct credentials:

```bash
cat .env
```

Try logging in manually at https://curlingmembers.com to verify your credentials.

### No Teams Found

Check that:
1. You have access to the Mansfield league data
2. The season year is correct
3. There are actually Wednesday night games scheduled

### Avatar Download Failures

Some players may not have avatars uploaded. The script will:
- Log warnings for failed downloads
- Continue processing other avatars
- Use placeholder initials in the HTML display

### Rate Limiting

The API has rate limiting. If you encounter errors:
1. Wait a few minutes before retrying
2. The script uses caching to minimize API calls
3. Consider using cached data if available

## File Structure

```
mcc_integration/
├── README.md                 # This file
├── requirements.txt          # Python dependencies
├── .env.example             # Example environment variables
├── .env                     # Your credentials (gitignored)
├── .gitignore              # Git ignore rules
├── mcc_api.py              # Main API client
├── export_team_cards.py    # Export script
├── team_cards_example.html # Example HTML display
├── team_cards.json         # Generated data (created by script)
└── cache/                  # Cached data (gitignored)
    ├── avatars/           # Player avatar images
    ├── member_jsons/      # Member data cache
    └── member_season_teams/ # Team data cache
```

## Advanced Usage

### Custom Season Date Logic

The current season is determined by:
- August-December: Current year
- January-July: Previous year

To customize this, edit `get_current_season_year()` in `mcc_api.py`.

### Filtering Teams

To get only specific teams, modify `get_mansfield_teams()`:

```python
# Example: Filter by time
teams = get_mansfield_teams()
early_teams = [t for t in teams if '6:35' in t['time']]
```

### Custom Data Export

Create your own export script using the API:

```python
from mcc_api import MCCApi, get_mansfield_teams

api = MCCApi()
teams = get_mansfield_teams()

# Custom processing
for team in teams:
    print(f"Team {team['team_name']}")
    for member in team['members']:
        print(f"  - {member['full_name']} ({member['position']})")
```

## Integration Examples

### Using in Game of the Week Leaderboard

Add team card popups to your leaderboard:

```javascript
// In leaderboard.html
function showPlayerTeam(playerName) {
    fetch('mcc_integration/team_cards.json')
        .then(response => response.json())
        .then(data => {
            const team = findPlayerTeam(data.teams, playerName);
            if (team) {
                displayTeamModal(team);
            }
        });
}

function findPlayerTeam(teams, playerName) {
    for (const team of teams) {
        const member = team.members.find(m =>
            m.full_name === playerName
        );
        if (member) {
            return team;
        }
    }
    return null;
}
```

### Embedding in Existing HTML

```html
<!-- Add this to your existing HTML -->
<div id="team-cards-container"></div>

<script src="mcc_integration/display_teams.js"></script>
<script>
    loadTeamCards('mcc_integration/team_cards.json', 'team-cards-container');
</script>
```

## Contributing

To extend this integration:

1. Add new functions to `mcc_api.py` for additional API endpoints
2. Update `export_team_cards.py` to include new data
3. Modify the HTML template to display new information
4. Update this README with usage examples

## License

This integration is part of the Game of the Week project.

## Support

For issues with:
- **API access**: Contact Madison Curling Club
- **This integration**: Create an issue in the repository
- **The Game of the Week app**: See main README

## Changelog

### 2025-11-06
- Initial release
- Support for Wednesday night Mansfield teams
- Avatar downloading and caching
- Base64 embedding option
- Example HTML template
