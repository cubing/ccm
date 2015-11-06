const log = logging.handle("both_methods");

Meteor.methods({
  createCompetition(competitionName, startDate) {
    check(competitionName, String);
    throwIfNotLoggedIn(this.userId);
    let competition = Competition.create(this.userId, competitionName, startDate);
    return competition._id;
  },

  deleteCompetition(competitionId) {
    check(competitionId, String);
    let competition = Competitions.findOne(competitionId);
    if(!competition) {
      throw new Meteor.Error(404, "Competition not found");
    }
    throwIfCannotManageCompetition(this.userId, competitionId, 'deleteCompetition');
    competition.remove();
  },

  addRound(competitionId, eventCode) {
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

  removeLastRound(competitionId, eventCode) {
    let competition = Competitions.findOne(competitionId);
    if(!competition) {
      throw new Meteor.Error(404, "Competition not found");
    }
    let lastRound = competition.getLastRoundOfEvent(eventCode);
    if(!lastRound || !canRemoveRound(this.userId, lastRound._id)) {
      throw new Meteor.Error(400, "Cannot remove lastRound.");
    }

    lastRound.remove();
  },

  addScheduleEvent(competitionId, eventData, roundId) {
    check(competitionId, String);
    throwIfCannotManageCompetition(this.userId, competitionId, 'manageSchedule');

    let round = Rounds.findOne(roundId); // Will not exist for some events

    if(!round && roundId) {
      throw new Meteor.Error(`Invalid roundId: '${roundId}'`);
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

  removeScheduleEvent(scheduleEventId) {
    let event = ScheduleEvents.findOne(scheduleEventId);
    throwIfCannotManageCompetition(this.userId, event.competitionId, 'manageSchedule');
    ScheduleEvents.remove(scheduleEventId);
  },

  addOrUpdateGroup(newGroup) {
    throwIfCannotManageCompetition(this.userId, newGroup.competitionId, 'manageScrambles');
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

  advanceParticipantsFromRound(participantsToAdvance, roundId) {
    let round = Rounds.findOne(roundId);
    throwIfCannotManageCompetition(this.userId, round.competitionId, 'dataEntry');

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

  addSiteAdmin(newSiteAdminUserId) {
    if(!isSiteAdmin(this.userId)) {
      throw new Meteor.Error(403, "Must be a site admin");
    }

    Meteor.users.update(newSiteAdminUserId, { $set: { siteAdmin: true } });
  },

  removeSiteAdmin(siteAdminToRemoveUserId) {
    if(!isSiteAdmin(this.userId)) {
      throw new Meteor.Error(403, "Must be a site admin");
    }

    // Prevent a user from accidentally depromoting themselves.
    if(this.userId == siteAdminToRemoveUserId) {
      throw new Meteor.Error(403, "Site admins may not unresign themselves!");
    }

    Meteor.users.update(siteAdminToRemoveUserId, { $set: { siteAdmin: false } });
  },

  setSolveTime(resultId, solveIndex, solveTime) {
    let result = Results.findOne(resultId);
    if(!result) {
      throw new Meteor.Error(404, "Result not found");
    }
    throwIfCannotManageCompetition(this.userId, result.competitionId, 'dataEntry');
    let registration = result.registration();
    if(!registration) {
      throw new Meteor.Erorr(404, "Registration not found");
    }
    if(!registration.checkedIn) {
      throw new Meteor.Error(400, "Cannot enter results for someone who is not checked in");
    }

    result.setSolveTime(solveIndex, solveTime);
  },

  setRoundSoftCutoff(roundId, softCutoff) {
    let round = Rounds.findOne(roundId, {
      fields: {
        competitionId: 1,
        eventCode: 1,
      }
    });
    if(!round) {
      throw new Meteor.Error(404, "Round not found");
    }
    throwIfCannotManageCompetition(this.userId, round.competitionId, 'manageEvents');

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

  toggleEventRegistration(registrationId, eventCode) {
    let registration = Registrations.findOne(registrationId);
    throwIfCannotManageCompetition(this.userId, registration.competitionId, 'manageCheckin');
    let registeredForEvent = _.contains(registration.registeredEvents, eventCode);
    let update;
    if(registeredForEvent) {
      // If registered, then unregister.
      update = { $pull: { registeredEvents: eventCode } };
      let index = registration.registeredEvents.indexOf(eventCode);
      if(index >= 0) {
        registration.registeredEvents.splice(index, 1);
      }
    } else {
      // If not registered, then register.
      update = { $addToSet: { registeredEvents: eventCode } };
      registration.registeredEvents.push(eventCode);
    }

    // Synchronize the set of first rounds this Registration should have
    // Results for. This may not be possible if that would require deleting a Result
    // that has data.
    registration.createAndDeleteFirstRoundResults();

    // Note that we've waited to actually update update the Registration until
    // createAndDeleteFirstRoundResults succeeded (it would throw an exception
    // if we're not allowed to remove the registrant's Result).
    Registrations.update(registration._id, update);
  },

  toggleGroupOpen(groupId) {
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
    throwIfCannotManageCompetition(this.userId, group.competitionId, 'manageScrambles');
    Groups.update(group._id, { $set: { open: !group.open } });
  },

  advanceResultIdFromRoundPreviousToThisOne(resultId, roundId) {
    let round = Rounds.findOne(roundId);
    if(!round) {
      throw new Meteor.Error(404, "Round not found");
    }
    throwIfCannotManageCompetition(this.userId, round.competitionId, 'dataEntry');

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

  getBestNotAdvancedResultFromRoundPreviousToThisOne(roundId) {
    let round = Rounds.findOne(roundId);
    if(!round) {
      throw new Meteor.Error(404, "Round not found");
    }
    throwIfCannotManageCompetition(this.userId, round.competitionId, 'dataEntry');

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

  setResultNoShow(resultId, newNoShow) {
    let result = Results.findOne(resultId);
    if(!result) {
      throw new Meteor.Error(404, "Result not found");
    }
    throwIfCannotManageCompetition(this.userId, result.competitionId, 'dataEntry');

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

  setStaffRole(registrationId, role, toSet) {
    check(registrationId, String);
    check(role, String);
    check(toSet, Boolean);
    let registration = Registrations.findOne(registrationId);
    if(!registration) {
      throw new Meteor.Error(404, "Registration not found");
    }
    throwIfCannotManageCompetition(this.userId, registration.competitionId, 'organizer');

    if(registration.userId === this.userId && !toSet) {
      throw new Meteor.Error(403, "You cannot demote yourself");
    }
    Registrations.update(registrationId, { $set: { [`roles.${role}`]: toSet } });
  },

  removeStaffMember(registrationId) {
    check(registrationId, String);
    let registration = Registrations.findOne(registrationId);
    if(!registration) {
      throw new Meteor.Error(404, "Registration not found");
    }
    throwIfCannotManageCompetition(this.userId, registration.competitionId, 'organizer');

    if(registration.userId === this.userId) {
      throw new Meteor.Error(403, "You cannot demote yourself");
    }
    Registrations.update(registrationId, { $unset: { roles: 1 } });
  },
});
