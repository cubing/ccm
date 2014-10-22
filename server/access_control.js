Competitions.allow({
  update: function(userId, competition, fields, modifier){
    if(competition.organizers.indexOf(userId) == -1){
      return false;
    }
    var allowedFields = [
      'competitionName',
      'wcaCompetitionId',
      'organizers',
      'staff'
    ];

    // TODO - see https://github.com/jfly/gjcomps/issues/10
    allowedFields.push("listed");

    if(_.difference(fields, allowedFields).length > 0){
      return false;
    }
    return true;
  },
  fetch: [ 'organizers' ]
});

Rounds.allow({
  update: function(userId, round, fields, modifier){
    var competition = Competitions.findOne({
      _id: round.competitionId
    });
    if(competition.organizers.indexOf(userId) == -1){
      return false;
    }

    var allowedFields = [
      'formatCode'
    ];

    console.log(_.difference(fields, allowedFields));//<<<
    if(_.difference(fields, allowedFields).length > 0){
      return false;
    }
    return true;
  },
  fetch: []
});
