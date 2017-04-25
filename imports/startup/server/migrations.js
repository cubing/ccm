Migrations.add(
  {
    version: 2,
    name: 'Compute rounds.totalCount and remove rounds.roundCode.',
    up: function() {
      Rounds.update({}, {$unset: { roundCode: 1 }}, {multi: true, validate: false});

      let counts = {};

      Rounds.find({}).fetch().forEach(round => {
        let key = round.competitionId + ',' + round.eventCode;
        counts[key] = (counts[key] || 0) + 1;
      });

      Object.keys(counts).forEach(key => {
        let ids = key.split(',');
        Rounds.update(
          {competitionId: ids[0], eventCode: ids[1]},
          {$set: {totalRounds: counts[key]}},
          {multi: true}
        );
      });
    }
  }
);

Meteor.startup(function() {
  Migrations.migrateTo('latest');
});
