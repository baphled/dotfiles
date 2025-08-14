# --- Fast, non-blocking 1Password integration (async inject + throttled checks) ---

# Tunables (seconds)
typeset -gi OP_POLL_INTERVAL_LOCKED=${OP_POLL_INTERVAL_LOCKED-5}     # while locked
typeset -gi OP_POLL_INTERVAL_LOADED=${OP_POLL_INTERVAL_LOADED-30}    # after loaded (light check)

# State
typeset -gi OP_SECRETS_LOADED=${OP_SECRETS_LOADED-0}
typeset -gi OP_LAST_TRY=${OP_LAST_TRY-0}
typeset -gi OP_LAST_MONITOR=${OP_LAST_MONITOR-0}
typeset -g  OP_ASYNC_PID=${OP_ASYNC_PID-}

# Runtime paths
typeset -g OP_RT_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
typeset -g OP_DAEMON_PIDFILE="${OP_DAEMON_PIDFILE:-$OP_RT_DIR/op-daemon.pid}"
typeset -g OP_ENV_OUT="${OP_ENV_OUT:-$OP_RT_DIR/.op_env_apply}"

# Default to 🔒 unless inherited as loaded
if [[ ${OP_SECRETS_LOADED:-0} -ne 1 ]]; then
  unset OP_1P_ICON
fi

# ---- helpers ----
op_cli_available() { command -v op >/dev/null 2>&1; }

op_daemon_running() {
  [[ -f "$OP_DAEMON_PIDFILE" ]] || return 1
  local pid; pid="$(<"$OP_DAEMON_PIDFILE")" || return 1
  [[ "$pid" == <-> ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

_set_icon_locked()   { OP_SECRETS_LOADED=0; export OP_SECRETS_LOADED; unset OP_1P_ICON; }     # 🔒
_set_icon_needsign() { OP_SECRETS_LOADED=0; export OP_SECRETS_LOADED; export OP_1P_ICON="🔐"; } # 🔐
_set_icon_unlocked() { OP_SECRETS_LOADED=1; export OP_SECRETS_LOADED; export OP_1P_ICON="🔓"; } # 🔓

# Apply env if a background inject already produced it (instant, no blocking)
op_apply_async_env() {
  [[ -s "$OP_ENV_OUT" ]] || return 1
  # shellcheck disable=SC1090
  while IFS= read -r line; do eval "$line"; done < "$OP_ENV_OUT"
  rm -f "$OP_ENV_OUT"
  _set_icon_unlocked
}

# Spawn a single async inject if not already running
op_spawn_inject_async() {
  # avoid duplicate spawns
  if [[ -n "$OP_ASYNC_PID" ]] && kill -0 "$OP_ASYNC_PID" 2>/dev/null; then
    return 0
  fi

  # prerequisites
  op_daemon_running || { _set_icon_locked; return 1; }
  op_cli_available  || { _set_icon_needsign; return 1; }
  [[ -f "$HOME/secrets.zsh" ]] || { _set_icon_needsign; return 1; }

  # mark "working" state
  export OP_1P_ICON="🔐"

  # run inject in background and drop results to OP_ENV_OUT
  (
    umask 177
    local tmp; tmp="$(mktemp)"
    if op inject --in-file "$HOME/secrets.zsh" >"$tmp" 2>/dev/null; then
      mv -f "$tmp" "$OP_ENV_OUT"
      exit 0
    else
      rm -f "$tmp"
      exit 1
    fi
  ) &!
  OP_ASYNC_PID=$!
}

# Main tick: called before each prompt (precmd)
op_tick() {
  # 1) If a background job left us env, apply it now (instant)
  op_apply_async_env

  # 2) If already loaded, keep it cheap: light daemon check every OP_POLL_INTERVAL_LOADED
  if (( OP_SECRETS_LOADED == 1 )); then
    (( EPOCHSECONDS - OP_LAST_MONITOR < OP_POLL_INTERVAL_LOADED )) && return 0
    OP_LAST_MONITOR=$EPOCHSECONDS
    op_daemon_running || _set_icon_locked   # don't unset your env; just update icon/flag
    return 0
  fi

  # 3) Not loaded yet → throttle heavier work
  (( EPOCHSECONDS - OP_LAST_TRY < OP_POLL_INTERVAL_LOCKED )) && return 0
  OP_LAST_TRY=$EPOCHSECONDS

  # If daemon down, show 🔒 and bail fast
  op_daemon_running || { _set_icon_locked; return 0; }

  # Daemon up → kick an async inject (never blocks)
  op_spawn_inject_async
}

# Hooks (precmd only keeps it lean)
autoload -Uz add-zsh-hook
add-zsh-hook precmd op_tick

# Manual helpers
secrets-refresh() { OP_SECRETS_LOADED=0; OP_LAST_TRY=0; unset OP_1P_ICON; op_tick; }
secrets-status() {
  printf 'Daemon: %s\n' "$(op_daemon_running && echo up || echo down)"
  printf 'Async : %s\n' "$([[ -n "$OP_ASYNC_PID" ]] && kill -0 "$OP_ASYNC_PID" 2>/dev/null && echo running || echo idle)"
  echo "Loaded: $OP_SECRETS_LOADED"
  echo "Icon:   ${OP_1P_ICON:-🔒}"
  echo "EnvOut: $OP_ENV_OUT"
  echo "PIDfile:$OP_DAEMON_PIDFILE"
}
op-unlock() { op signin && secrets-refresh; }
