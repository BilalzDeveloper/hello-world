import time
import requests

BASE_URL = "https://graph.facebook.com/v19.0"

# Facebook error subcodes for known invite outcomes
_ALREADY_MEMBER = 1404023
_PRIVACY_BLOCKED = 1404028

# Facebook rate-limit error codes
_RATE_LIMIT_CODES = {4, 17, 613}


def get_all_members(group_id: str, access_token: str) -> list:
    """
    Fetch every member of a group by following pagination cursors.
    Returns a list of {'id': str, 'name': str} dicts.
    Raises RuntimeError on HTTP or API errors.
    """
    members = []
    cursor = None

    while True:
        page = _fetch_members_page(group_id, access_token, cursor)
        members.extend(page.get("data", []))

        paging = page.get("paging", {})
        next_url = paging.get("next")
        if not next_url:
            break
        cursor = paging.get("cursors", {}).get("after")
        if not cursor:
            break

    return members


def _fetch_members_page(group_id: str, access_token: str, after_cursor=None) -> dict:
    params = {
        "fields": "id,name",
        "limit": 100,
        "access_token": access_token,
    }
    if after_cursor:
        params["after"] = after_cursor

    resp = requests.get(f"{BASE_URL}/{group_id}/members", params=params, timeout=20)

    if resp.status_code == 403:
        raise RuntimeError(
            "Permission denied reading group members.\n"
            "Make sure your access token includes the 'groups_access_member_info' permission.\n"
            "See README.md → Step 2 for how to add it."
        )

    if not resp.ok:
        _handle_api_error(resp, context=f"reading members of group {group_id}")

    data = resp.json()
    if "error" in data:
        _handle_api_error(resp, context=f"reading members of group {group_id}")

    return data


def invite_member(group_id: str, user_id: str, access_token: str) -> dict:
    """
    Send a group invitation to a user. Never raises — returns a structured result dict.
    Possible status values: 'invited', 'already_member', 'privacy_blocked', 'error'.
    """
    resp = _post_invite(group_id, user_id, access_token)

    # Successful invite
    if resp.ok:
        return {"user_id": user_id, "status": "invited", "reason": ""}

    data = resp.json()
    error = data.get("error", {})
    code = error.get("code")
    subcode = error.get("error_subcode")
    message = error.get("message", "unknown error")

    # Known non-fatal outcomes
    if subcode == _ALREADY_MEMBER:
        return {"user_id": user_id, "status": "already_member", "reason": ""}
    if subcode == _PRIVACY_BLOCKED:
        return {"user_id": user_id, "status": "privacy_blocked", "reason": "User privacy settings block invitations"}

    # Rate limit — sleep and retry once
    if code in _RATE_LIMIT_CODES:
        print(f"  Rate limit hit (code {code}). Sleeping 60s before retry...")
        time.sleep(60)
        resp2 = _post_invite(group_id, user_id, access_token)
        if resp2.ok:
            return {"user_id": user_id, "status": "invited", "reason": ""}
        data2 = resp2.json()
        err2 = data2.get("error", {})
        if err2.get("code") in _RATE_LIMIT_CODES:
            # Still rate limited — caller will handle extended sleep
            return {"user_id": user_id, "status": "error", "reason": f"Rate limit persists: {err2.get('message')}"}
        return {"user_id": user_id, "status": "error", "reason": err2.get("message", "unknown error after retry")}

    # HTTP 5xx — retry once after short sleep
    if resp.status_code >= 500:
        print(f"  Server error {resp.status_code}. Sleeping 30s before retry...")
        time.sleep(30)
        resp2 = _post_invite(group_id, user_id, access_token)
        if resp2.ok:
            return {"user_id": user_id, "status": "invited", "reason": ""}
        return {"user_id": user_id, "status": "error", "reason": f"Server error persisted: {resp2.status_code}"}

    return {"user_id": user_id, "status": "error", "reason": message}


def _post_invite(group_id: str, user_id: str, access_token: str) -> requests.Response:
    return requests.post(
        f"{BASE_URL}/{group_id}/members",
        data={"member": user_id, "access_token": access_token},
        timeout=20,
    )


def _handle_api_error(response: requests.Response, context: str) -> None:
    """Parse a Facebook error envelope and raise a descriptive RuntimeError."""
    try:
        err = response.json().get("error", {})
        msg = err.get("message", response.text)
        code = err.get("code", response.status_code)
    except Exception:
        msg = response.text
        code = response.status_code
    raise RuntimeError(f"Facebook API error while {context}: [{code}] {msg}")
