# Git previews (as in your working config)

zstyle ':fzf-tab:complete:git-(add|diff|restore):*' fzf-preview \
  'git diff --color=always $word | (command -v delta >/dev/null && delta || cat)'

zstyle ':fzf-tab:complete:git-log:*'   fzf-preview 'git log --color=always $word'
zstyle ':fzf-tab:complete:git-help:*'  fzf-preview 'git help $word | col -bx | bat -plman --color=always'

zstyle ':fzf-tab:complete:git-show:*'  fzf-preview '
  case "$group" in
    "commit tag") git show --color=always $word ;;
    *)            git show --color=always $word | (command -v delta >/dev/null && delta || cat) ;;
  esac'

zstyle ':fzf-tab:complete:git-checkout:*' fzf-preview '
  case "$group" in
    "modified file")             git diff --color=always $word | (command -v delta >/dev/null && delta || cat) ;;
    "recent commit object name") git show --color=always $word | (command -v delta >/dev/null && delta || cat) ;;
    *)                           git log  --color=always $word ;;
  esac'
