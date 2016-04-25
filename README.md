Cubing Competition Manager (CCM) [![Build Status](https://travis-ci.org/cubing/ccm.png?branch=master)](https://travis-ci.org/cubing/ccm)
=======

## Setup
- `curl https://install.meteor.com/ | sh` - Install [Meteor](https://www.meteor.com/)
- `meteor npm install`

## To run
- `meteor`
- [http://localhost:3000](http://localhost:3000), log in as ccm@ccm.com/ccm. The ccm user is created when the server starts up if and only if there are no users in the database. **For security purposes, be SURE to delete this default account, or change its password if you're going to run the server where people you don't trust will have access.**

## Misc production setup
- Analytics are handled by [okgrow:analytics](https://github.com/okgrow/analytics#configuration).

## To test
- `meteor --test`

## To lint
- `(cd tests; npm run-script lint)`

## Third party stuff
- `./update-third-party-libs.sh`
