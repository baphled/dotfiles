#!/bin/zsh
# Agile Development Workflow
#
# Focuses on speeding up the initial steps of working with on a project
#
 
# Very useful for quickly refreshing a consoles settings and config.
alias src_shell='source ~/.zshrc'

alias cukewip='cucumber -p wip features/'
# Aliases for my development workflow the main idea
# is to make managing my development sessions a lot quicker and flexible.

# Enter a project directory and start guard
#
# The same could be done for watcher, though I don't personally use it myself.
#
alias dev_workflow='_guard_command'
alias integration_workflow='_autotest_command'

alias monkey_magic='_codemonkey_command'

# Check to see if we have a globally installed version of guard if so run that, otherwise attempt to run it via bundler.
function _guard_command() {
  echo "Starting guard in the $@ project..."
  cd $@
  if [ -e "guard 2>&1" ]; then
    guard
  else
    bundle exec guard
  fi
}

# Automagically runs autotest, if all is passed to it it runs cucumber scenarios too
#
function _autotest_command() {
  echo "Running autotest on $@"
  cd $@
  if [ -e "autotest 2>&1" ]; then
    autotest
  else
    be autotest
  fi
}

# Gets us straight into a project via vim
#
# Useful for when use want to shell directly into vim to do some work
#
function _codemonkey_command() {
  echo "Entering $@ for Codemonkey mode:"
  vim $@
}

