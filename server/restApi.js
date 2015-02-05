// TODO - add documentation at /api!
// logging in requires a webbrowser:
//  Meteor.loginWithPassword("ccm@ccm.com", "ccm", function(err) { if(err) { throw err; } console.log(Accounts._storedLoginToken()); })

// TODO - someday when we're rich and successful, we'll have to paginate this,
// and perhaps unify it with the competitions publication in publications.js
HTTP.publish({name: '/api/v0/competitions'}, function() {
  return api.getCompetitions();
});

HTTP.publish({name: '/api/v0/competitions/:competitionUrlId/registrations'}, function() {
  var competitionId = api.competitionUrlIdToId(this.params.competitionUrlId);
  if(!competitionId) {
    throw new Meteor.Error(404, "Competition not found");
  }

  var registrations = Registrations.find({
    competitionId: competitionId
  }, {
    fields: {
      competitionId: 1,
      countryId: 1,
      gender: 1,
      registeredEvents: 1,
      checkedInEvents: 1,
      uniqueName: 1,
    }
  });
  return registrations;
});

HTTP.publish({name: '/api/v0/competitions/:competitionUrlId/rounds'}, function() {
  var competitionId = api.competitionUrlIdToId(this.params.competitionUrlId);
  if(!competitionId) {
    throw new Meteor.Error(404, "Competition not found");
  }

  return Rounds.find({ competitionId: competitionId });
});

HTTP.methods({
  '/api/v0/competitions/:competitionUrlId/rounds/:eventCode/:nthRound/results': {
    get: function(data) {
      var competitionId = api.competitionUrlIdToId(this.params.competitionUrlId);
      if(!competitionId) {
        throw new Meteor.Error(404, "Competition not found");
      }

      var nthRound = parseInt(this.params.nthRound);
      var round = Rounds.findOne({
        competitionId: competitionId,
        eventCode: this.params.eventCode,
        nthRound: nthRound,
      });
      if(!round) {
        throw new Meteor.Error(404, "Round not found");
      }

      var resultsQuery = {
        roundId: round._id,
      };
      if(this.query.registrationId) {
        resultsQuery.registrationId = this.query.registrationId;
      }
      var results = Results.find(resultsQuery);

      this.setContentType('application/json');
      return JSON.stringify(results.fetch());
    },
    put: function(data) {
      // TODO - yeeeeee
      console.log(this.userId, data);//<<<
      return this.userId;//<<<<
    },
  }
});
