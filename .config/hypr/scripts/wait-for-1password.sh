#!/bin/bash
# Wait for 1Password to be unlocked before launching dependent apps
# Usage: wait-for-1password.sh [command to run after 1Password is ready]

MAX_WAIT=120  # Maximum seconds to wait (increased for login time)
POLL_INTERVAL=2
LOG="/tmp/wait-for-1password.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG"
}

wait_for_1password() {
    local elapsed=0
    
    log "Starting wait for 1Password (will run: $*)"
    
    # First, wait for 1Password process to exist
    while ! pgrep -x "1password" > /dev/null 2>&1; do
        if [ $elapsed -ge $MAX_WAIT ]; then
            log "Timeout waiting for 1Password to start"
            return 1
        fi
        sleep $POLL_INTERVAL
        elapsed=$((elapsed + POLL_INTERVAL))
    done
    
    log "1Password process found after ${elapsed}s, waiting for unlock..."
    
    # Then wait for it to be unlocked (op CLI can communicate with it)
    while ! op account list &>/dev/null; do
        if [ $elapsed -ge $MAX_WAIT ]; then
            log "Timeout waiting for 1Password to unlock"
            return 1
        fi
        sleep $POLL_INTERVAL
        elapsed=$((elapsed + POLL_INTERVAL))
    done
    
    log "1Password unlocked after ${elapsed}s total"
    return 0
}

# If arguments provided, wait then execute them
if [ $# -gt 0 ]; then
    if wait_for_1password "$@"; then
        log "Launching: $*"
        exec "$@"
    else
        log "Failed to wait for 1Password, launching anyway: $*"
        exec "$@"
    fi
else
    wait_for_1password
fi
