Meteor.methods({
  createCompetition: function(competitionName){
    check(competitionName, String);
    if(competitionName.trim().length === 0){
      throw new Meteor.Error(400, "Competition name must be nonempty");
    }

    if(!this.userId){
      throw new Meteor.Error(401, "Must log in");
    }

    Competitions.insert({
      competitionName: competitionName,
      organizers: [ this.userId ]
    });
  },
  deleteCompetition: function(competitionId){
    check(competitionId, String);
    throwUnlessOrganizer(this.userId, competitionId);

    Competitions.remove({ _id: competitionId });
    Rounds.remove({ competitionId: competitionId });
    Results.remove({ competitionId: competitionId });
    Groups.remove({ competitionId: competitionId });
  },
  addRound: function(competitionId, eventCode){
    if(!canAddRound(this.userId, competitionId, eventCode)){
      throw new Meteor.Error(400, "Cannot add another round");
    }

    // TODO - what happens if multiple users call this method at the same time?
    // It looks like meteor makes an effort to serve methods from a single user
    // in order, but I don't know if there is any guarantee of such across users
    // See http://docs.meteor.com/#method_unblock.

    var formatCode = wca.formatsByEventCode[eventCode][0];
    Rounds.insert({
      combined: false,

      competitionId: competitionId,
      eventCode: eventCode,
      formatCode: formatCode,

      // These will be filled in by refreshRoundCodes
      roundCode: null,
      nthRound: wca.maxRoundsPerEvent
    });

    Meteor.call('refreshRoundCodes', competitionId, eventCode);
  },
  removeRound: function(roundId){
    if(!canRemoveRound(this.userId, roundId)){
      throw new Meteor.Error(400, "Cannot remove round. Make sure it is the last round for this event, and has no times entered.");
    }

    var round = Rounds.findOne({ _id: roundId });
    Rounds.remove({ _id: roundId });
    Groups.remove({ roundId: roundId });

    Meteor.call('refreshRoundCodes', round.competitionId, round.eventCode);
  },
  refreshRoundCodes: function(competitionId, eventCode){
    var rounds = Rounds.find({
      competitionId: competitionId,
      eventCode: eventCode
    }, {
      sort: {
        "nthRound": 1
      }
    }).fetch();
    if(rounds.length > wca.maxRoundsPerEvent){
      throw new Meteor.Error(400, "Too many rounds");
    }
    rounds.forEach(function(round, nthRound){
      // Note that we ignore the actual value of nthRound, and instead use the
      // index into rounds as the nthRound. This defragments any missing
      // rounds (not that that's something we expect to ever happen, since
      // removeRound only allows removal of the latest round).
      var supportedRoundsIndex;
      if(nthRound == rounds.length - 1){
        supportedRoundsIndex = wca.maxRoundsPerEvent - 1;
      }else{
        supportedRoundsIndex = nthRound;
      }
      var roundCodes = wca.supportedRounds[supportedRoundsIndex];
      var roundCode = round.combined ? roundCodes.combined : roundCodes.uncombined;
      Rounds.update({
        _id: round._id
      }, {
        $set: {
          roundCode: roundCode,
          nthRound: nthRound
        }
      });
    });
  },
});
