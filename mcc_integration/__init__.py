"""Madison Curling Club Integration Package"""

from .mcc_api import (
    MCCApi,
    Season,
    get_current_season_year,
    get_mansfield_teams,
    download_team_avatars,
)

__all__ = [
    'MCCApi',
    'Season',
    'get_current_season_year',
    'get_mansfield_teams',
    'download_team_avatars',
]
