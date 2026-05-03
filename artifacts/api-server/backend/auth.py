import os
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    expected = os.environ.get("BRIDGE_TOKEN")
    # Refuse to authenticate any request when the server has no token configured.
    # Previously fell back to "dev-bridge-token-change-me", which let the public
    # /v1 routes accept that exact string in production if the env was unset.
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="BRIDGE_TOKEN not configured on server",
        )
    if credentials.credentials != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials
