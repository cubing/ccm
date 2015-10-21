const log = logging.handle("methods");

let throwIfNotVerifiedUser = function(userId) {
  if(!userId) {
    throw new Meteor.Error(401, "Must log in");
  }

  let user = Meteor.users.findOne(userId);
  if(!user.emails[0].verified) {
    throw new Meteor.Error(401, "Must verify email");
  }
};

let throwIfNotSiteAdmin = function(userId) {
  if(!userId) {
    throw new Meteor.Error(401, "Must log in");
  }

  let user = Meteor.users.findOne(userId);
  if(!user.siteAdmin) {
    throw new Meteor.Error(401, "Must be a site admin");
  }
};

setSolveTime = function(resultId, solveIndex, solveTime) {
  // If the client didn't send us a timestamp, cons one up here.
  if(solveTime && !solveTime.updatedAt) {
    solveTime.updatedAt = new Date();
  }
  let result = Results.findOne(resultId, {
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

  let round = Rounds.findOne(result.roundId);
  if(!round) {
    throw new Meteor.Error(404, "Round not found");
  }

  check(solveIndex, Match.Integer);
  if(solveIndex < 0) {
    throw new Meteor.Error(400, "Cannot have a negative solve index");
  }
  if(solveIndex >= result.solves.length) {
    // If we add this solveTime, we'll be expanding the solves list.
    // We only want to let the user expand the solves list so long as they
    // stay within the round solve limit.
    if(solveIndex >= round.format().count) {
      throw new Meteor.Error(400, `Round ${round._id} does not allow a solve at index ${solveIndex}`);
    }
  }
  result.solves[solveIndex] = solveTime;

  // Trim null solves from the end of the solves array until it fits.
  while(result.solves.length > 0 && !result.solves[result.solves.length - 1]) {
    result.solves.pop();
  }

  let $set = {
    solves: result.solves
  };

  let statistics = wca.computeSolvesStatistics(result.solves, round.formatCode, round.roundCode());
  _.extend($set, statistics);

  Results.update(resultId, { $set: $set });
  RoundSorter.addRoundToSort(result.roundId);
};

let stripTimeFromDate = function(date) {
  return moment(date).utc().startOf('day').toDate();
};

Meteor.methods({
  createCompetition: function(competitionName, startDate) {
    check(competitionName, String);
    startDate = stripTimeFromDate(startDate);
    if(competitionName.trim().length === 0) {
      throw new Meteor.Error(400, "Competition name must be nonempty");
    }
    throwIfNotVerifiedUser(this.userId);

    let user = Meteor.users.findOne(this.userId);
    let uniqueName = user.profile.name;

    let competitionId = Competitions.insert({
      competitionName: competitionName,
      listed: false,
      startDate: startDate,
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
    [Rounds, RoundProgresses, Results, Groups, Registrations, ScheduleEvents].forEach(collection => {
      collection.remove({ competitionId: competitionId });
    });
  },
  addRound: function(competitionId, eventCode) {
    if(!canAddRound(this.userId, competitionId, eventCode)) {
      throw new Meteor.Error(400, "Cannot add another round");
    }

    // TODO - what happens if multiple users call this method at the same time?
    // It looks like meteor makes an effort to serve methods from a single user
    // in order, but I don't know if there is any guarantee of such across users
    // See http://docs.meteor.com/#method_unblock.

    let newCount = Rounds.find({competitionId: competitionId, eventCode: eventCode}).count() + 1;
    let newRoundId = Rounds.insert({
      competitionId: competitionId,
      eventCode: eventCode,
      formatCode: wca.formatsByEventCode[eventCode][0],
      nthRound: newCount,
      totalRounds: newCount,
    });

    Rounds.update(
      { competitionId: competitionId, eventCode: eventCode },
      { $set: {totalRounds: newCount } },
      { multi: true }
    );

    RoundProgresses.insert({
      roundId: newRoundId,
      competitionId: competitionId,
    });
  },
  removeLastRound: function(competitionId, eventCode) {
    let roundId = getLastRoundIdForEvent(competitionId, eventCode);
    if(!roundId || !canRemoveRound(this.userId, roundId)) {
      throw new Meteor.Error(400, "Cannot remove round.");
    }

    let deadRound = Rounds.findOne(roundId);
    assert(deadRound);

    Rounds.remove(roundId);
    [RoundProgresses, Results, Groups, ScheduleEvents].forEach(collection => {
      collection.remove({ roundId: roundId });
    });

    Rounds.update(
      { competitionId: competitionId, eventCode: eventCode },
      { $set: { totalRounds: deadRound.totalRounds - 1 } },
      { multi: true }
    );

    // Deleting a round affects the set of people who advanced
    // from the previous round =)
    let previousRound = deadRound.getPreviousRound();
    if(previousRound) {
      Meteor.call('recomputeWhoAdvancedAndPreviousPosition', previousRound._id);
    }
  },
  addScheduleEvent: function(competitionId, eventData, roundId) {
    check(competitionId, String);
    throwIfCannotManageCompetition(this.userId, competitionId);

    let round = Rounds.findOne(roundId); // Will not exist for some events

    if(!round && roundId) {
      throw new Meteor.Error("Invalid roundId: '" + roundId +"'");
    }

    return ScheduleEvents.insert({
      competitionId: competitionId,
      roundId: (round ? round._id : null),
      title: (round ? round.displayTitle() : eventData.title),
      nthDay: eventData.nthDay,
      startMinutes: eventData.startMinutes,
      durationMinutes: eventData.durationMinutes,
    });
  },
  removeScheduleEvent: function(scheduleEventId) {
    let event = ScheduleEvents.findOne(scheduleEventId);
    throwIfCannotManageCompetition(this.userId, event.competitionId);
    ScheduleEvents.remove(scheduleEventId);
  },
  addOrUpdateGroup: function(newGroup) {
    throwIfCannotManageCompetition(this.userId, newGroup.competitionId);
    let round = Rounds.findOne(newGroup.roundId);
    if(!round) {
      throw new Meteor.Error("Invalid roundId: '" + newGroup.roundId +"'");
    }
    if(newGroup.competitionId !== round.competitionId) {
      throw new Meteor.Error("Group's competitionId does not match round's competitionId");
    }

    let existingGroup = Groups.findOne({
      roundId: newGroup.roundId,
      group: newGroup.group,
    });
    if(existingGroup) {
      log.l0("Clobbering existing group", existingGroup);
      Groups.update(existingGroup._id, { $set: newGroup });
    } else {
      Groups.insert(newGroup);
    }
  },
  advanceParticipantsFromRound: function(participantsToAdvance, roundId) {
    let round = Rounds.findOne(roundId);
    throwIfCannotManageCompetition(this.userId, round.competitionId);

    let results = Results.find({ roundId: roundId }, { sort: { position: 1 } }).fetch();
    if(participantsToAdvance < 0) {
      throw new Meteor.Error(400, 'Cannot advance a negative number of competitors');
    }
    if(participantsToAdvance > results.length) {
      throw new Meteor.Error(400, 'Cannot advance more people than there are in round');
    }
    let nextRound = round.getNextRound();
    if(!nextRound) {
      throw new Meteor.Error(404, 'No next round found for roundId ' + roundId);
    }

    let desiredRegistrationIds = [];
    for(let i = 0; i < participantsToAdvance; i++) {
      let result = results[i];
      desiredRegistrationIds.push(result.registrationId);
    }

    let actualRegistrationIds = _.pluck(Results.find({ roundId: nextRound._id }, { fields: { registrationId: 1 } }).fetch(), 'registrationId');

    let registrationIdsToRemove = _.difference(actualRegistrationIds, desiredRegistrationIds);
    let registrationIdsToAdd = _.difference(desiredRegistrationIds, actualRegistrationIds);

    // Before we actually advance participants to the next round, lets check that it
    // wouldn't require deleting any Results with data entered.
    let resultsToRemoveWithSolves = [];
    registrationIdsToRemove.forEach(registrationId => {
      let result = Results.findOne({
        competitionId: round.competitionId,
        roundId: nextRound._id,
        registrationId: registrationId,
      });
      if(result && result.solves && result.solves.length > 0) {
        let registration = Registrations.findOne(registrationId);
        resultsToRemoveWithSolves.push({ result, registration });
      }
    });
    if(resultsToRemoveWithSolves.length > 0) {
      let names = resultsToRemoveWithSolves.map(({result, registration}) => registration.uniqueName).join(", ");
      throw new Meteor.Error(400, `Advancing ${participantsToAdvance} people would require removing ${resultsToRemoveWithSolves.length} results with solves entered already. Please delete the solves for ${names} and try again.`);
    }

    // We're ready to actually advance participants to the next round!

    // First, remove any results that are currently in the next round that
    // shouldn't be.
    registrationIdsToRemove.forEach(registrationId => {
      Results.remove({
        competitionId: round.competitionId,
        roundId: nextRound._id,
        registrationId: registrationId,
      });
    });

    // Now copy participantsToAdvance results from the current round to the next
    // round.
    registrationIdsToAdd.forEach(registrationId => {
      Results.insert({
        competitionId: round.competitionId,
        roundId: nextRound._id,
        registrationId: registrationId,
      });
    });

    Meteor.call('recomputeWhoAdvancedAndPreviousPosition', roundId);

    // Advancing people to nextRound means we need to update positions
    // and its progress.
    RoundSorter.addRoundToSort(nextRound);
  },
  addSiteAdmin: function(newSiteAdminUserId) {
    if(!isSiteAdmin(this.userId)) {
      throw new Meteor.Error(403, "Must be a site admin");
    }

    Meteor.users.update(newSiteAdminUserId, { $set: { siteAdmin: true } });
  },
  removeSiteAdmin: function(siteAdminToRemoveUserId) {
    if(!isSiteAdmin(this.userId)) {
      throw new Meteor.Error(403, "Must be a site admin");
    }

    // Prevent a user from accidentally depromoting themselves.
    if(this.userId == siteAdminToRemoveUserId) {
      throw new Meteor.Error(403, "Site admins may not unresign themselves!");
    }

    Meteor.users.update(siteAdminToRemoveUserId, { $set: { siteAdmin: false } });
  },
  setSolveTime: setSolveTime,
  setRoundSoftCutoff: function(roundId, softCutoff) {
    let round = Rounds.findOne(roundId, {
      fields: {
        competitionId: 1,
        eventCode: 1,
      }
    });
    if(!round) {
      throw new Meteor.Error(404, "Round not found");
    }
    throwIfCannotManageCompetition(this.userId, round.competitionId);

    let toSet = {};
    if(softCutoff) {
      toSet.$set = {
        // Explicitly listing all the relevant fields in SolveTime as a workaround for
        //  https://github.com/aldeed/meteor-simple-schema/issues/202
        //softCutoff: {
        //  time: time,
        //  formatCode: formatCode,
        //}
        'softCutoff.time.millis': softCutoff.time.millis,
        'softCutoff.time.decimals': softCutoff.time.decimals,
        'softCutoff.time.penalties': softCutoff.time.penalties,
        'softCutoff.formatCode': softCutoff.formatCode,
      };
    } else {
      toSet.$unset = {
        softCutoff: 1,
      };
    }

    Rounds.update(roundId, toSet);

    // Changing the softCutoff for a round could affect the rounds progress,
    // so queue up a recomputation of that.
    RoundSorter.addRoundToSort(roundId);
  },
  toggleEventRegistration: function(registrationId, eventCode) {
    let registration = Registrations.findOne(registrationId);
    throwIfCannotManageCompetition(this.userId, registration.competitionId);
    let registeredForEvent = _.contains(registration.registeredEvents, eventCode);
    let update;
    if(registeredForEvent) {
      // if registered, then unregister
      update = {
        $pull: {
          registeredEvents: eventCode
        }
      };
      let index = registration.registeredEvents.indexOf(eventCode);
      if(index >= 0) {
        registration.registeredEvents.splice(index, 1);
      }
    } else {
      // if not registered, then register
      update = {
        $addToSet: {
          registeredEvents: eventCode
        }
      };
      registration.registeredEvents.push(eventCode);
    }
    // If this registrant is already checked in, then we need to synchronize the
    // set of first rounds they have Results for. This may not be possible if it
    // requires deleting a Result that has data.
    if(registration.checkedIn) {
      registration.checkIn(true);
    }

    // Wait to actually update update the Registration until checkIn
    // succeeds (it will throw an exception if we're not allowed to remove the
    // registrants Result).
    Registrations.update(registration._id, update);
  },
  toggleGroupOpen: function(groupId) {
    let group = Groups.findOne(groupId);
    if(!group) {
      throw new Meteor.Error(404, "Group not found");
    }
    let round = Rounds.findOne(group.roundId);
    if(!round) {
      throw new Meteor.Error(404, "Round not found");
    }
    if(!round.isOpen()) {
      throw new Meteor.Error(404, "Group's round is not open");
    }
    throwIfCannotManageCompetition(this.userId, group.competitionId);
    Groups.update(group._id, { $set: { open: !group.open } });
  },
  advanceResultIdFromRoundPreviousToThisOne: function(resultId, roundId) {
    let round = Rounds.findOne(roundId);
    if(!round) {
      throw new Meteor.Error(404, "Round not found");
    }
    throwIfCannotManageCompetition(this.userId, round.competitionId);

    let bestNotAdvancedResult = Results.findOne(resultId);
    if(!bestNotAdvancedResult) {
      throw new Meteor.Error(404, "Result not found");
    }

    let previousRound = round.getPreviousRound();
    if(!previousRound) {
      throw new Meteor.Error(404, "No previous round found");
    }

    if(bestNotAdvancedResult.roundId !== previousRound._id) {
      throw new Meteor.Error(400, "Given result is not in previous round");
    }

    // We found the best result from the previous round that did not advance.
    // Copy them into this round.
    let result = Results.findOne({
      competitionId: round.competitionId,
      roundId: round._id,
      registrationId: bestNotAdvancedResult.registrationId,
    });
    if(result) {
      let registration = Registrations.findOne(bestNotAdvancedResult.registrationId);
      throw new Meteor.Error(400, `${registration.uniqueName} is already present in this round`);
    }
    Results.insert({
      competitionId: round.competitionId,
      roundId: round._id,
      registrationId: bestNotAdvancedResult.registrationId,
    });
    Meteor.call('recomputeWhoAdvancedAndPreviousPosition', previousRound._id);
    RoundSorter.addRoundToSort(roundId);
  },
  getBestNotAdvancedResultFromRoundPreviousToThisOne: function(roundId) {
    let round = Rounds.findOne(roundId);
    if(!round) {
      throw new Meteor.Error(404, "Round not found");
    }
    throwIfCannotManageCompetition(this.userId, round.competitionId);

    let previousRound = round.getPreviousRound();
    if(previousRound) {
      let bestResultThatDidNotAdvance = Results.findOne({
        roundId: previousRound._id,
        advanced: { $ne: true },
      }, {
        sort: { position: 1 }
      });
      return bestResultThatDidNotAdvance;
    }
  },
  setResultNoShow: function(resultId, newNoShow) {
    let result = Results.findOne(resultId);
    if(!result) {
      throw new Meteor.Error(404, "Result not found");
    }
    throwIfCannotManageCompetition(this.userId, result.competitionId);

    let round = Rounds.findOne(result.roundId);
    if(!round) {
      throw new Meteor.Error(404, "Round not found");
    }

    if(newNoShow && result.solves && result.solves.length > 0) {
      throw new Meteor.Error(404, "Cannot mark someone with results as a no show");
    }

    Results.update(resultId, { $set: { noShow: newNoShow } });
    RoundSorter.addRoundToSort(round._id);
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
RoundSorter = {
  COALESCE_MILLIS: 500,
  _roundsToSortById: {},
  addRoundToSort: function(roundId) {
    if(Meteor.isClient) {
      // We only bother sorting serverside.
      return;
    }
    if(!this._roundsToSortById[roundId]) {
      if(this.COALESCE_MILLIS === 0) {
        // Tests set RoundSorter.COALESCE_MILLIS to 0 so they can run synchronously.
        this._handleSortTimer(roundId);
      } else {
        this._roundsToSortById[roundId] = Meteor.setTimeout(this._handleSortTimer.bind(this, roundId), this.COALESCE_MILLIS);
      }
    }
  },
  _handleSortTimer: function(roundId) {
    log.l1("RoundSorter._handleSortTimer(", roundId, ")");
    delete this._roundsToSortById[roundId];
    let round = Rounds.findOne(roundId);
    if(round) {
      // There's no guarantee that this round still exists by the time we
      // decide to sort it. We seem to be hitting this race in tests.
      round.sortResults();
    }
  },
};

if(Meteor.isServer) {
  let child_process = Npm.require('child_process');
  let path = Npm.require("path");
  let fs = Npm.require('fs');
  let os = Npm.require('os');
  let mkdirp = Meteor.npmRequire('mkdirp');

  let zipIdToFilename = function(zipId, userId) {
    let tmpdir = os.tmpdir();
    return path.join(tmpdir, "tnoodlezips", userId, zipId + ".zip");
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
      let id = Date.now();
      let zipFilename = zipIdToFilename(id, this.userId);
      mkdirp.sync(path.join(zipFilename, ".."));
      fs.writeFileSync(zipFilename, zipData, 'binary');
      return id;
    },
    unzipTNoodleZip: function(zipId, pw) {
      let args = [];
      args.push('-p'); // extract to stdout

      // If you don't pass -P to unzip and try to unzip a password protected
      // zip file, it will prompt you for a password, causing the unzip process
      // to hang. By always passing something to -P, we will never get prompted
      // for a password, instead unzip may just fail to extract.
      args.push('-P');
      args.push(pw || "");

      let zipFilename = zipIdToFilename(zipId, this.userId);
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
      let unzipSync = Meteor.wrapAsync(unzipAsync);
      try {
        let jsonStr = unzipSync();
        return jsonStr;
      } catch(e) {
        throw new Meteor.Error('unzip', e.message);
      }
    },
    importRegistrations: function(competitionId, wcaCompetition) {
      // We use the WCA Competition JSON Format to encode registration information. See:
      //  https://github.com/cubing/worldcubeassociation.org/wiki/WCA-Competition-JSON-Format
      // We don't want this method to silently delete any data, so we only add missing
      // registrations, and we only change the events a person is registered for if
      // they are not checked in.
      throwIfCannotManageCompetition(this.userId, competitionId);

      let registrationByWcaJsonId = {};
      let uniqueNames = {};
      wcaCompetition.persons.forEach(wcaPerson => {
        // Pick a uniqueName for this participant
        let suffix = 0;
        let uniqueName;
        let uniqueNameTaken; // grrr...jshint
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

        let dobMoment = moment.utc(wcaPerson.dob);
        let registration = Registrations.findOne({
          competitionId: competitionId,
          uniqueName: uniqueName,
        });
        if(!registration) {
          registration = Registrations.findOne(Registrations.insert({
            competitionId: competitionId,
            uniqueName: uniqueName,
          }));
        }
        Registrations.update(registration._id, {
          $set: {
            wcaId: wcaPerson.wcaId,
            countryId: wcaPerson.countryId,
            gender: wcaPerson.gender,
            dob: dobMoment.toDate(),
          },
        });
        registration = Registrations.findOne(registration._id);
        // Clear the list of events this person is registered for.
        // We'll only go on to update their registration if they're not checked in.
        registration.registeredEvents = [];

        assert(!registrationByWcaJsonId[wcaPerson.id]);
        registrationByWcaJsonId[wcaPerson.id] = registration;
      });

      wcaCompetition.events.forEach(wcaEvent => {
        let hasEvent = !!Rounds.findOne({
          competitionId: competitionId,
          eventCode: wcaEvent.eventId,
        });
        if(!hasEvent) {
          // Create the rounds for this event!
          wcaEvent.rounds.forEach((wcaRound, nthRound) => {
            let roundId = Rounds.insert({
              competitionId: competitionId,
              eventCode: wcaEvent.eventId,
              nthRound: nthRound + 1,
              totalRounds: wcaEvent.rounds.length,
              formatCode: wcaRound.formatId,
              status: wca.roundStatuses.closed,
            });

            RoundProgresses.insert({
              roundId: roundId,
              competitionId: competitionId,
            });
          });
        }

        // Now that we've created the Rounds for this event, look at who
        // is in the very first round of the JSON and mark them as registered
        // for this event.
        wcaEvent.rounds[0].results.forEach(wcaResult => {
          // wcaResult.personId refers to the personId in the wca json
          let registration = registrationByWcaJsonId[wcaResult.personId];
          registration.registeredEvents[wcaEvent.eventId] = true;
        });
      });
      // Update the registrations to reflect the events they signed up for.
      for(let jsonId in registrationByWcaJsonId) {
        if(registrationByWcaJsonId.hasOwnProperty(jsonId)) {
          let registration = registrationByWcaJsonId[jsonId];
          if(!registration.checkedIn) {
            Registrations.update(registration._id, {
              $set: {
                registeredEvents: _.keys(registration.registeredEvents),
              }
            });
          }
        }
      }
    },
    uploadCompetition: function(wcaCompetition, startDate) {
      startDate = stripTimeFromDate(startDate);
      throwIfNotSiteAdmin(this.userId);

      let competitionName = wcaCompetition.competitionId;
      let newCompetition = {
        competitionName: competitionName,
        listed: false,
        startDate: startDate,
      };

      let wcaCompetitionId = wcaCompetition.competitionId;
      let existingCompetition = Competitions.findOne({ wcaCompetitionId: wcaCompetitionId });
      // Only set a wca competition id if a competition does not yet exist
      // with this wca competition id.
      if(!existingCompetition) {
        newCompetition.wcaCompetitionId = wcaCompetitionId;
      }
      let competitionId = Competitions.insert(newCompetition);
      let competition = Competitions.findOne(competitionId);
      assert(competition);

      let registrationByWcaJsonId = {};
      let uniqueNames = {};
      wcaCompetition.persons.forEach(wcaPerson => {
        // Pick a uniqueName for this participant
        let suffix = 0;
        let uniqueName;
        let uniqueNameTaken; // grrr...jshint
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

        let dobMoment = moment.utc(wcaPerson.dob);
        let registrationId = Registrations.insert({
          competitionId: competition._id,
          uniqueName: uniqueName,
          wcaId: wcaPerson.wcaId,
          countryId: wcaPerson.countryId,
          gender: wcaPerson.gender,
          dob: dobMoment.toDate(),
          registeredEvents: [],
        });
        let registration = Registrations.findOne(registrationId);

        assert(!registrationByWcaJsonId[wcaPerson.id]);
        registrationByWcaJsonId[wcaPerson.id] = registration;
      });

      // Add data for rounds, results, and groups
      wcaCompetition.events.forEach(wcaEvent => {
        log.l0("adding data for " + wcaEvent.eventId);
        // Sort rounds according to the order in which they must have occurred.
        wcaEvent.rounds.sort(function(r1, r2) {
          return ( wca.roundByCode[r1.roundId].supportedRoundIndex -
                   wca.roundByCode[r2.roundId].supportedRoundIndex );
        });
        let newRoundIds = [];
        wcaEvent.rounds.forEach((wcaRound, nthRound) => {
          log.l1("adding data for round " + nthRound);
          let roundId = Rounds.insert({
            nthRound: nthRound + 1,
            totalRounds: wcaEvent.rounds.length,
            competitionId: competition._id,
            eventCode: wcaEvent.eventId,
            formatCode: wcaRound.formatId,
            status: wca.roundStatuses.closed,
          });
          newRoundIds.push(roundId);

          RoundProgresses.insert({
            roundId: roundId,
            competitionId: competitionId,
          });

          let softCutoff = null;
          wcaRound.results.forEach(wcaResult => {
            log.l2("adding data for personId " + wcaResult.personId);
            // wcaResult.personId refers to the personId in the wca json
            let registration = registrationByWcaJsonId[wcaResult.personId];
            registration.registeredEvents[wcaEvent.eventId] = true;

            if(!wcaResult.results) {
              // If the results field isn't defined, then the user isn't
              // checked in for this event. This is a little trick to
              // allow registration sites such as CubingUSA to export registration
              // information via the WCA competition JSON format.
              return;
            }
            registration.checkedIn = true;

            let solves = wcaResult.results.map(wcaValue => wca.wcaValueToSolveTime(wcaValue, wcaEvent.eventId));
            if(!solves[solves.length - 1]) {
              // We're missing a solve, so this must be a combined round
              // and this participant didn't make the soft cutoff.
              let roundInfo = wca.roundByCode[wcaRound.roundId];
              assert(roundInfo.combined);
              let lastSolveIndex = -1;
              let minSolveTime = null;
              while(solves[lastSolveIndex + 1] && solves[lastSolveIndex + 1]) {
                lastSolveIndex++;
                let lastSolveTime = solves[lastSolveIndex];
                if(!minSolveTime || wca.compareSolveTimes(lastSolveTime, minSolveTime) < 0) {
                  minSolveTime = lastSolveTime;
                }
              }
              // We always import combined rounds as if they have a
              // "soft cutoff in N" cutoff (this doesn't handle
              // cumulative cutoffs).
              let softCutoffFormatCode = "" + (lastSolveIndex + 1);
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
            let result = {
              competitionId: competition._id,
              roundId: roundId,
              registrationId: registration._id,
              position: wcaResult.position,
              solves: solves,
            };
            let statistics = wca.computeSolvesStatistics(solves, wcaRound.formatId);
            _.extend(result, statistics);
            let id = Results.insert(
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
            Rounds.update(roundId, { $set: { softCutoff: softCutoff } });
          }

          // We don't actually need to resort, but we do want to recompute
          // how far we've progressed in the round.
          RoundSorter.addRoundToSort(roundId);

          wcaRound.groups.forEach(wcaGroup => {
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

        newRoundIds.forEach(roundId => {
          Meteor.call('recomputeWhoAdvancedAndPreviousPosition', roundId);
        });

        log.l0("finished adding data for " + wcaEvent.eventId);
      });

      // Update the registrations to reflect the events they signed up for.
      for(let jsonId in registrationByWcaJsonId) {
        if(registrationByWcaJsonId.hasOwnProperty(jsonId)) {
          let registration = registrationByWcaJsonId[jsonId];
          let registrationId = Registrations.update(
            registration._id,
          {
            $set: {
              registeredEvents: _.keys(registration.registeredEvents),
              checkedIn: registration.checkedIn,
            }
          });
        }
      }

      return competition.wcaCompetitionId || competition._id;
    },
    recomputeWhoAdvancedAndPreviousPosition: function(roundId) {
      check(roundId, String);

      let round = Rounds.findOne(roundId);
      let nextRound = round.getNextRound();

      let results = Results.find({ roundId: roundId });

      results.forEach(result => {
        let advanced;
        if(nextRound) {
          // Update the previousPosition field of the corresponding Result in
          // the next round. If we found a Result to update, then they must
          // have advanced!
          advanced = !!Results.update({
            roundId: nextRound._id,
            registrationId: result.registrationId,
          }, {
            $set: {
              previousPosition: result.position,
            }
          });
        } else {
          // If there is no next round, then nobody advanced.
          advanced = false;
        }
        Results.update(result._id, { $set: { advanced: advanced } });
      });
    },
    checkInRegistration: function(registrationId, toCheckIn) {
      let registration = Registrations.findOne(registrationId);
      throwIfCannotManageCompetition(this.userId, registration.competitionId);
      registration.checkIn(toCheckIn);
    },
  });
}
