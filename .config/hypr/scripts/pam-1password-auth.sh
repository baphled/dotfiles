#!/bin/bash
# PAM authentication script for 1Password
# Returns 0 (success) only if 1Password is unlocked and accessible

# PAM_USER is set by PAM to the user attempting authentication
TARGET_USER="${PAM_USER:-$(logname 2>/dev/null || echo $SUDO_USER)}"
TARGET_UID=$(id -u "$TARGET_USER" 2>/dev/null)

# Set up environment for 1Password CLI to find the app
export XDG_RUNTIME_DIR="/run/user/$TARGET_UID"
export HOME=$(getent passwd "$TARGET_USER" | cut -d: -f6)

# Run op as the target user with proper environment
if runuser -u "$TARGET_USER" -- env \
    XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" \
    HOME="$HOME" \
    op account list &>/dev/null 2>&1; then
    exit 0  # Success - 1Password is active and unlocked
fi

exit 1  # Fail - fall back to regular password auth
