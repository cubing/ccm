var log = logging.handle("methods");

var throwIfNotVerifiedUser = function(userId) {
  if(!userId) {
    throw new Meteor.Error(401, "Must log in");
  }

  var user = Meteor.users.findOne({ _id: userId });
  if(!user.emails[0].verified) {
    throw new Meteor.Error(401, "Must verify email");
  }
};

Meteor.methods({
  createCompetition: function(competitionName) {
    check(competitionName, String);
    if(competitionName.trim().length === 0) {
      throw new Meteor.Error(400, "Competition name must be nonempty");
    }
    throwIfNotVerifiedUser(this.userId);

    var competitionId = Competitions.insert({
      competitionName: competitionName,
      organizers: [ this.userId ],
      listed: false,
      startDate: new Date(),
    });
    return competitionId;
  },
  deleteCompetition: function(competitionId) {
    check(competitionId, String);
    throwIfCannotManageCompetition(this.userId, competitionId);

    Competitions.remove({ _id: competitionId });
    Rounds.remove({ competitionId: competitionId });
    Results.remove({ competitionId: competitionId });
    Groups.remove({ competitionId: competitionId });
    Registrations.remove({ competitionId: competitionId });
  },
  addRound: function(competitionId, eventCode) {
    if(!canAddRound(this.userId, competitionId, eventCode)) {
      throw new Meteor.Error(400, "Cannot add another round");
    }

    // TODO - what happens if multiple users call this method at the same time?
    // It looks like meteor makes an effort to serve methods from a single user
    // in order, but I don't know if there is any guarantee of such across users
    // See http://docs.meteor.com/#method_unblock.

    var formatCode = wca.formatsByEventCode[eventCode][0];
    Rounds.insert({
      competitionId: competitionId,
      eventCode: eventCode,
      formatCode: formatCode,

      // These will be filled in by refreshRoundCodes, but
      // add valid value so the UI doesn't crap out.
      roundCode: 'f',
      nthRound: wca.MAX_ROUNDS_PER_EVENT,
    });

    Meteor.call('refreshRoundCodes', competitionId, eventCode);
  },
  addNonEventRound: function(competitionId, round) {
    check(competitionId, String);
    throwIfCannotManageCompetition(this.userId, competitionId);
    Rounds.insert({
      competitionId: competitionId,
      title: round.title,
      startMinutes: round.startMinutes,
      durationMinutes: round.durationMinutes,
    });
  },
  // TODO - i think this would be a bit cleaner if we just had a
  // removeLastRoundForEvent method or something. This might
  // require pulling non wca-event rounds out into a
  // separate collection.
  removeRound: function(roundId) {
    if(!canRemoveRound(this.userId, roundId)) {
      throw new Meteor.Error(400, "Cannot remove round. Make sure it is the last round for this event, and has no times entered.");
    }

    var round = Rounds.findOne({ _id: roundId });
    assert(round); // canRemoveRound checked that roundId is valid

    Rounds.remove({ _id: roundId });
    Groups.remove({ roundId: roundId });

    if(round.eventCode) {
      Meteor.call('refreshRoundCodes', round.competitionId, round.eventCode);

      // Deleting a round affects the set of people who advanced
      // from the previous round =)
      var previousRound = Rounds.findOne({
        competitionId: round.competitionId,
        eventCode: round.eventCode,
        nthRound: round.nthRound - 1,
      }, {
        fields: {
          _id: 1,
        }
      });
      if(previousRound) {
        Meteor.call('recomputeWhoAdvanced', previousRound._id);
      }
    }
  },
  refreshRoundCodes: function(competitionId, eventCode) {
    var rounds = Rounds.find({
      competitionId: competitionId,
      eventCode: eventCode
    }, {
      sort: {
        nthRound: 1,
        softCutoff: 1,
      }
    }).fetch();
    if(rounds.length > wca.MAX_ROUNDS_PER_EVENT) {
      throw new Meteor.Error(400, "Too many rounds");
    }
    rounds.forEach(function(round, index) {
      // Note that we ignore the actual value of nthRound, and instead use the
      // index into rounds as the nthRound. This defragments any missing
      // rounds (not that that's something we expect to ever happen, since
      // removeRound only allows removal of the latest round).
      var supportedRoundsIndex;
      if(index == rounds.length) {
        supportedRoundsIndex = wca.MAX_ROUNDS_PER_EVENT - 1;
      } else {
        supportedRoundsIndex = index;
      }
      var roundCodes = wca.supportedRounds[supportedRoundsIndex];
      assert(roundCodes);
      var roundCode = round.softCutoff ? roundCodes.combined : roundCodes.uncombined;
      Rounds.update({
        _id: round._id,
      }, {
        $set: {
          roundCode: roundCode,
          nthRound: index + 1,
        }
      });
    });
  },
  addOrUpdateGroup: function(newGroup) {
    throwIfCannotManageCompetition(this.userId, newGroup.competitionId);
    var round = Rounds.findOne({ _id: newGroup.roundId });
    if(!round) {
      throw new Meteor.Error("Invalid roundId");
    }
    throwIfCannotManageCompetition(this.userId, round.competitionId);

    var existingGroup = Groups.findOne({
      roundId: newGroup.roundId,
      group: newGroup.group,
    });
    if(existingGroup) {
      log.l0("Clobbering existing group", existingGroup);
      Groups.update({
        _id: existingGroup._id,
      }, {
        $set: newGroup,
      });
    } else {
      Groups.insert(newGroup);
    }
  },
  advanceCompetitorsFromRound: function(competitorCount, roundId) {
    var competitionId = getRoundAttribute(roundId, 'competitionId');
    throwIfCannotManageCompetition(this.userId, competitionId);

    var results = Results.find({
      roundId: roundId,
    }, {
      sort: {
        position: 1,
      },
      fields: {
        userId: 1,
        uniqueName: 1,
      },
    }).fetch();
    if(competitorCount < 0) {
      throw new Meteor.Error(400,
            'Cannot advance a negative number of competitors');
    }
    if(competitorCount > results.length) {
      throw new Meteor.Error(400,
            'Cannot advance more people than there are in round');
    }
    var eventCode = getRoundAttribute(roundId, 'eventCode');
    var nthRound = getRoundAttribute(roundId, 'nthRound');
    var nextRound = Rounds.findOne({
      competitionId: competitionId,
      eventCode: eventCode,
      nthRound: nthRound + 1,
    }, {
      fields: {
        _id: 1,
      }
    });
    if(!nextRound) {
      throw new Meteor.Error(404,
            'No next round found for roundId ' + roundId);
    }

    var desiredUserIds = [];
    var uniqueNameByUserId = {};
    for(var i = 0; i < competitorCount; i++) {
      var result = results[i];
      desiredUserIds.push(result.userId);
      uniqueNameByUserId[result.userId] = result.uniqueName;
    }

    var actualUserIds = _.pluck(Results.find({
      roundId: nextRound._id,
    }, {
      fields: {
        userId: 1,
      }
    }).fetch(), 'userId');

    var userIdsToRemove = _.difference(actualUserIds, desiredUserIds);
    var userIdsToAdd = _.difference(desiredUserIds, actualUserIds);

    // We're ready to actually advance competitors to the next round!

    // First, remove any results that are currently in the next round that
    // shouldn't be.
    _.each(userIdsToRemove, function(userId) {
      Results.remove({
        competitionId: competitionId,
        roundId: nextRound._id,
        userId: userId,
      });
    });

    // Now copy competitorCount results from the current round to the next
    // round.
    _.each(userIdsToAdd, function(userId) {
      Results.insert({
        competitionId: competitionId,
        roundId: nextRound._id,
        userId: userId,
        uniqueName: uniqueNameByUserId[userId],
      });
    });
    Meteor.call('recomputeWhoAdvanced', roundId);
  },
  checkInRegistration: function(registrationId) {
    // This method is called to either check-in a competitor for the first time,
    // or to update their check-in because the set of events they are registered for
    // changed. The latter may involve deleting results with data entered, so
    // be sure before you call this method =).
    var registration = Registrations.findOne({
      _id: registrationId,
    }, {
      fields: {
        competitionId: 1,
        userId: 1,
        uniqueName: 1,
        registeredEvents: 1,
        checkedInEvents: 1,
      }
    });
    throwIfCannotManageCompetition(this.userId, registration.competitionId);

    function getFirstRoundForEvent(eventCode) {
      var round = Rounds.findOne({
        competitionId: registration.competitionId,
        eventCode: eventCode,
        nthRound: 1,
      }, {
        fields: {
          _id: 1,
        }
      });
      return round;
    }
    var toUnCheckInTo = _.difference(registration.checkedInEvents, registration.registeredEvents);
    toUnCheckInTo.forEach(function(eventCode) {
      var round = getFirstRoundForEvent(eventCode);
      assert(round);
      Results.remove({
        roundId: round._id,
        userId: registration.userId,
      });
    });

    var toCheckInTo = _.difference(registration.registeredEvents, registration.checkedInEvents);
    toCheckInTo.forEach(function(eventCode) {
      var round = getFirstRoundForEvent(eventCode);
      assert(round);
      Results.insert({
        competitionId: registration.competitionId,
        roundId: round._id,
        userId: registration.userId,
        uniqueName: registration.uniqueName,
      });
    });
    Registrations.update({
      _id: registration._id,
    }, {
      $set: {
        checkedInEvents: registration.registeredEvents,
      }
    });
  },
});

if(Meteor.isServer) {
  var child_process = Npm.require('child_process');
  var path = Npm.require("path");
  var fs = Npm.require('fs');
  var os = Npm.require('os');
  var mkdirp = Meteor.npmRequire('mkdirp');

  var zipIdToFilename = function(zipId, userId) {
    var tmpdir = os.tmpdir();
    var filename = path.join(tmpdir, "tnoodlezips", userId, zipId + ".zip");
    return filename;
  };

  Meteor.methods({
    requestVerificationEmail: function() {
      Accounts.sendVerificationEmail(this.userId);
    },
    uploadTNoodleZip: function(zipData) {
      // TODO - this is pretty janky. What if the folder we try to create
      // exists, but isn't a folder? Permissions could also screw us up.
      // Ideally we would just decompress the zip file client side, but
      // there aren't any libraries for that yet.
      var id = Date.now();
      var zipFilename = zipIdToFilename(id, this.userId);
      mkdirp.sync(path.join(zipFilename, ".."));
      fs.writeFileSync(zipFilename, zipData, 'binary');
      return id;
    },
    unzipTNoodleZip: function(zipId, pw) {
      var args = [];
      args.push('-p'); // extract to stdout

      // If you don't pass -P to unzip and try to unzip a password protected
      // zip file, it will prompt you for a password, causing the unzip process
      // to hang. By always passing something to -P, we will never get prompted
      // for a password, instead unzip may just fail to extract.
      args.push('-P');
      args.push(pw || "");

      var zipFilename = zipIdToFilename(zipId, this.userId);
      args.push(zipFilename);
      args.push('*.json'); // there should be exactly one json file in the zip
      function unzipAsync(cb) {
        child_process.execFile('unzip', args, function(error, stdout, stderr) {
          if(error) {
            // Error code 82 indicates bad password
            // See http://www.info-zip.org/FAQ.html
            if(error.code == 82) {
              cb("invalid-password");
            } else {
              cb("Unzip exited with error code " + error.code);
            }
          } else {
            cb(null, stdout);
          }
        });
      }
      var unzipSync = Meteor.wrapAsync(unzipAsync);
      try {
        var jsonStr = unzipSync();
        return jsonStr;
      } catch(e) {
        throw new Meteor.Error('unzip', e.message);
      }
    },
    uploadCompetition: function(wcaCompetition) {
      throwIfNotVerifiedUser(this.userId);

      var competitionId = Competitions.insert({
        competitionName: wcaCompetition.competitionId,
        // We do not let people set the WCA id for a competition,
        // only site admins can do that.
        //wcaCompetitionId: wcaCompetition.competitionId,
        organizers: [ this.userId ],
        listed: false,
        startDate: new Date(),
      });
      competition = Competitions.findOne({ _id: competitionId });
      assert(competition);

      var userInfoByJsonId = {};
      var userInfoByUniqueName = {};
      wcaCompetition.persons.forEach(function(wcaPerson, i) {
        var dobMoment = moment.utc(wcaPerson.dob);
        var userProfile = {
          name: wcaPerson.name,
          wcaId: wcaPerson.wcaId,
          countryId: wcaPerson.countryId,
          gender: wcaPerson.gender,
          dob: dobMoment.toDate(),
        };

        var user, email, userId;
        if(wcaPerson.wcaId) {
          // Check for user with WCA id and if user doesn't exist we create one
          email = userProfile.wcaId + "@ccm.com";
          user = Meteor.users.findOne({ "emails.address": email });
          if(!user) {
            userId = Accounts.createUser({
              email: email,
              password: '',
              profile: userProfile
            });
            user = Meteor.users.findOne({ _id: userId });
            assert(user);
          }
        } else {
          // Create user if user doesn't exist and wcaId doesn't exist or look for one first
          email = (userProfile.name.replace(/\s/g, "_") + i) + "@ccm.com";
          user = Meteor.users.findOne({ "emails.address": email });
          if(!user) {
            userId = Accounts.createUser({
              email: email,
              password: '',
              profile: userProfile
            });
            user = Meteor.users.findOne({ _id: userId });
            assert(user);
          }
        }

        // Pick a uniqueName for this competitor
        var suffix = 0;
        var uniqueName;
        var uniqueNameTaken; // grrr...jshint
        do {
          suffix++;
          uniqueName = user.profile.name;
          if(suffix > 1) {
            uniqueName += " " + suffix;
          }
          uniqueNameTaken = !!userInfoByUniqueName[uniqueName];
        } while(uniqueNameTaken);

        var userInfo = {
          jsonId: wcaPerson.id,
          userId: user._id,
          uniqueName: uniqueName,
          registeredEvents: {},
          checkedInEvents: {},
        };
        assert(!userInfoByJsonId[userInfo.jsonId]);
        userInfoByJsonId[userInfo.jsonId] = userInfo;
        assert(!userInfoByUniqueName[userInfo.uniqueName]);
        userInfoByUniqueName[userInfo.uniqueName] = userInfo;
      });

      // Add all the rounds, results, and registrations for this competition.
      // First remove any old rounds, results, registrations, and groups for this competition.
      Rounds.remove({ competitionId: competition._id });
      Results.remove({ competitionId: competition._id });
      Groups.remove({ competitionId: competition._id });
      Registrations.remove({ competitionId: competition._id });

      // Add data for rounds, results, and groups
      wcaCompetition.events.forEach(function(wcaEvent) {
        log.l0("adding data for " + wcaEvent.eventId);
        // Sort rounds according to the order in which they must have occurred.
        wcaEvent.rounds.sort(function(r1, r2) {
          return ( wca.roundByCode[r1.roundId].supportedRoundIndex -
                   wca.roundByCode[r2.roundId].supportedRoundIndex );
        });
        var newRoundIds = [];
        wcaEvent.rounds.forEach(function(wcaRound, nthRound) {
          var roundInfo = wca.roundByCode[wcaRound.roundId];
          var roundId = Rounds.insert({
            nthRound: nthRound + 1,
            competitionId: competition._id,
            eventCode: wcaEvent.eventId,
            roundCode: wcaRound.roundId,
            formatCode: wcaRound.formatId,
            status: wca.roundStatuses.closed,
          });
          newRoundIds.push(roundId);

          wcaRound.results.forEach(function(wcaResult) {
            // wcaResult.personId refers to the personId in the wca json
            var userInfo = userInfoByJsonId[wcaResult.personId];
            userInfo.registeredEvents[wcaEvent.eventId] = true;
            userInfo.checkedInEvents[wcaEvent.eventId] = true;

            var solves = _.map(wcaResult.results, function(wcaValue) {
              return wca.valueToSolveTime(wcaValue, wcaEvent.eventId);
            });
            var id = Results.insert({
              competitionId: competition._id,
              roundId: roundId,
              userId: userInfo.userId,
              uniqueName: userInfo.uniqueName,
              position: wcaResult.position,
              solves: solves,
              best: wca.valueToSolveTime(wcaResult.best, wcaEvent.eventId),
              average: wca.valueToSolveTime(wcaResult.average, wcaEvent.eventId),
            }, {
              // meteor-collection2 is *killing* us here when we are inserting
              // a bunch of stuff at once. Turning off all the validation it
              // does for us gives a huge speed boost.
              validate: false,
              filter: false,
              autoConvert: false,
              removeEmptyStrings: false,
              getAutoValues: false,
            });
          });

          wcaRound.groups.forEach(function(wcaGroup) {
            Groups.insert({
              competitionId: competition._id,
              roundId: roundId,
              group: wcaGroup.group,
              scrambles: wcaGroup.scrambles,
              extraScrambles: wcaGroup.extraScrambles,
              scrambleProgram: wcaCompetition.scrambleProgram
            });
          });
        });

        newRoundIds.forEach(function(roundId) {
          Meteor.call('recomputeWhoAdvanced', roundId);
        });

        log.l0("finished adding data for " + wcaEvent.eventId);
      });

      // Add registrations for people as documents in the registrations collection.
      // Each document in registrations contains a competitionId and userId field
      // whose values are the _id values of documents in the Competitions and Users
      // collections.
      for(var jsonId in userInfoByJsonId) {
        if(userInfoByJsonId.hasOwnProperty(jsonId)) {
          var userInfo = userInfoByJsonId[jsonId];
          Registrations.insert({
            competitionId: competition._id,
            userId: userInfo.userId,
            uniqueName: userInfo.uniqueName,
            registeredEvents: _.keys(userInfo.registeredEvents),
            checkedInEvents: _.keys(userInfo.checkedInEvents),
          });
        }
      }

      return competition._id;
    },
    recomputeWhoAdvanced: function(roundId) {
      check(roundId, String);

      var round = Rounds.findOne({ _id: roundId });
      var nextRound = Rounds.findOne({
        competitionId: round.competitionId,
        eventCode: round.eventCode,
        nthRound: round.nthRound + 1,
      }, {
        fields: {
          size: 1,
        }
      });

      var results = Results.find({
        roundId: roundId,
      }, {
        fields: {
          _id: 1,
          userId: 1,
        }
      });

      results.forEach(function(result) {
        var advanced;
        if(nextRound) {
          // If the userId for this result is present in the next round,
          // then they advanced!
          advanced = !!Results.findOne({
            roundId: nextRound._id,
            userId: result.userId
          });
        } else {
          // If there is no next round, then this result cannot possibly have
          // advanced.
          advanced = false;
        }
        Results.update({
          _id: result._id,
        }, {
          $set: {
            advanced: advanced,
          }
        });
      });
    },
  });
}
