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

var throwIfNotSiteAdmin = function(userId) {
  if(!userId) {
    throw new Meteor.Error(401, "Must log in");
  }

  var user = Meteor.users.findOne({ _id: userId });
  if(!user.siteAdmin) {
    throw new Meteor.Error(401, "Must be a site admin");
  }
};

Meteor.methods({
  createCompetition: function(competitionName) {
    check(competitionName, String);
    if(competitionName.trim().length === 0) {
      throw new Meteor.Error(400, "Competition name must be nonempty");
    }
    throwIfNotVerifiedUser(this.userId);

    var user = Meteor.users.findOne({ _id: this.userId });
    if(!user.profile) {
      throw new Meteor.Error(400, "Must set up user profile");
    }
    if(!user.profile.name) {
      throw new Meteor.Error(400, "Name must be nonempty");
    }
    if(!user.profile.dob) {
      throw new Meteor.Error(400, "DOB must be nonemtpy");
    }
    if(!user.profile.countryId) {
      throw new Meteor.Error(400, "Country must be nonemtpy");
    }
    if(!user.profile.gender) {
      throw new Meteor.Error(400, "Gender must be nonemtpy");
    }

    var uniqueName = user.profile.name;

    var competitionId = Competitions.insert({
      competitionName: competitionName,
      listed: false,
      startDate: new Date(),
    });

    Registrations.insert({
      competitionId: competitionId,
      userId: this.userId,
      uniqueName: uniqueName,
      registeredEvents: [],
      organizer: true,
      wcaId: user.profile.wcaId,
      countryId: user.profile.countryId,
      gender: user.profile.gender,
      dob: user.profile.dob,
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
    return Rounds.insert({
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
    throwIfCannotManageCompetition(this.userId, competitionId);
    check(eventCode, String);

    var rounds = Rounds.find({
      competitionId: competitionId,
      eventCode: eventCode
    }, {
      sort: {
        nthRound: 1,
      },
      fields: {
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
      if(index == rounds.length - 1) {
        // The last round for an event is always treated as a final round.
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
    if(newGroup.competitionId !== round.competitionId) {
      throw new Meteor.Error("Group's competitionId does not match round's competitionId");
    }

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
  advanceParticipantsFromRound: function(participantCount, roundId) {
    var competitionId = getRoundAttribute(roundId, 'competitionId');
    throwIfCannotManageCompetition(this.userId, competitionId);

    var results = Results.find({
      roundId: roundId,
    }, {
      sort: {
        position: 1,
      },
      fields: {
        registrationId: 1,
      },
    }).fetch();
    if(participantCount < 0) {
      throw new Meteor.Error(400,
            'Cannot advance a negative number of competitors');
    }
    if(participantCount > results.length) {
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

    var desiredRegistrationIds = [];
    for(var i = 0; i < participantCount; i++) {
      var result = results[i];
      desiredRegistrationIds.push(result.registrationId);
    }

    var actualRegistrationIds = _.pluck(Results.find({
      roundId: nextRound._id,
    }, {
      fields: {
        registrationId: 1,
      }
    }).fetch(), 'registrationId');

    var registrationIdsToRemove = _.difference(actualRegistrationIds, desiredRegistrationIds);
    var registrationIdsToAdd = _.difference(desiredRegistrationIds, actualRegistrationIds);

    // We're ready to actually advance participants to the next round!

    // First, remove any results that are currently in the next round that
    // shouldn't be.
    _.each(registrationIdsToRemove, function(registrationId) {
      Results.remove({
        competitionId: competitionId,
        roundId: nextRound._id,
        registrationId: registrationId,
      });
    });

    // Now copy participantCount results from the current round to the next
    // round.
    _.each(registrationIdsToAdd, function(registrationId) {
      Results.insert({
        competitionId: competitionId,
        roundId: nextRound._id,
        registrationId: registrationId,
      });
    });
    Meteor.call('recomputeWhoAdvanced', roundId);
  },
  checkInRegistration: function(registrationId) {
    // This method is called to either check-in a participant for the first time,
    // or to update their check-in because the set of events they are registered for
    // changed. The latter may involve deleting results with data entered, so
    // be sure before you call this method =).
    var registration = Registrations.findOne({
      _id: registrationId,
    }, {
      fields: {
        competitionId: 1,
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
        registrationId: registration._id,
      });
    });

    var toCheckInTo = _.difference(registration.registeredEvents, registration.checkedInEvents);
    toCheckInTo.forEach(function(eventCode) {
      var round = getFirstRoundForEvent(eventCode);
      assert(round);
      Results.insert({
        competitionId: registration.competitionId,
        roundId: round._id,
        registrationId: registration._id,
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
  addSiteAdmin: function(newSiteAdminUserId) {
    var siteAdmin = getUserAttribute(this.userId, 'siteAdmin');
    if(!siteAdmin) {
      throw new Meteor.Error(403, "Must be a site admin");
    }

    Meteor.users.update({
      _id: newSiteAdminUserId,
    }, {
      $set: {
        siteAdmin: true,
      }
    });
  },
  removeSiteAdmin: function(siteAdminToRemoveUserId) {
    var siteAdmin = getUserAttribute(this.userId, 'siteAdmin');
    if(!siteAdmin) {
      throw new Meteor.Error(403, "Must be a site admin");
    }

    // Prevent a user from accidentally depromoting themselves.
    if(this.userId == siteAdminToRemoveUserId) {
      throw new Meteor.Error(403, "Site admins may not unresign themselves!");
    }

    Meteor.users.update({
      _id: siteAdminToRemoveUserId,
    }, {
      $set: {
        siteAdmin: false,
      }
    });
  },
  setSolveTime: function(resultId, solveIndex, solveTime) {
    var result = Results.findOne({
      _id: resultId,
    }, {
      fields: {
        competitionId: 1,
        roundId: 1,
        solves: 1,
      }
    });
    if(!result) {
      throw new Meteor.Error(404, "Result not found");
    }
    throwIfCannotManageCompetition(this.userId, result.competitionId);

    var round = Rounds.findOne({
      _id: result.roundId,
    }, {
      fields: {
        formatCode: 1,
        roundCode: 1,
      }
    });
    var roundFormat = wca.formatByCode[round.formatCode];

    check(solveIndex, Match.Integer);
    if(solveIndex < 0 || solveIndex >= roundFormat.count) {
      throw new Meteor.Error(400, "Invalid solve index for round");
    }
    result.solves[solveIndex] = solveTime;

    var $set = {
      solves: result.solves
    };

    var statistics = wca.computeSolvesStatistics(result.solves, round.formatCode, round.roundCode);
    _.extend($set, statistics);

    Results.update({ _id: resultId }, { $set: $set });
    if(!this.isSimulation) {
      RoundSorter.addRoundToSort(result.roundId);
    }
  },
});

/*
 * RoundSorter.addRoundToSort(roundId) guarantees that a round will
 * be sorted within some COALESCE_MILLIS (the implementation is free
 * to sort sooner if the system is not busy). Multiple calls with
 * the same round will coalesce, but not push back our original
 * guarantee.
 * TODO - i don't know enough about node-fibers to think about what exactly this code will do when multiple DDP connections call it simultaneously.
 */
var RoundSorter = {
  COALESCE_MILLIS: 500,
  roundsToSortById: {},
  addRoundToSort: function(roundId) {
    if(!this.roundsToSortById[roundId]) {
      this.roundsToSortById[roundId] = Meteor.setTimeout(this._handleSortTimer.bind(this, roundId), this.COALESCE_MILLIS);
    }
  },
  _handleSortTimer: function(roundId) {
    delete this.roundsToSortById[roundId];

    var $sort = {};

    var roundFormat = wca.formatByCode[getRoundAttribute(roundId, 'formatCode')];
    if(roundFormat.sortBy == "best") {
      $sort.sortableBestValue = 1;
    } else if(roundFormat.sortBy == "average") {
      $sort.sortableAverageValue = 1;
      $sort.sortableBestValue = 1;
    } else {
      // uh-oh, unrecognized roundFormat, give up
      assert(false);
    }

    var results = Results.find({ roundId: roundId }, { $sort: $sort }).fetch();
    var position = 0;
    results.forEach(function(result, i) {
      var tied = false;
      var previousResult = results[i - 1];
      if(previousResult) {
        var tiedBest = wca.compareSolveTimes(result.solves[result.bestIndex], previousResult.solves[previousResult.bestIndex]) === 0;
        if(roundFormat.sortBy == "average") {
          var tiedAverage = wca.compareSolveTimes(result.average, previousResult.average) === 0;
          if(tiedAverage && tiedBest) {
            tied = true;
          }
        } else if(roundFormat.sortBy == "best") {
          if(tiedBest) {
            tied = true;
          }
        } else {
          // uh-oh, unrecognized roundFormat, give up
          assert(false);
        }
      }
      if(!tied) {
        position++;
      }
      Results.update({ _id: result._id }, { $set: { position: position } });
    });
  },
};

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
      throwIfNotSiteAdmin(this.userId);

      var competitionName = wcaCompetition.competitionId;
      var newCompetition = {
        competitionName: competitionName,
        listed: false,
        startDate: new Date(),
      };

      var wcaCompetitionId = wcaCompetition.competitionId;
      var existingCompetition = Competitions.findOne({ wcaCompetitionId: wcaCompetitionId });
      // Only set a wca competition id if a competition does not yet exist
      // with this wca competition id.
      if(!existingCompetition) {
        newCompetition.wcaCompetitionId = wcaCompetitionId;
      }
      var competitionId = Competitions.insert(newCompetition);
      var competition = Competitions.findOne({ _id: competitionId });
      assert(competition);

      var registrationByWcaJsonId = {};
      var uniqueNames = {};
      wcaCompetition.persons.forEach(function(wcaPerson, i) {
        // Pick a uniqueName for this participant
        var suffix = 0;
        var uniqueName;
        var uniqueNameTaken; // grrr...jshint
        do {
          suffix++;
          uniqueName = wcaPerson.name;
          if(suffix > 1) {
            uniqueName += " " + suffix;
          }
          uniqueNameTaken = !!uniqueNames[uniqueName];
        } while(uniqueNameTaken);
        assert(!uniqueNames[uniqueName]);
        uniqueNames[uniqueName] = true;

        var dobMoment = moment.utc(wcaPerson.dob);
        var registrationId = Registrations.insert({
          competitionId: competition._id,
          uniqueName: uniqueName,
          wcaId: wcaPerson.wcaId,
          countryId: wcaPerson.countryId,
          gender: wcaPerson.gender,
          dob: dobMoment.toDate(),
          registeredEvents: [],
          checkedInEvents: [],
        });
        var registration = Registrations.findOne({ _id: registrationId });

        assert(!registrationByWcaJsonId[wcaPerson.id]);
        registrationByWcaJsonId[wcaPerson.id] = registration;
      });

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
          log.l1("adding data for round " + nthRound);
          var roundCode = wcaRound.roundId;
          var roundFormatCode = wcaRound.formatId;
          var roundId = Rounds.insert({
            nthRound: nthRound + 1,
            competitionId: competition._id,
            eventCode: wcaEvent.eventId,
            roundCode: roundCode,
            formatCode: roundFormatCode,
            status: wca.roundStatuses.closed,
          });
          newRoundIds.push(roundId);

          var softCutoff = null;
          wcaRound.results.forEach(function(wcaResult) {
            log.l2("adding data for personId " + wcaResult.personId);
            // wcaResult.personId refers to the personId in the wca json
            var registration = registrationByWcaJsonId[wcaResult.personId];
            registration.registeredEvents[wcaEvent.eventId] = true;
            registration.checkedInEvents[wcaEvent.eventId] = true;

            var solves = _.map(wcaResult.results, function(wcaValue) {
              return wca.wcaValueToSolveTime(wcaValue, wcaEvent.eventId);
            });
            if(!solves[solves.length - 1]) {
              // We're missing a solve, so this must be a combined round
              // and this participant didn't make the soft cutoff.
              var roundInfo = wca.roundByCode[roundCode];
              assert(roundInfo.combined);
              var lastSolveIndex = -1;
              var minSolveTime = null;
              while(solves[lastSolveIndex + 1] && solves[lastSolveIndex + 1]) {
                lastSolveIndex++;
                var lastSolveTime = solves[lastSolveIndex];
                if(!minSolveTime || wca.compareSolveTimes(lastSolveTime, minSolveTime) < 0) {
                  minSolveTime = lastSolveTime;
                }
              }
              // We always import combined rounds as if they have a
              // "soft cutoff in N" cutoff (this doesn't handle
              // cumulative cutoffs).
              var softCutoffFormatCode = "" + (lastSolveIndex + 1);
              if(softCutoff) {
                assert(softCutoff.formatCode === softCutoffFormatCode);
                softCutoff.time = wca.minSolveTime(softCutoff.time, minSolveTime);
              } else {
                softCutoff = {
                  formatCode: softCutoffFormatCode,
                  time: minSolveTime,
                };
              }
            }
            var result = {
              competitionId: competition._id,
              roundId: roundId,
              registrationId: registration._id,
              position: wcaResult.position,
              solves: solves,
            };
            var statistics = wca.computeSolvesStatistics(solves, roundFormatCode);
            _.extend(result, statistics);
            var id = Results.insert(
              result, {
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

          if(softCutoff) {
            // softCutoff.time is the best time achieved by the people who didn't
            // make the soft cutoff, so decrement it by the tiniest amount before
            // saving it.
            if(softCutoff.time.millis) {
              softCutoff.time.millis -= 1;
              softCutoff.time.decimals = 3;
            } else {
              softCutoff.time.moveCount -= 1;
            }
            log.l0("Setting soft cutoff for", wcaEvent.eventId, "round", nthRound + 1, "to", softCutoff);
            Rounds.update({
              _id: roundId,
            }, {
              $set: {
                softCutoff: softCutoff
              }
            });
          }

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

      // Update the registrations to reflect the events they signed up for
      // and checked in for.
      for(var jsonId in registrationByWcaJsonId) {
        if(registrationByWcaJsonId.hasOwnProperty(jsonId)) {
          var registration = registrationByWcaJsonId[jsonId];
          var registrationId = Registrations.update({
            _id: registration._id,
          }, {
            $set: {
              registeredEvents: _.keys(registration.registeredEvents),
              checkedInEvents: _.keys(registration.checkedInEvents),
            }
          });
        }
      }

      return competition.wcaCompetitionId || competition._id;
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
          registrationId: 1,
        }
      });

      results.forEach(function(result) {
        var advanced;
        if(nextRound) {
          // If the registrationId for this result is present in the next round,
          // then they advanced!
          advanced = !!Results.findOne({
            roundId: nextRound._id,
            registrationId: result.registrationId,
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
