Migrations.add({
  version: 1,
  name: 'Move rounds.progress data to new roundProgresses collection.',
  up: function() {
    var allRounds = Rounds.find({}).fetch();
    allRounds.forEach(function(round) {
      var done = 0;
      var total = 0;
      if(round.progress) {
        done = round.progress.done;
        total = round.progress.total;
      }
      RoundProgresses.insert({
        roundId: round._id,
        competitionId: round.competitionId,
        done: done,
        total: total,
      });

      Rounds.update({_id: round._id}, { $unset: { progress: 1 } });
    });
  }
});

Meteor.startup(function() {
  Migrations.migrateTo('latest');
});
