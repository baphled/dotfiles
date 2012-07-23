# Path to your oh-my-zsh configuration.
ZSH=$HOME/.oh-my-zsh


# Set name of the theme to load.
# Look in ~/.oh-my-zsh/themes/
# Optionally, if you set this to "random", it'll load a random theme each
# time that oh-my-zsh is loaded.
ZSH_THEME="boodah"

# Set to this to use case-sensitive completion
# CASE_SENSITIVE="true"

# Comment this out to disable weekly auto-update checks
DISABLE_AUTO_UPDATE="true"

# Uncomment following line if you want to disable colors in ls
# DISABLE_LS_COLORS="true"

# Uncomment following line if you want to disable autosetting terminal title.
DISABLE_AUTO_TITLE="true"

# Uncomment following line if you want disable red dots displayed while waiting for completion
# DISABLE_COMPLETION_WAITING_DOTS="true"

# Which plugins would you like to load? (plugins can be found in ~/.oh-my-zsh/plugins/*)
# Example format: plugins=(rails git textmate ruby lighthouse)
plugins=(rails3 ruby gem git github rake rvm vi-mode bundler brew heroku history-substring-search vagrant vi-mode)

source $ZSH/oh-my-zsh.sh
source $HOME/.agile_ruby_workflow.zsh

# Customize to your needs...
export PATH=/usr/local/bin:/usr/bin:/bin:/usr/games:/opt/bin:/opt/local/bin:~/bin:$PATH
export LSCOLORS='ExGxFxdxCxDxDxBxBxExEx'

alias rake='noglob rake'

export EDITOR=vim

# We want vi-mode
set -o vi

[[ -s $HOME/.tmuxinator/scripts/tmuxinator  ]] && source $HOME/.tmuxinator/scripts/tmuxinator
rvm use 1.9.2-head@global

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
alias mmv='noglob zmv -W'
