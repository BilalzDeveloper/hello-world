import csv
from datetime import datetime


def write_results_csv(results: list, filename: str = None) -> str:
    """
    Write invite results to a CSV file.
    Columns: name, user_id, status, reason
    Status values: invited, already_member, privacy_blocked, error, skipped
    Returns the path of the written file.
    """
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"fb_transfer_{timestamp}.csv"

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["name", "user_id", "status", "reason"])
        writer.writeheader()
        writer.writerows(results)

    return filename


def write_members_csv(members: list, filename: str = None) -> str:
    """
    Write a plain member list to CSV (dry-run mode).
    Columns: name, user_id
    Returns the path of the written file.
    """
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"fb_members_{timestamp}.csv"

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["name", "id"])
        writer.writeheader()
        writer.writerows(members)

    return filename
