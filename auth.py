import requests

BASE_URL = "https://graph.facebook.com/v19.0"


def exchange_for_long_lived_token(app_id: str, app_secret: str, short_token: str) -> str:
    """Exchange a short-lived user token for a 60-day long-lived token."""
    resp = requests.get(
        f"{BASE_URL}/oauth/access_token",
        params={
            "grant_type": "fb_exchange_token",
            "client_id": app_id,
            "client_secret": app_secret,
            "fb_exchange_token": short_token,
        },
        timeout=15,
    )
    data = resp.json()
    if "error" in data:
        err = data["error"]
        raise ValueError(f"Token exchange failed: {err.get('message')} (code {err.get('code')})")
    return data["access_token"]


def validate_token(app_id: str, app_secret: str, access_token: str) -> dict:
    """
    Validate a user access token using the debug_token endpoint.
    Returns the token metadata dict (includes scopes, expiry, user_id).
    Raises ValueError if the token is invalid or expired.
    """
    resp = requests.get(
        f"{BASE_URL}/debug_token",
        params={
            "input_token": access_token,
            # App access token format: app_id|app_secret
            "access_token": f"{app_id}|{app_secret}",
        },
        timeout=15,
    )
    resp.raise_for_status()
    payload = resp.json().get("data", {})

    if not payload.get("is_valid"):
        reason = payload.get("error", {}).get("message", "unknown reason")
        raise ValueError(f"Access token is invalid or expired: {reason}")

    return payload
