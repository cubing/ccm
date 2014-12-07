gjcomps [![Build Status](https://travis-ci.org/jfly/gjcomps.png?branch=master)](https://travis-ci.org/jfly/gjcomps)
=======

## Setup
- `curl https://install.meteor.com/ | sh` - Install [Meteor](https://www.meteor.com/)
- Install nodejs.
- `(cd tests; npm install)` - Install linting tools and setup pre-commit hook.

## To run
- `GJCOMPS_DEVEL=1 meteor`
- To enable emailing, be sure to set the MANDRILL_USERNAME and MANDRILL_APIKEY environment variables.
- [http://localhost:3000/organizer](http://localhost:3000/organizer), log in as gjcomps@gjcomps.com/gjcomps (must set the GJCOMPS_DEVEL environment variable for the gjcomps user to be created).

## To lint
- `(cd tests; npm run-script lint)`

## Third party stuff
- `./update-third-party-libs.sh`
