gjcomps [![Build Status](https://travis-ci.org/jfly/gjcomps.png?branch=master)](https://travis-ci.org/jfly/gjcomps)
=======

## Setup
- `curl https://install.meteor.com/ | sh` - Install [Meteor](https://www.meteor.com/)
- Install nodejs.
- `(cd tests; npm install)` - Install linting tools and setup pre-commit hook.

## To run
- `meteor`
- To enable emailing, be sure to set the MANDRILL_USERNAME and MANDRILL_APIKEY environment variables.
- [http://localhost:3000/organizer](http://localhost:3000/organizer), log in as gjcomps@gjcomps.com/gjcomps. The gjcomps user is created when the server starts up if and only if there are no users in the database. **For security purposes, be SURE to delete this default account, or change its password if you're going to run the server where people you don't trust will have access.**

## To lint
- `(cd tests; npm run-script lint)`

## Third party stuff
- `./update-third-party-libs.sh`
