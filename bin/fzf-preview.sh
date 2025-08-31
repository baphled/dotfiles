#!/usr/bin/env bash
#
# Preview helper for fzf / fzf-tab
# - Shows text with bat/cat
# - Images with kitty/chafa/imgcat
# - DIRECTORIES with eza/ls (this is the crucial fix)

if [[ $# -ne 1 ]]; then
  >&2 echo "usage: $0 FILENAME[:LINENO][:IGNORED]"
  exit 1
fi

file=${1/#\~\//$HOME/}

center=0
if [[ ! -r $file ]]; then
  if [[ $file =~ ^(.+):([0-9]+)\ *$ ]] && [[ -r ${BASH_REMATCH[1]} ]]; then
    file=${BASH_REMATCH[1]}
    center=${BASH_REMATCH[2]}
  elif [[ $file =~ ^(.+):([0-9]+):[0-9]+\ *$ ]] && [[ -r ${BASH_REMATCH[1]} ]]; then
    file=${BASH_REMATCH[1]}
    center=${BASH_REMATCH[2]}
  fi
fi

# Use file --mime to classify
type=$(file --brief --dereference --mime -- "$file")

# ---------- NEW: handle directories nicely ----------
if [[ -d "$file" ]] || [[ $type =~ ^inode/directory ]]; then
  if command -v eza >/dev/null 2>&1; then
    # keep it readable; don’t explode the preview
    eza -1a --group-directories-first --color=always --icons=auto -- "$file"
  else
    ls -la --color=always -- "$file"
  fi
  echo
  exit 0
fi
# ---------------------------------------------------

if [[ ! $type =~ image/ ]]; then
  if [[ $type =~ =binary ]]; then
    file "$1"
    exit 0
  fi

  # Sometimes bat is installed as batcat.
  if command -v batcat > /dev/null; then
    batname="batcat"
  elif command -v bat > /dev/null; then
    batname="bat"
  else
    cat "$1"
    exit 0
  fi

  ${batname} --style="${BAT_STYLE:-numbers}" --color=always --pager=never --highlight-line="${center:-0}" -- "$file"
  exit 0
fi

dim=${FZF_PREVIEW_COLUMNS}x${FZF_PREVIEW_LINES}
if [[ $dim = x ]]; then
  dim=$(stty size < /dev/tty | awk '{print $2 "x" $1}')
elif ! [[ $KITTY_WINDOW_ID ]] && (( FZF_PREVIEW_TOP + FZF_PREVIEW_LINES == $(stty size < /dev/tty | awk '{print $1}') )); then
  dim=${FZF_PREVIEW_COLUMNS}x$((FZF_PREVIEW_LINES - 1))
fi

# 1) Kitty/Ghostty
if [[ $KITTY_WINDOW_ID ]] || [[ $GHOSTTY_RESOURCES_DIR ]] && command -v kitten > /dev/null; then
  kitten icat --clear --transfer-mode=memory --unicode-placeholder --stdin=no --place="$dim@0x0" "$file" | sed '$d' | sed $'$s/$/\e[m/'

# 2) chafa (Sixel)
elif command -v chafa > /dev/null; then
  chafa -s "$dim" "$file"
  echo

# 3) iTerm2 imgcat
elif command -v imgcat > /dev/null; then
  imgcat -W "${dim%%x*}" -H "${dim##*x}" "$file"

# 4) Fallback
else
  file "$file"
fi
