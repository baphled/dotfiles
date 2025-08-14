#!/usr/bin/env bash
# fzf-preview.sh - Preview helper for fzf-tab

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 FILENAME[:LINENO]" >&2
  exit 1
fi

# Expand ~ to $HOME
file=${1/#\~\//$HOME/}

# Parse "file:line" syntax (if any)
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

# Determine MIME type
type=$(file --brief --dereference --mime -- "$file")

# **Directory preview** – use eza if available, else ls (include hidden files)
if [[ -d "$file" ]]; then
  if command -v eza >/dev/null 2>&1; then
    eza -1a --group-directories-first --icons=auto --color=always -- "$file"
  else
    ls -la --color=always -- "$file"
  fi
  exit 0
fi

# **Non-image file preview**
if [[ ! $type =~ image/ ]]; then
  # If binary, just show file type info
  if [[ $type =~ =binary ]]; then
    file "$file"
    exit 0
  fi
  # Use bat (or batcat) for text preview if available, else fallback to cat
  if command -v batcat &>/dev/null; then
    pager="batcat"
  elif command -v bat &>/dev/null; then
    pager="bat"
  else
    cat "$file"
    exit 0
  fi
  # Show file with line numbers, highlighting, and jump to line if 'center' is set
  ${pager} --style="${BAT_STYLE:-numbers}" --color=always --pager=never --highlight-line="${center:-0}" -- "$file"
  exit 0
fi

# **Image preview** (determine terminal support and use appropriate tool)
dim=${FZF_PREVIEW_COLUMNS}x${FZF_PREVIEW_LINES}
if [[ $dim = "x" ]]; then
  # Fallback: get terminal size if FZF vars not set
  dim=$(stty size < /dev/tty | awk '{print $2 "x" $1}')
elif [[ -z $KITTY_WINDOW_ID ]] && (( FZF_PREVIEW_TOP + FZF_PREVIEW_LINES == $(stty size < /dev/tty | awk '{print $1}') )); then
  # Adjust height if preview occupies full terminal height (non-Kitty)
  dim=${FZF_PREVIEW_COLUMNS}x$((FZF_PREVIEW_LINES - 1))
fi

# 1) Kitty (or Ghostty) image preview
if [[ -n $KITTY_WINDOW_ID || -n $GHOSTTY_RESOURCES_DIR ]] && command -v kitten &>/dev/null; then
  kitten icat --clear --transfer-mode=memory --unicode-placeholder --stdin=no --place="$dim@0x0" "$file" \
    | sed '$d' | sed $'$s/$/\e[m/'  # ensure proper reset at end
# 2) Chafa (sixel graphics preview)
elif command -v chafa &>/dev/null; then
  chafa -s "$dim" "$file"
  echo
# 3) iTerm2 imgcat
elif command -v imgcat &>/dev/null; then
  imgcat -W "${dim%%x*}" -H "${dim##*x}" "$file"
# 4) Fallback for images – just show file info
else
  file "$file"
fi
