const log = logging.handle("server_methods");

const child_process = require('child_process');
const path = require("path");
const fs = require('fs');
const os = require('os');
const mkdirp = require('mkdirp');

let zipIdToFilename = function(zipId, userId) {
  let tmpdir = os.tmpdir();
  return path.join(tmpdir, "tnoodlezips", userId, zipId + ".zip");
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

Meteor.methods({
  requestVerificationEmail() {
    Accounts.sendVerificationEmail(this.userId);
  },

  uploadTNoodleZip(zipData) {
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

  unzipTNoodleZip(zipId, pw) {
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

  importRegistrations(competitionId, wcaCompetition) {
    // We use the WCA Competition JSON Format to encode registration information. See:
    //  https://github.com/cubing/worldcubeassociation.org/wiki/WCA-Competition-JSON-Format
    // We don't want this method to silently delete any data, so we only add missing
    // registrations, and we only change the events a person is registered for if
    // they are not checked in.
    throwIfCannotManageCompetition(this.userId, competitionId, 'manageCheckin');

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

      // First try to find an existing Registration by wcaId.
      let registration = null;
      if(wcaPerson.wcaId) {
        registration = Registrations.findOne({
          competitionId: competitionId,
          wcaId: wcaPerson.wcaId,
        });
      }
      // Then try to find an existing Registration by uniqueName.
      if(!registration) {
        registration = Registrations.findOne({
          competitionId: competitionId,
          uniqueName: uniqueName,
        });
      }
      // Otherwise, give up and create a new Registration.
      if(!registration) {
        registration = Registrations.findOne(Registrations.insert({
          competitionId: competitionId,
          uniqueName: uniqueName,
        }));
      }
      let toSet = {
        wcaId: wcaPerson.wcaId,
        countryId: wcaPerson.countryId,
        gender: wcaPerson.gender,
        dob: moment.utc(wcaPerson.dob).toDate(),
      };
      // If this Registration doesn't have a userId, and we have a wcaId, try
      // to find an existing user with this wcaId.
      if(!registration.userId && wcaPerson.wcaId) {
        let user = Meteor.users.findOne({ 'profile.wcaId': wcaPerson.wcaId });
        if(user) {
          // We found a user with this WCA id!
          toSet.userId = user._id;
        }
      }
      Registrations.update(registration._id, { $set: toSet });
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
        registration.registeredEvents.push(wcaEvent.eventId);
      });
    });
    // Update the registrations to reflect the events they signed up for.
    for(let jsonId in registrationByWcaJsonId) {
      if(registrationByWcaJsonId.hasOwnProperty(jsonId)) {
        let registration = registrationByWcaJsonId[jsonId];
        if(!registration.checkedIn) {
          Meteor.call('addEditRegistration', registration);
        }
      }
    }
  },

  uploadCompetition(wcaCompetition, startDate) {
    throwIfNotSiteAdmin(this.userId);

    // The WCA competition JSON doesn't include a competition name field, so
    // we just use the competition's WCA id.
    let wcaCompetitionId = wcaCompetition.competitionId;
    let competitionName = wcaCompetitionId;
    let competition = Competition.create(this.userId, competitionName, startDate);

    let existingCompetition = Competitions.findOne({ wcaCompetitionId: wcaCompetitionId });
    // Only set the wca competition id if a competition does not already exist
    // with this wca competition id.
    if(!existingCompetition) {
      Competitions.update(competition._id, { $set: { wcaCompetitionId: wcaCompetitionId } });
      competition = Competitions.findOne(competition._id);
    }

    let registrationByWcaJsonId = {};
    // When creating the competition, a Registration was created. Populate our
    // uniqueNames object with the contents of the Registrations that already exist.
    let registrations = Registrations.find({ competitionId: competition._id }).fetch();
    let uniqueNames = _.indexBy(registrations, 'uniqueName');
    wcaCompetition.persons.forEach(wcaPerson => {
      // Pick a uniqueName for this participant
      let suffix = 0;
      let uniqueName = wcaPerson.name;
      while(uniqueNames[uniqueName]) {
        uniqueName = wcaPerson.name + " " + (++suffix);
      }
      assert(!uniqueNames[uniqueName]);
      uniqueNames[uniqueName] = true;

      let registrationId = Registrations.insert({
        competitionId: competition._id,
        uniqueName: uniqueName,
        wcaId: wcaPerson.wcaId,
        countryId: wcaPerson.countryId,
        gender: wcaPerson.gender,
        dob: moment.utc(wcaPerson.dob).toDate(),
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
          competitionId: competition._id,
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
          registration._id, {
            $set: {
              registeredEvents: _.keys(registration.registeredEvents),
              checkedIn: registration.checkedIn,
            }
          });
      }
    }

    return competition;
  },

  recomputeWhoAdvancedAndPreviousPosition(roundId) {
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

  checkInRegistration(registrationId, toCheckIn) {
    let registration = Registrations.findOne(registrationId);
    throwIfCannotManageCompetition(this.userId, registration.competitionId, 'manageCheckin');
    registration.checkIn(toCheckIn);
  },

  addStaffMembers(competitionId, wcaUserIds) {
    // Only organizers can add staff members.
    throwIfCannotManageCompetition(this.userId, competitionId, 'organizer');

    // Since we're going to be hitting the WCA api, unblock so this user
    // can call other methods while this one runs.
    this.unblock();

    // Do all the api queries first as a way of validating the WCA user ids we've
    // been given.
    let wcaUserData = wcaUserIds.map(wca.getUserData);

    wcaUserData.forEach(wcaUserDatum => {
      let user = Meteor.users.findOne({ 'services.worldcubeassociation.id': wcaUserDatum.id });
      if(!user) {
        // There is no user with the given wcaUserDatum.id, so create one!
        let serviceData = _.pick(wcaUserDatum, WorldCubeAssociation.whitelistedFields);

        let userId = Meteor.users.insert({
          services: { worldcubeassociation: serviceData },
          emails: [],
          createdAt: new Date(),
        });
        user = Meteor.users.findOne(userId);
        copyUserWcaDataToProfile(user);
        user = Meteor.users.findOne(user._id);
      }

      // We've got the user, now check if there's a registration for them for
      // this competition.
      // First search by userId.
      let registration = Registrations.findOne({
        competitionId: competitionId,
        userId: user._id,
      });
      // Then search by WCA id.
      if(!registration) {
        registration = Registrations.findOne({
          competitionId: competitionId,
          wcaId: user.profile.wcaId,
        });
      }
      // Then search by uniqueName.
      if(!registration) {
        registration = Registrations.findOne({
          competitionId: competitionId,
          uniqueName: user.profile.name,
        });
      }
      // Else, give up and create a Registration for this user.
      if(!registration) {
        registration = Registrations.findOne(Registrations.insert(generateCompetitionRegistrationForUser(competitionId, user)));
      }
      if(!registration.userId) {
        Registrations.update(registration._id, { $set: { userId: user._id } });
      }
      if(!registration.roles) {
        Registrations.update(registration._id, { $set: { roles: DEFAULT_STAFF_ROLES } });
      }
    });
  },

  addEditRegistration(registration) {
    let existingRegistration = Registrations.findOne(registration._id);
    if(existingRegistration && existingRegistration.competitionId != registration.competitionId) {
      throw new Meteor.Error(400, "Cannot change the competitionId of a registration");
    }

    let competition = Competitions.findOne(registration.competitionId);
    if(!competition) {
      throw new Meteor.Error(404, "Cannot find competition");
    }

    let canManageCheckin = !getCannotManageCompetitionReason(this.userId, registration.competitionId, 'manageCheckin');
    if(!canManageCheckin) {
      let cannotRegisterReasons = competition.getCannotRegisterReasons();
      if(cannotRegisterReasons) {
        throw new Meteor.Error(400, cannotRegisterReasons.join(", "));
      }
      // can only edit entries with own user id
      if(registration.userId != this.userId) {
        throw new Meteor.Error(400, "Cannot edit a registration other than your own");
      }
    }
    let allowedFields = [
      'userId',
      'competitionId',
      'uniqueName',
      'registeredEvents',
      'guestCount',
      'comments',
    ];
    if(canManageCheckin) {
      allowedFields.push('wcaId', 'gender', 'dob', 'countryId');
    }
    registration = _.pick(registration, allowedFields);

    if(existingRegistration) {
      Registrations.update(existingRegistration._id, { $set: registration });
      registration = Registrations.findOne(existingRegistration._id);
    } else {
      registration = Registrations.findOne(Registrations.insert(registration));
    }
    registration.createAndDeleteFirstRoundResults();
    return registration._id;
  },

  deleteRegistration(registrationId) {
    let registration = Registrations.findOne(registrationId);
    if(!registration) {
      throw new Meteor.Error(404, "Cannot find registration");
    }

    let competition = Competitions.findOne(registration.competitionId);
    if(!competition) {
      throw new Meteor.Error(404, "Cannot find competition");
    }

    let canManageCheckin = !getCannotManageCompetitionReason(this.userId, registration.competitionId, 'manageCheckin');
    if(!canManageCheckin) {
      let cannotRegisterReasons = competition.getCannotRegisterReasons();
      if(cannotRegisterReasons) {
        throw new Meteor.Error(400, cannotRegisterReasons.join(", "));
      }
      // can only edit entries with own user id
      if(registration.userId != this.userId) {
        throw new Meteor.Error(400, "Cannot edit a registration other than your own");
      }
    }
    registration.registeredEvents = [];
    registration.createAndDeleteFirstRoundResults();
    Registrations.remove(registrationId);
  },
});
