"""
Facebook Group Member Transfer Tool
------------------------------------
Reads all members from a source group and sends them invitations to a
destination group using the official Facebook Graph API.

Usage:
  python main.py --source GROUP_A_ID --dest GROUP_B_ID
  python main.py --source GROUP_A_ID --dest GROUP_B_ID --dry-run
  python main.py --exchange-token

See README.md for full setup instructions.
"""

import argparse
import os
import sys
import time

from dotenv import load_dotenv

import auth
import fb_api
import csv_export

# Facebook rate-limit error string check (for consecutive detection)
_CONSECUTIVE_RATE_LIMIT_LIMIT = 2


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Transfer members from one Facebook group to another via invitations."
    )
    parser.add_argument("--source", help="Source Facebook Group ID (Group A)")
    parser.add_argument("--dest", help="Destination Facebook Group ID (Group B)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Read members and export CSV without sending any invitations",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=18.0,
        help="Seconds to wait between invite calls (default: 18 → ~200 invites/hour)",
    )
    parser.add_argument(
        "--exchange-token",
        action="store_true",
        help="Exchange the short-lived token in .env for a 60-day token, print it, and exit",
    )
    return parser.parse_args()


def load_config() -> dict:
    load_dotenv()
    missing = []
    app_id = os.getenv("FB_APP_ID")
    app_secret = os.getenv("FB_APP_SECRET")
    access_token = os.getenv("FB_ACCESS_TOKEN")

    if not app_id:
        missing.append("FB_APP_ID")
    if not app_secret:
        missing.append("FB_APP_SECRET")
    if not access_token:
        missing.append("FB_ACCESS_TOKEN")

    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}")
        print("Copy .env.example to .env and fill in your credentials.")
        sys.exit(1)

    return {"app_id": app_id, "app_secret": app_secret, "access_token": access_token}


def run_token_exchange(config: dict) -> None:
    print("Exchanging short-lived token for a 60-day long-lived token...")
    try:
        long_token = auth.exchange_for_long_lived_token(
            config["app_id"], config["app_secret"], config["access_token"]
        )
    except ValueError as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    print("\nSuccess! Your long-lived access token:\n")
    print(f"  {long_token}\n")
    print("Update FB_ACCESS_TOKEN in your .env file with this value.")
    print("It is valid for 60 days. Re-run --exchange-token before it expires.\n")
    sys.exit(0)


def transfer_members(
    source_id: str,
    dest_id: str,
    access_token: str,
    dry_run: bool,
    delay: float,
) -> list:
    print(f"\nFetching members from group {source_id}...")
    try:
        members = fb_api.get_all_members(source_id, access_token)
    except RuntimeError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    total = len(members)
    print(f"Found {total} member(s).")

    if dry_run:
        path = csv_export.write_members_csv(members)
        print(f"Dry run complete. Member list saved to: {path}")
        return []

    print(f"\nSending invitations to group {dest_id} (delay: {delay}s between calls)...")
    print("Each member will receive a Facebook invitation they must accept.\n")

    results = []
    consecutive_rate_limits = 0

    for i, member in enumerate(members, start=1):
        user_id = member["id"]
        name = member.get("name", "Unknown")
        print(f"  [{i}/{total}] Inviting {name} ({user_id})...", end=" ", flush=True)

        result = fb_api.invite_member(dest_id, user_id, access_token)
        result["name"] = name

        status = result["status"]
        if status == "invited":
            print("OK")
        elif status == "already_member":
            print("already a member")
        elif status == "privacy_blocked":
            print("WARN: privacy settings block invitation")
        else:
            print(f"WARN: {result.get('reason', 'error')}")

        # Detect consecutive rate-limit errors and bail gracefully
        if status == "error" and "rate limit" in result.get("reason", "").lower():
            consecutive_rate_limits += 1
            if consecutive_rate_limits >= _CONSECUTIVE_RATE_LIMIT_LIMIT:
                print(
                    f"\nWARN: {_CONSECUTIVE_RATE_LIMIT_LIMIT} consecutive rate-limit errors. "
                    "Saving partial results and exiting. Re-run later to resume."
                )
                results.append(result)
                # Mark remaining as skipped
                for remaining in members[i:]:
                    results.append({
                        "name": remaining.get("name", "Unknown"),
                        "user_id": remaining["id"],
                        "status": "skipped",
                        "reason": "Run aborted due to rate limiting",
                    })
                break
        else:
            consecutive_rate_limits = 0

        results.append(result)

        if i < total:
            time.sleep(delay)

    return results


def main() -> None:
    args = parse_args()
    config = load_config()

    if args.exchange_token:
        run_token_exchange(config)
        return  # run_token_exchange calls sys.exit, but keep for clarity

    if not args.source or not args.dest:
        print("ERROR: --source and --dest are required (unless using --exchange-token).")
        print("Example: python main.py --source 123456 --dest 789012")
        sys.exit(1)

    # Validate token before doing any real work
    print("Validating access token...")
    try:
        token_info = auth.validate_token(config["app_id"], config["app_secret"], config["access_token"])
        scopes = token_info.get("scopes", [])
        print(f"Token valid. Scopes: {', '.join(scopes) if scopes else 'none listed'}")

        if "groups_access_member_info" not in scopes:
            print(
                "\nWARN: 'groups_access_member_info' not found in token scopes.\n"
                "Reading members may fail. Re-generate your token in Graph API Explorer\n"
                "with that permission checked. See README.md → Step 3."
            )
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    results = transfer_members(
        source_id=args.source,
        dest_id=args.dest,
        access_token=config["access_token"],
        dry_run=args.dry_run,
        delay=args.delay,
    )

    if results:
        path = csv_export.write_results_csv(results)
        invited = sum(1 for r in results if r["status"] == "invited")
        already = sum(1 for r in results if r["status"] == "already_member")
        blocked = sum(1 for r in results if r["status"] == "privacy_blocked")
        errors = sum(1 for r in results if r["status"] == "error")
        skipped = sum(1 for r in results if r["status"] == "skipped")

        print(f"\n--- Summary ---")
        print(f"  Invited:        {invited}")
        print(f"  Already member: {already}")
        print(f"  Privacy blocked:{blocked}")
        print(f"  Errors:         {errors}")
        print(f"  Skipped:        {skipped}")
        print(f"\nFull results saved to: {path}")


if __name__ == "__main__":
    main()
