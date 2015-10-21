// TODO - someday when we're rich and successful, we'll have to paginate this
HTTP.publish({name: '/api/v0/competitions'}, function() {
  return api.getCompetitions();
});

HTTP.publish({name: '/api/v0/competitions/:competitionUrlId/registrations'}, function() {
  let competitionId = api.competitionUrlIdToId(this.params.competitionUrlId);
  if(!competitionId) {
    throw new Meteor.Error(404, "Competition not found");
  }

  let registrations = Registrations.find({
    competitionId: competitionId
  }, {
    fields: {
      competitionId: 1,
      countryId: 1,
      gender: 1,
      registeredEvents: 1,
      uniqueName: 1,
    }
  });
  return registrations;
});

HTTP.publish({name: '/api/v0/competitions/:competitionUrlId/rounds'}, function() {
  let competitionId = api.competitionUrlIdToId(this.params.competitionUrlId);
  if(!competitionId) {
    throw new Meteor.Error(404, "Competition not found");
  }

  return Rounds.find({ competitionId: competitionId });
});

function getRoundId(requireManagement) {
  let competitionId = api.competitionUrlIdToId(this.params.competitionUrlId);
  if(!competitionId) {
    throw new Meteor.Error(404, "Competition not found");
  }

  if(requireManagement) {
    if(!this.userId) {
      throw new Meteor.Error(401, "Please specify a valid token");
    }
    throwIfCannotManageCompetition(this.userId, competitionId);
  }

  let nthRound = parseInt(this.params.nthRound);
  let round = Rounds.findOne({
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
      let requireManagement = false;
      let roundId = getRoundId.call(this, requireManagement);

      let resultsQuery = { roundId: roundId };
      if(this.query.registrationId) {
        resultsQuery.registrationId = this.query.registrationId;
      }
      let results = Results.find(resultsQuery);

      this.setContentType('application/json');
      return JSON.stringify(results.fetch());
    },
    put: function(data) {
      let requireManagement = true;
      let roundId = getRoundId.call(this, requireManagement);

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

      let result = Results.findOne({
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

HTTP.methods({
  '/api/v0/competitions/:competitionUrlId/groups': {
    get: function(data) {
      let competitionId = api.competitionUrlIdToId(this.params.competitionUrlId);

      if(!this.userId) {
        throw new Meteor.Error(401, "Please specify a valid token");
      }
      throwIfCannotManageCompetition(this.userId, competitionId);

      let openRounds = Rounds.find({
        competitionId: competitionId,
        status: wca.roundStatuses.open,
      }, {
        fields: {
          _id: 1,
        }
      }).fetch();

      let closedGroupFields = {
        competitionId: 1,
        roundId: 1,
        group: 1,
        open: 1,
      };
      let openGroups = Groups.find({
        competitionId: competitionId,
        open: true,
        // Only consider a group open if it's for a round that is open.
        roundId: { $in: _.pluck(openRounds, '_id') },
      }, {
        fields: _.extend({ scrambles: 1, extraScrambles: 1 }, closedGroupFields),
      }).fetch();

      let closedGroups = Groups.find({
        competitionId: competitionId,
        $or: [
          { open: { $ne: true } },
          { roundId: { $nin: _.pluck(openRounds, '_id') } },
        ]
      }, {
        fields: closedGroupFields,
      }).fetch();

      let allGroups = openGroups.concat(closedGroups);

      this.setContentType('application/json');
      return JSON.stringify(allGroups);
    },
  }
});
