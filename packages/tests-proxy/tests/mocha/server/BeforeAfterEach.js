/*
 * Useful setup and cleanup for every single server test belongs here.
 */

MochaWeb.testOnly(function() {
  let oldCoalesceMillis;

  beforeEach(function() {
    [Competitions, Rounds, RoundProgresses, Registrations, Meteor.users].forEach(collection => {
      collection.remove({});
    });

    oldCoalesceMillis = RoundSorter.COALESCE_MILLIS;
    RoundSorter.COALESCE_MILLIS = 0;
  });

  afterEach(function() {
    RoundSorter.COALESCE_MILLIS = oldCoalesceMillis;
    stubs.restoreAll();
  });
});

