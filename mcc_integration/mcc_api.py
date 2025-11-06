"""
Madison Curling Club API Integration
Fetches team and player data from curlingmembers.com
"""

import datetime
import json
import os
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directory constants
CACHE_DIR = "cache"
MEMBER_JSONS_DIR = os.path.join(CACHE_DIR, "member_jsons")
MEMBER_DATA_DIR = os.path.join(CACHE_DIR, "member_data")
MEMBER_SEASON_TEAMS_DIR = os.path.join(CACHE_DIR, "member_season_teams")
AVATAR_CACHE_DIR = os.path.join(CACHE_DIR, "avatars")


def load_dotenv():
    """Load environment variables from .env file."""
    env_file = os.path.join(os.getcwd(), ".env")
    if os.path.exists(env_file):
        with open(env_file) as file:
            for line in file:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split("=", 1)
                    os.environ[key] = value
                    logger.debug(f"Loaded env var: {key}")


load_dotenv()


class MCCApi:
    """Madison Curling Club API client"""

    def __init__(self):
        self._session = None
        self.uri = "https://curlingmembers.com/api"
        self.username = os.environ.get("MCC_USERNAME")
        self.password = os.environ.get("MCC_PASSWORD")

        if not self.username or not self.password:
            logger.warning("MCC_USERNAME or MCC_PASSWORD not found in environment variables")

    def get_session(self):
        """Get authenticated session, creating one if needed"""
        if self._session is None:
            # Create a session to persist the login
            session = requests.Session()

            # Set the headers, including User-Agent, on the session
            session.headers.update({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })

            login_url = "https://curlingmembers.com/Account/Login.aspx"

            # Step 1: Get the login page to retrieve hidden form fields
            response = session.get(login_url)
            soup = BeautifulSoup(response.text, "html.parser")

            # Extract hidden form fields
            viewstate = soup.find("input", {"name": "__VIEWSTATE"})["value"]
            viewstategenerator = soup.find("input", {"name": "__VIEWSTATEGENERATOR"})["value"]
            eventtarget = soup.find("input", {"name": "__EVENTTARGET"})["value"]
            eventargument = soup.find("input", {"name": "__EVENTARGUMENT"})["value"]

            # Step 2: Define the payload with the login credentials and hidden fields
            payload = {
                "ctl00$MainContent$LoginUser$UserName": self.username,
                "ctl00$MainContent$LoginUser$Password": self.password,
                "ctl00$MainContent$LoginUser$LoginButton": "Log In",
                "__VIEWSTATE": viewstate,
                "__VIEWSTATEGENERATOR": viewstategenerator,
                "__EVENTTARGET": eventtarget,
                "__EVENTARGUMENT": eventargument,
            }

            # Step 3: Send a POST request to the login URL with the payload
            response = session.post(login_url, data=payload)

            # Check if the login was successful
            if response.ok:
                self._session = session
                logger.info("Login successful!")
            else:
                logger.error("Login failed!")
                raise Exception("Failed to authenticate with Madison Curling Club")

        return self._session

    def get_seasonid(self, year):
        """Returns the seasonid for the given year."""
        return year - 2010

    def get_members_json(self, year):
        """Gets the members for the given season."""
        member_json_url = f"{self.uri}/member?seasonid={self.get_seasonid(year)}"
        response = self.get_session().get(member_json_url)
        return json.loads(response.text)

    def get_member_data(self, member_id, year):
        """Returns the data for the given member and year."""
        member_data_url = f"{self.uri}/member/{member_id}/season/{self.get_seasonid(year)}"
        response = self.get_session().get(member_data_url)
        return json.loads(response.text)

    def get_member_teams(self, member_id, year):
        """Returns the teams for the given member and year."""
        member_teams_url = f"{self.uri}/member/{member_id}/teams/?season={self.get_seasonid(year)}"
        response = self.get_session().get(member_teams_url)
        return json.loads(response.text)

    def get_avatar_image(self, member_id, size=150):
        """Get avatar image URL or download it"""
        if not member_id:
            return None

        cache_path = os.path.join(AVATAR_CACHE_DIR, f'{member_id}.jpg')

        # Try to download if not cached
        if not os.path.exists(cache_path):
            try:
                response = self.get_session().get(
                    f'https://curlingmembers.com/api/member/{member_id}/image?size={size}',
                    timeout=5
                )

                if response.status_code == 200 and len(response.content) > 1000:
                    os.makedirs(AVATAR_CACHE_DIR, exist_ok=True)
                    with open(cache_path, 'wb') as f:
                        f.write(response.content)
                    logger.info(f"Downloaded avatar for member {member_id}")
                    return cache_path
            except Exception as e:
                logger.warning(f"Failed to download avatar for member {member_id}: {e}")
                return None

        return cache_path if os.path.exists(cache_path) else None


class Season:
    """Represents a curling season"""

    def __init__(self, api: MCCApi, year: int):
        self.api = api
        self.year = year
        self._members = None
        self._member_team_datas = None
        self.member_team_data_json = os.path.join(
            MEMBER_SEASON_TEAMS_DIR, f"{self.year}.json"
        )

    def get_seasonid(self):
        return self.year - 2010

    def get_members_json(self):
        """Gets the members for the season."""
        json_path = os.path.join(MEMBER_JSONS_DIR, f"member_{self.year}.json")
        if not os.path.exists(json_path):
            logger.info(f"Downloading members for {self.year}")
            os.makedirs(MEMBER_JSONS_DIR, exist_ok=True)
            with open(json_path, "w") as file:
                file.write(json.dumps(self.api.get_members_json(self.year)))
        return json.load(open(json_path))

    def get_member_team_data(self, member_id: int):
        """Returns the team data for the given member_id."""
        if self._member_team_datas is None:
            if not os.path.exists(self.member_team_data_json):
                self._member_team_datas = {}
            else:
                with open(self.member_team_data_json) as file:
                    self._member_team_datas = json.load(file)
                # Convert keys to ints
                self._member_team_datas = {
                    int(key): value for key, value in self._member_team_datas.items()
                }

        if member_id not in self._member_team_datas:
            logger.info(f"Downloading team data for member {member_id} - {self.year}")
            self._member_team_datas[member_id] = self.api.get_member_teams(
                member_id, self.year
            )
            # Write the data to a file
            os.makedirs(MEMBER_SEASON_TEAMS_DIR, exist_ok=True)
            with open(self.member_team_data_json, "w") as file:
                file.write(json.dumps(self._member_team_datas))

        return self._member_team_datas[member_id]


def get_current_season_year() -> int:
    """Returns the current season year.
    If it's August or later, the season is the current year, otherwise it's the previous year.
    """
    today = datetime.date.today()
    return today.year if today.month >= 8 else today.year - 1


def get_mansfield_teams(year: Optional[int] = None) -> List[Dict]:
    """
    Get all Mansfield teams for a given year.
    Returns a list of team dictionaries with player information.
    """
    if year is None:
        year = get_current_season_year()

    api = MCCApi()
    season = Season(api, year)

    # Get all members for the season
    members_json = season.get_members_json()

    # Track teams and players in Mansfield
    mansfield_teams = {}
    mansfield_members = []

    logger.info(f"Processing {len(members_json)} members for {year} season")

    for member_data in members_json:
        member_id = member_data.get("MemberId")
        first_name = member_data.get("FirstName", "")
        last_name = member_data.get("LastName", "")
        gender = member_data.get("Gender", "")

        # Only look at male members (Mansfield is a men's league)
        if gender != "M":
            continue

        # Get team data for this member
        try:
            team_data = season.get_member_team_data(member_id)

            # Check if member is in Mansfield league
            for team_entry in team_data:
                league = team_entry.get("League", "")

                if league == "Mansfield":
                    mansfield_members.append({
                        "member_id": member_id,
                        "first_name": first_name,
                        "last_name": last_name,
                        "full_name": f"{first_name} {last_name}",
                        "team_data": team_entry
                    })

                    # Build team structure
                    skip_id = team_entry.get("SkipID")
                    if skip_id not in mansfield_teams:
                        mansfield_teams[skip_id] = {
                            "skip_name": team_entry.get("Skip", ""),
                            "skip_id": skip_id,
                            "lead_id": team_entry.get("LeadID"),
                            "second_id": team_entry.get("SecondID"),
                            "vice_id": team_entry.get("ViceID"),
                            "fifth_id": team_entry.get("FifthID"),
                            "day": team_entry.get("Day", ""),
                            "time": team_entry.get("Time", ""),
                            "league": league,
                            "season": year,
                            "members": []
                        }

                    break  # Member can only be on one Mansfield team

        except Exception as e:
            logger.warning(f"Error processing member {member_id}: {e}")
            continue

    logger.info(f"Found {len(mansfield_members)} Mansfield members in {len(mansfield_teams)} teams")

    # Now populate team member details
    for member_info in mansfield_members:
        member_id = member_info["member_id"]
        team_data = member_info["team_data"]
        skip_id = team_data.get("SkipID")

        if skip_id in mansfield_teams:
            # Determine position
            position = None
            if member_id == team_data.get("LeadID"):
                position = "Lead"
            elif member_id == team_data.get("SecondID"):
                position = "Second"
            elif member_id == team_data.get("ViceID"):
                position = "Vice"
            elif member_id == team_data.get("SkipID"):
                position = "Skip"
            elif member_id == team_data.get("FifthID"):
                position = "Fifth"

            mansfield_teams[skip_id]["members"].append({
                "member_id": member_id,
                "first_name": member_info["first_name"],
                "last_name": member_info["last_name"],
                "full_name": member_info["full_name"],
                "position": position
            })

    # Filter for Wednesday night teams
    wednesday_teams = []
    for team_id, team in mansfield_teams.items():
        if "Wednesday" in team.get("day", ""):
            wednesday_teams.append(team)

    logger.info(f"Found {len(wednesday_teams)} Wednesday night Mansfield teams")

    return wednesday_teams


def download_team_avatars(teams: List[Dict], api: Optional[MCCApi] = None) -> Dict[int, str]:
    """
    Download avatars for all members in the given teams.
    Returns a dictionary mapping member_id to avatar file path.
    """
    if api is None:
        api = MCCApi()

    avatar_paths = {}

    for team in teams:
        for member in team.get("members", []):
            member_id = member["member_id"]

            # Skip if already downloaded
            if member_id in avatar_paths:
                continue

            avatar_path = api.get_avatar_image(member_id)
            if avatar_path:
                avatar_paths[member_id] = avatar_path
                logger.info(f"Avatar cached for {member['full_name']}")

    logger.info(f"Downloaded/cached {len(avatar_paths)} avatars")
    return avatar_paths
