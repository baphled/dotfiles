# Path to your oh-my-zsh configuration.
ZSH=$HOME/.oh-my-zsh

ZSH_CUSTOM=~/.themes

# Set name of the theme to load.
# Look in ~/.oh-my-zsh/themes/
# Optionally, if you set this to "random", it'll load a random theme each
# time that oh-my-zsh is loaded.
ZSH_THEME="boodah"
# Set to this to use case-sensitive completion
# CASE_SENSITIVE="true"

# Comment this out to disable weekly auto-update checks
DISABLE_AUTO_UPDATE="false"

# Uncomment following line if you want to disable colors in ls
# DISABLE_LS_COLORS="true"

# Uncomment following line if you want to disable autosetting terminal title.
DISABLE_AUTO_TITLE="true"

# Uncomment following line if you want disable red dots displayed while waiting for completion
# DISABLE_COMPLETION_WAITING_DOTS="true"

# Which plugins would you like to load? (plugins can be found in ~/.oh-my-zsh/plugins/*)
# Example format: plugins=(rails git textmate ruby lighthouse)
plugins=(git vi-mode bundler history-substring-search themes fzf fzf-tab)

# Customize to your needs...
PATH="/usr/local/opt/coreutils/libexec/gnubin:$PATH"
export PATH=/usr/local/sbin:/usr/local/bin:/usr/bin:/bin:/usr/games:/opt/bin:/opt/local/bin:~/bin:/usr/local/rvm/bin:$PATH

export MANPATH="/usr/local/opt/coreutils/libexec/gnuman:$MANPATH"

export EDITOR=nvim

export XML_CATALOG_FILES="/usr/local/etc/xml/catalog"

export PATH="$HOME/bin/:$PATH:$HOME/.rvm/bin" # Make sure local bin files around found before system ones

# Add RVM to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH:$HOME/.rvm/bin"

# Add python to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH:$HOME/.local/bin"

## Add snap bin to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH:/snap/bin"

## Add flutter bin to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH":"$HOME/.pub-cache/bin"

export PATH="$PATH":"$HOME/go/bin"

export NVM_DIR=~/.nvm

if [ -n "$TMUX" ]; then
  export TERM=tmux-256color
else
  export TERM=xterm-kitty
fi

eval `dircolors ~/colors/dircolors-solarized/dircolors.ansi-dark`

eval "$(zoxide init zsh)"

# We want vi-mode
set -o vi

# Ignore all duplicate history entries
setopt hist_ignore_all_dups

source $ZSH/oh-my-zsh.sh

if [ -f ~/.fzf.zsh ]; then
  source ~/.fzf.zsh
fi

source ~/.nvm/nvm.sh

source $HOME/.zsh/zsh-syntax-highting.zsh
source $HOME/.config/aliasrc


[[ -s $HOME/.tmuxinator/scripts/tmuxinator  ]] && source $HOME/.tmuxinator/scripts/tmuxinator

# Display the vi-mode your currently in
function zle-line-init zle-keymap-select {
    RPS1="${${KEYMAP/vicmd/[NORMAL]}/(main|viins)/[INSERT]}"
    RPS2=$RPS1
    zle reset-prompt
}
zle -N zle-line-init
zle -N zle-keymap-select

# renaming multiple files at once
autoload -U zmv

PROMPT+=`$([ -n "$TMUX"  ] && tmux setenv TMUXPWD_$(tmux display -p "#D" | tr -d %) "$PWD")`

bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

if [ -n "$TMUX" ]; then
  # NO-OP
else
  ~/bin/fastfetch_autoscale
  echo ""
  echo ""
fi
