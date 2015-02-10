// TODO - someday when we're rich and successful, we'll have to paginate this
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

function getRoundId(requireManagement) {
  var competitionId = api.competitionUrlIdToId(this.params.competitionUrlId);
  if(!competitionId) {
    throw new Meteor.Error(404, "Competition not found");
  }

  if(requireManagement) {
    if(!this.userId) {
      throw new Meteor.Error(401, "Please specify a valid token");
    }
    throwIfCannotManageCompetition(this.userId, competitionId);
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
  return round._id;
}

HTTP.methods({
  '/api/v0/competitions/:competitionUrlId/rounds/:eventCode/:nthRound/results': {
    get: function(data) {
      var requireManagement = false;
      var roundId = getRoundId.call(this, requireManagement);

      var resultsQuery = { roundId: roundId };
      if(this.query.registrationId) {
        resultsQuery.registrationId = this.query.registrationId;
      }
      var results = Results.find(resultsQuery);

      this.setContentType('application/json');
      return JSON.stringify(results.fetch());
    },
    put: function(data) {
      var requireManagement = true;
      var roundId = getRoundId.call(this, requireManagement);

      if(!data) {
        throw new Meteor.Error(400, "Please send an object with registrationId, solveIndex, and solveTime");
      }

      if(!data.registrationId) {
        throw new Meteor.Error(400, "Please specify a registrationId");
      }

      if(typeof data.solveIndex != 'number') {
        throw new Meteor.Error(400, "Please specify a nonnegative solveIndex");
      }

      if(!data.solveTime) {
        throw new Meteor.Error(400, "Please specify a solveTime");
      }

      var result = Results.findOne({
        roundId: roundId,
        registrationId: data.registrationId,
      });
      if(!result) {
        throw new Meteor.Error(404, "Could not find result for given registrationId");
      }
      setSolveTime.call(this, result._id, data.solveIndex, data.solveTime);
    },
  }
});
