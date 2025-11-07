# Game of the Week - Architecture Documentation

## Overview

This codebase has been refactored from a monolithic single-file application (4,763 lines) into a maintainable, modular architecture. The application is a static web dashboard for tracking and analyzing curling game predictions at the Madison Curling Club.

## Project Structure

```
game-of-the-week/
├── index.html                          # Main HTML entry point (minimal shell)
├── leaderboard.html                    # [DEPRECATED] Original monolithic file
│
├── css/                                # Modular CSS
│   ├── variables.css                   # CSS custom properties (colors, tokens)
│   ├── base.css                        # Base styles, typography, resets
│   ├── layout.css                      # Grid, containers, responsive layout
│   ├── utilities.css                   # Utility classes
│   └── components/                     # Component-specific styles
│       ├── header.css                  # Dashboard header
│       ├── leaderboard.css             # Leaderboard table and filters
│       ├── horse-race.css              # Horse race chart visualization
│       ├── matchups.css                # Matchup cards and schedule
│       ├── what-if.css                 # What-if analysis panel
│       ├── picks-matrix.css            # Picks matrix and distribution
│       └── modals.css                  # Modals and tooltips
│
├── js/                                 # Modular JavaScript (ES6 modules)
│   ├── main.js                         # Application entry point
│   │
│   ├── config/                         # Configuration
│   │   └── constants.js                # API URLs and constants
│   │
│   ├── utils/                          # Utility functions
│   │   ├── sanitizers.js               # Name sanitization
│   │   ├── parsers.js                  # CSV/data parsing utilities
│   │   └── colors.js                   # Color generation and sprite utils
│   │
│   ├── data/                           # Data layer
│   │   ├── data-fetcher.js             # CSV data fetching (d3.csv)
│   │   └── data-processor.js           # Data transformation and analysis
│   │
│   ├── state/                          # State management
│   │   └── app-state.js                # Centralized application state
│   │
│   └── components/                     # UI Components
│       ├── Leaderboard.js              # Leaderboard table and stats
│       ├── HorseRace.js                # Win progression chart (D3.js)
│       ├── Matchups.js                 # Matchup cards and schedule
│       ├── WhatIf.js                   # What-if analysis scenarios
│       ├── PicksMatrix.js              # Picks matrix view
│       ├── PicksDistribution.js        # Pick distribution charts
│       └── Modals.js                   # Modal dialogs and tooltips
│
├── assets/                             # Static assets
│   └── images/                         # Image files
│       ├── Goblet.png                  # Trophy/favicon
│       ├── gotw_banner.png             # Banner image
│       ├── handshake.png               # Handshake image
│       └── generic_avatar_sprite.png   # Avatar sprites
│
└── mcc_integration/                    # Madison Curling Club API integration
    └── [Python scripts and data]       # Separate integration module
```

## Architecture Principles

### 1. Separation of Concerns
- **HTML**: Minimal structural shell
- **CSS**: Organized by feature/component
- **JavaScript**: Modular ES6 modules with clear responsibilities

### 2. Modularity
- Each component is self-contained
- Clear import/export boundaries
- Reusable utilities

### 3. State Management
- Centralized state in `app-state.js`
- Getter/setter functions for controlled access
- Single source of truth

### 4. Data Flow

```
Data Fetching → Parsing → Processing → State Update → Component Rendering
     ↓              ↓           ↓            ↓               ↓
data-fetcher  →  parsers  →  processor  →  app-state  →  components
```

## Key Features

### CSS Organization
- **Variables**: Design tokens for consistent theming
- **Base**: Global styles and typography
- **Layout**: Responsive grid system
- **Components**: Scoped component styles

### JavaScript Modules

#### Config Layer (`js/config/`)
- `constants.js`: Google Sheets CSV URLs

#### Utilities Layer (`js/utils/`)
- `sanitizers.js`: Name sanitization for CSS selectors
- `parsers.js`: CSV parsing, date parsing, game key creation
- `colors.js`: D3.js color generation, avatar sprite positioning

#### Data Layer (`js/data/`)
- `data-fetcher.js`: Async CSV fetching via d3.csv
- `data-processor.js`:
  - Pick distribution analysis
  - Leaderboard calculation
  - Win/loss tracking
  - Contrarian pick identification

#### State Layer (`js/state/`)
- `app-state.js`: Centralized state with getters/setters

#### Component Layer (`js/components/`)
Each component handles:
- Rendering its UI
- User interaction setup
- State updates via state module

## Data Flow

### 1. Initialization (`main.js`)
```javascript
fetchAllData()
  → parsePlayerInfo(), parseMatchups()
  → analyzePickDistribution()
  → processData()
  → setState()
  → render components
```

### 2. User Interactions
```javascript
User Action
  → Event Handler (component)
  → Update State (app-state.js)
  → Re-render Affected Components
```

## Dependencies

### External (CDN)
- **D3.js v7**: Data visualization (horse race chart)
- **Font Awesome 6.5.1**: Icons

### Data Sources
- Google Sheets CSV exports (3 sheets):
  1. Matchups (game schedule)
  2. Picks (player predictions)
  3. Player Info (teams/positions)

## Migration Notes

### From `leaderboard.html` to Modular Structure

**Before:**
- Single 4,763-line file
- 2,179 lines of embedded CSS
- 2,313 lines of embedded JavaScript
- 50+ global functions

**After:**
- Minimal `index.html` (320 lines)
- 11 CSS files organized by feature
- 14 JavaScript modules with clear responsibilities
- ES6 module imports
- Centralized state management

### Breaking Changes
- None! The application functionality remains identical
- Old `leaderboard.html` preserved for reference

## Development

### File Naming Conventions
- **CSS**: lowercase with hyphens (e.g., `horse-race.css`)
- **JavaScript**: PascalCase for components (e.g., `HorseRace.js`)
- **Utilities**: camelCase (e.g., `data-fetcher.js`)

### Adding a New Component

1. Create CSS file in `css/components/`
2. Create JS module in `js/components/`
3. Import and call in `main.js`
4. Add stylesheet link to `index.html`

### ES6 Module Usage

All JavaScript uses ES6 modules:
```javascript
// Export
export function myFunction() { }

// Import
import { myFunction } from './path/to/module.js';
```

## Testing

To test the modularized application:
1. Open `index.html` in a modern browser
2. Verify all components load and render
3. Test user interactions (sorting, filtering, what-if)
4. Check browser console for errors

## Browser Compatibility

- Modern browsers with ES6 module support
- Chrome 61+, Firefox 60+, Safari 11+, Edge 79+

## Future Improvements

1. **Build Process**: Add bundler (Vite/Webpack) for production
2. **TypeScript**: Add type safety
3. **Testing**: Unit tests for utilities and components
4. **CSS Preprocessor**: Consider SCSS for better organization
5. **Component Framework**: Migrate to React/Vue for better state management
6. **Offline Support**: Service worker for PWA capabilities
