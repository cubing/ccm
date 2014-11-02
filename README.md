gjcomps [![Build Status](https://travis-ci.org/jfly/gjcomps.png?branch=master)](https://travis-ci.org/jfly/gjcomps)
=======

## Setup
- `curl https://install.meteor.com/ | sh` - Install [Meteor](https://www.meteor.com/)
- Install nodejs.
- `(cd tests; npm install)` - Install linting tools and setup pre-commit hook.

## To run
- `meteor`
- [http://localhost:3000/organizer](http://localhost:3000/organizer), log in as 2011SELZ01/1990-01-02

## To lint
- `(cd tests; npm run-script lint)`

## TODO

### Competitor side
- Sort ongoing competitions by distance (mongodb geospatial indexing)
- Add message when viewing non existant competitor page
- Expand Results schema to keep track of who advanced
  - Show who advanced in the Round template
- View competition schedule
- Show PBs/NRs/WRs
- CSS-ify!

### Organizer/Staff side
- Oh god so many things

## Third party stuff
- `(cd client/components/; wget http://twitter.github.io/typeahead.js/releases/latest/typeahead.bundle.js)`
- `(cd css/; wget https://raw.githubusercontent.com/bassjobsen/typeahead.js-bootstrap-css/master/typeaheadjs.css)`
