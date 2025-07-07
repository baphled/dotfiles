export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"

export CUCUMBER_COLORS=comment=cyan
. "$HOME/.cargo/env"

export XDG_CONFIG_HOME="$HOME/.config"

export GHOSTTY_RESOURCES_DIR="$HOME/.ghostty"

export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init --path)"
eval "$(pyenv init -)"

export DICPATH="$HOME/.config/hunspell:${DICPATH:-}"

# Cache TAVILY_API_KEY securely when 1Password is running
if pgrep -f "1password" > /dev/null 2>&1; then
  # 1Password is running, check for cached key
  if [[ -f "$HOME/.cache/tavily_api_key" ]]; then
    export TAVILY_API_KEY=$(cat "$HOME/.cache/tavily_api_key")
  else
    # Retrieve and cache the API key
    TAVILY_API_KEY=$(op read op://private/Tavily/credential 2>/dev/null)
    if [[ $? -eq 0 && -n "$TAVILY_API_KEY" ]]; then
      echo "$TAVILY_API_KEY" > "$HOME/.cache/tavily_api_key"
      chmod 600 "$HOME/.cache/tavily_api_key"
      export TAVILY_API_KEY
    else
      echo "Warning: Failed to retrieve TAVILY_API_KEY from 1Password" >&2
    fi
  fi
else
  echo "1Password is not running. TAVILY_API_KEY not available." >&2
fi
