export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"

export CUCUMBER_COLORS=comment=cyan
. "$HOME/.cargo/env"

export XDG_CONFIG_HOME="$HOME/.config"

export GHOSTTY_RESOURCES_DIR="$HOME/.ghostty"

export DICPATH="$HOME/.config/hunspell:${DICPATH:-}"
