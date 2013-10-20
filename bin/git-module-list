#! /bin/bash
#
# Basic script to list all submodules with a project.
#
# This is useful when need to work out what dependancies a project has
#
# Usage: module_list project/path

PROJECT_ROOT_DIRECTORY="$1"
if [[ $# == 0 ]]; then
  # set the default value
  MODULE_DIRECTORY=".gitmodules"
else
  MODULE_DIRECTORY="${PROJECT_ROOT_DIRECTORY}/.gitmodules"
fi

function strip_postfix {
  sed 's/\.git//g'
}

# Get the module name from the url string
#
# Github URL have a consistent structure, for now, so we'll use that.
#
# git://github.com/username/project
#
function module_name {
  string=$1
  echo $string | sed 's/[a-z]*:\/\/github.com\/[a-zA-Z0-9-]*\///' | strip_postfix
}

function repository_path {
  string=$1
  echo $string | sed 's/git:/http:/' | strip_postfix
}

function repositories {
  cat ${MODULE_DIRECTORY}| grep 'url' | sed 's/url = //g'
}

function output_module_info {
  repository=$1
  module_name ${repository};
  repository_path ${repository};
  echo ${repository};
}

function read_modules {
  for repo in `repositories`; do
    echo `output_module_info ${repo}`
  done
}

function main {
  read_modules;
}

main;
