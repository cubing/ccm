Cubing Competition Manager (CCM) [![Build Status](https://travis-ci.org/cubing/ccm.png?branch=master)](https://travis-ci.org/cubing/ccm)
=======

## Setup
- `curl https://install.meteor.com/ | sh` - Install [Meteor](https://www.meteor.com/)

### Optional setup (useful for development)
- Install nodejs.
- `(cd tests; npm install)` - Install linting tools and setup pre-commit hook.

## To run
- `meteor`
- [http://localhost:3000](http://localhost:3000), log in as ccm@ccm.com/ccm. The ccm user is created when the server starts up if and only if there are no users in the database. **For security purposes, be SURE to delete this default account, or change its password if you're going to run the server where people you don't trust will have access.**
- NOTE: If you see an error "While building package velocity:test-proxy", you've run into https://github.com/meteor-velocity/node-soft-mirror/issues/9, the solution is to `rm -r packages/tests-proxy`.

## Misc production setup
- Emailing is handled by Mandrill. be sure to set the MANDRILL_USERNAME and MANDRILL_APIKEY environment variables. Note: this is not required for developing locally, any emails the server tries to send without mandrill will just be printed to the console.
- Analytics are handled by [okgrow:analytics](https://github.com/okgrow/analytics#configuration).

## To test
- `meteor --test`

## To lint
- `(cd tests; npm run-script lint)`

## Third party stuff
- `./update-third-party-libs.sh`
