#!/usr/bin/env python3
"""
Export Team Cards Data
Fetches Wednesday night Mansfield teams and generates JSON data for use in the static app
"""

import json
import os
import sys
import argparse
import logging
import base64
from pathlib import Path

from mcc_api import (
    MCCApi,
    get_current_season_year,
    get_mansfield_teams,
    download_team_avatars,
    AVATAR_CACHE_DIR
)

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


def avatar_to_base64(avatar_path: str) -> str:
    """Convert avatar image to base64 data URI for embedding in HTML"""
    try:
        with open(avatar_path, 'rb') as f:
            image_data = f.read()
            base64_data = base64.b64encode(image_data).decode('utf-8')
            return f"data:image/jpeg;base64,{base64_data}"
    except Exception as e:
        logger.warning(f"Failed to convert avatar to base64: {e}")
        return None


def generate_team_cards_json(year=None, output_file="team_cards.json", embed_avatars=True, filter_times=None):
    """
    Generate JSON file with team card data for use in static HTML app.

    Args:
        year: Season year (defaults to current season)
        output_file: Output JSON file path
        embed_avatars: If True, embed avatar images as base64 data URIs
        filter_times: List of times to filter (defaults to ["6:35 PM", "8:45 PM"])
    """
    if year is None:
        year = get_current_season_year()

    if filter_times is None:
        filter_times = ["6:35/8:45PM"]

    logger.info(f"Fetching Wednesday night Mansfield teams for {year} season...")
    logger.info(f"Filtering for times: {filter_times}")

    try:
        # Get API instance
        api = MCCApi()

        # Get teams
        teams = get_mansfield_teams(year, filter_times=filter_times)

        if not teams:
            logger.warning("No Wednesday night Mansfield teams found!")
            return

        # Download avatars
        logger.info("Downloading player avatars...")
        avatar_paths = download_team_avatars(teams, api)

        # Build team cards data
        team_cards = []

        for team in teams:
            # Sort members by position order
            position_order = {"Lead": 1, "Second": 2, "Vice": 3, "Skip": 4, "Fifth": 5}
            members = sorted(
                team["members"],
                key=lambda m: position_order.get(m["position"], 99)
            )

            # Process member data
            processed_members = []
            for member in members:
                member_data = {
                    "member_id": member["member_id"],
                    "first_name": member["first_name"],
                    "last_name": member["last_name"],
                    "full_name": member["full_name"],
                    "position": member["position"]
                }

                # Add avatar
                avatar_path = avatar_paths.get(member["member_id"])
                if avatar_path:
                    if embed_avatars:
                        # Embed as base64 data URI
                        member_data["avatar"] = avatar_to_base64(avatar_path)
                    else:
                        # Use relative path
                        member_data["avatar_path"] = os.path.relpath(
                            avatar_path,
                            os.path.dirname(output_file)
                        )
                else:
                    member_data["avatar"] = None

                processed_members.append(member_data)

            team_card = {
                "team_name": team["skip_name"],
                "skip_id": team["skip_id"],
                "day": team["day"],
                "time": team["time"],
                "league": team["league"],
                "season": team["season"],
                "members": processed_members
            }

            team_cards.append(team_card)

        # Sort teams by skip name
        team_cards.sort(key=lambda t: t["team_name"])

        # Write output
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump({
                "season": year,
                "league": "Mansfield",
                "day": "Wednesday",
                "generated_at": str(Path(__file__).stat().st_mtime),
                "teams": team_cards
            }, f, indent=2)

        logger.info(f"✓ Generated team cards data: {output_file}")
        logger.info(f"  - {len(team_cards)} teams")
        logger.info(f"  - {sum(len(t['members']) for t in team_cards)} players")
        logger.info(f"  - {len(avatar_paths)} avatars cached")

        return team_cards

    except Exception as e:
        logger.error(f"Failed to generate team cards: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Export Wednesday night Mansfield team data for static app"
    )
    parser.add_argument(
        '--year',
        type=int,
        default=None,
        help=f'Season year (default: current season = {get_current_season_year()})'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='team_cards.json',
        help='Output JSON file path (default: team_cards.json)'
    )
    parser.add_argument(
        '--no-embed',
        action='store_true',
        help='Do not embed avatars as base64 (use file paths instead)'
    )
    parser.add_argument(
        '--times',
        type=str,
        nargs='+',
        default=None,
        help='Filter for specific times (default: "6:35 PM" "8:45 PM"). Example: --times "6:35 PM" "8:45 PM"'
    )
    parser.add_argument(
        '--all-times',
        action='store_true',
        help='Include all Wednesday teams regardless of time (overrides --times)'
    )

    args = parser.parse_args()

    # Handle all-times flag
    filter_times = [] if args.all_times else args.times

    generate_team_cards_json(
        year=args.year,
        output_file=args.output,
        embed_avatars=not args.no_embed,
        filter_times=filter_times
    )


if __name__ == '__main__':
    main()
