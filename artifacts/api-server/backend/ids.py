import secrets


def generate_handoff_id() -> str:
    return "ho_" + secrets.token_hex(8)
