#!/bin/bash
set -e

if [[ $TRAVIS_PULL_REQUEST == "false" ]]; then

git config user.name "Travis CI"
git config user.email "clara.linos@vizzuality.com"

git checkout -b gh-pages

git rebase develop

grunt dist

git add -f js/*
git add -f css/main.css

git commit -m 'Automatic Travis Build'

git push --force --quiet "https://${GH_TOKEN}@${GH_REF}" gh-pages:gh-pages > /dev/null 2>&1

fi
