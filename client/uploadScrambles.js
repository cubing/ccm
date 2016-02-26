let scrambleSetsReact = new ReactiveVar(null);

function getWarningForSheet(competitionId, sheet) {
  let round = findRoundForSheet(competitionId, sheet);
  if(!round) {
    return "Could not find round for sheet";
  }
  let existingGroup = Groups.findOne({
    roundId: round._id,
    group: sheet.group
  });
  if(existingGroup) {
    return "Existing group will be clobbered";
  }
  return null;
}

function getUploadButtonState(competitionId) {
  let scrambleSets = scrambleSetsReact.get();
  if(!scrambleSets || scrambleSets.length === 0) {
    return "disabled";
  }

  let error = _.some(scrambleSets, function(scrambleSet) {
    return scrambleSet.error;
  });
  if(error) {
    return "error";
  }

  let warnings = _.some(scrambleSets, function(scrambleSet) {

    if(!scrambleSet.tnoodleScrambles) {
      return false;
    }
    return _.some(scrambleSet.tnoodleScrambles.sheets, function(sheet) {
      return getWarningForSheet(competitionId, sheet);
    });
  });
  if(warnings) {
    return "warning";
  }

  return "";
}

let TNOODLE_ROOT_URL = "http://localhost:2014";

function getRoundsWithoutScrambles(competitionId) {
  let groups = Groups.find({ competitionId: competitionId }, { fields: { roundId: 1 } }).fetch();
  let rounds = Rounds.find({
    competitionId: competitionId,
    _id: { $nin: _.pluck(groups, "roundId") },
    eventCode: { $exists: true },
  }, {
    sort: {
      eventCode: 1,
      nthRound: 1,
    }
  }).fetch();
  return rounds;
}

function findRoundForSheet(competitionId, sheet) {
  let round = Rounds.findOne({
    competitionId: competitionId,
    eventCode: sheet.event,
    nthRound: sheet.round,
  });
  return round;
}

function extractJsonFromZip(filename, zipId, pw, cb) {
  Meteor.call("unzipTNoodleZip", zipId, pw, function(err, data) {
    if(err) {
      if(err.reason == "invalid-password") {
        let promptStr = "Enter password for\n" + filename;
        if(pw !== null) {
          promptStr = "Wrong password! " + promptStr;
        }
        let newPw = prompt(promptStr);
        if(newPw !== null) {
          extractJsonFromZip(filename, zipId, newPw, cb);
        } else {
          cb("Wrong password");
        }
      } else {
        console.error("Meteor.call() error: " + err);
      }
    } else {
      cb(null, data);
    }
  });
}

Template.uploadScrambles.events({
  'change input[type="file"]': function(e, t) {
    let fileInput = e.currentTarget;
    // Convert FileList to javascript array
    let files = Array.from(fileInput.files);
    let scrambleSets = [];

    files.forEach((file, index) => {
      let scrambleSet = {
        index: index,
        file: file,
        error: null
      };
      scrambleSets.push(scrambleSet);

      let addScramblesJsonStr = function(jsonStr) {
        let scrambleData;
        try {
          scrambleData = JSON.parse(jsonStr);
          scrambleSet.tnoodleScrambles = scrambleData;
          scrambleSetsReact.set(scrambleSets);
        } catch(e) {
          scrambleSet.error = "Failed to parse JSON in:\n" + file.name + "\n\n" + e;
          scrambleSetsReact.set(scrambleSets);
          throw e;
        }
      };

      // TODO - there are no pure javascript libraries for reading
      // password protected zip files. This
      // https://github.com/Stuk/jszip/pull/129
      // is the closest, but doesn't seem to be ready to use, so we
      // just do this server side
      // by invoking "unzip". Later on, this could be changed to
      // invoke a bundled java program so this can work when
      // the server is running on windows.
      let extension = file.name.toLowerCase().split('.').pop();
      let isJson = extension == "json";
      let isZip = extension == "zip";
      let reader = new FileReader();
      reader.onload = function() {
        if(isJson) {
          addScramblesJsonStr(reader.result);
        } else if(isZip) {
          Meteor.call('uploadTNoodleZip', reader.result, function(err, zipId) {
            if(err) {
              scrambleSet.error = err;
              scrambleSetsReact.set(scrambleSets);
              console.error("Meteor.call() error: " + err);
            } else {
              extractJsonFromZip(file.name, zipId, null, function(err2, jsonStr) {
                if(err2) {
                  scrambleSet.error = err2;
                  scrambleSetsReact.set(scrambleSets);
                  console.error("Meteor.call() error: " + err);
                } else {
                  addScramblesJsonStr(jsonStr);
                }
              });
            }
          });
        } else {
          // Should never get here
        }
      };
      if(isJson) {
        reader.readAsText(file);
      } else if(isZip) {
        reader.readAsBinaryString(file);
      } else {
        scrambleSet.error = "Unrecognized file extension:\n" + file.name;
        scrambleSetsReact.set(scrambleSets);
      }
    });
    scrambleSetsReact.set(scrambleSets);
    // Clear selected files so a subsequent select of the same files
    // will fire an event. Note that we *don't* fire a change event
    // here.
    $(fileInput).val('');
  },
  'click #buttonUploadScrambles': function(e, t) {
    let scrambleSets = scrambleSetsReact.get();

    scrambleSets.forEach(scrambleSet => {
      if(!scrambleSet.tnoodleScrambles) {
        return;
      }
      let tnoodleScrambles = scrambleSet.tnoodleScrambles;
      tnoodleScrambles.sheets.forEach(sheet => {
        let round = findRoundForSheet(this.competitionId, sheet);
        if(!round) {
          console.warn("No round found for competitionId: " + this.competitionId);
          console.warn(sheet);
          return;
        }

        let newGroup = {
          competitionId: round.competitionId,
          roundId: round._id,
          group: sheet.group,
          scrambles: sheet.scrambles,
          extraScrambles: sheet.extraScrambles,
          scrambleProgram: tnoodleScrambles.version
        };
        Meteor.call('addOrUpdateGroup', newGroup);
      });
    });

    let $fileInput = $('input[type="file"]');
    // Clear selected files and fire change event to update ui
    $fileInput.val('');
    $fileInput.change();
  }
});

Template.uploadScrambles.helpers({
  roundsWithoutScrambles: function() {
    let roundsWithoutScrambles = getRoundsWithoutScrambles(this.competitionId);
    return roundsWithoutScrambles;
  },
  generateMissingScramblesUrl: function() {
    let roundsWithoutScrambles = getRoundsWithoutScrambles(this.competitionId);

    let events = [];
    roundsWithoutScrambles.forEach(round => {
      let event = {
        eventID: round.eventCode,
        round: round.nthRound,
        groupCount: '1',
        scrambleCount: round.format().count,
      };
      events.push(event);
    });
    let params = {
      version: "1.0",
      competitionName: Competitions.findOne(this.competitionId).competitionName,
      rounds: toURLPretty(events),
    };

    // See http://bugs.jquery.com/ticket/3400
    let url = TNOODLE_ROOT_URL + "/scramble/#" + $.param(params).replace(/\+/g, "%20");
    return url;
  },
  uploadedScrambleSets: function() {
    return scrambleSetsReact.get();
  },
  warningForUploadedSheet: function() {
    let competitionId = Template.parentData(2).competitionId;
    let sheet = this;
    let warning = getWarningForSheet(competitionId, sheet);
    return warning;
  },
  uploadWarning: function() {
    let uploadButtonState = getUploadButtonState(this.competitionId);
    if(uploadButtonState == "error") {
      return "Errors detected, see above for details";
    } else if(uploadButtonState == "warning") {
      return "Warnings detected, see above for details";
    } else if(uploadButtonState == "disabled") {
      return "";
    } else {
      return "";
    }
  },
  classForUploadButton: function() {
    let uploadButtonState = getUploadButtonState(this.competitionId);
    if(uploadButtonState == "error") {
      return "btn-danger";
    } else if(uploadButtonState == "warning") {
      return "btn-warning";
    } else if(uploadButtonState == "disabled") {
      return "disabled";
    } else {
      return "btn-success";
    }
  }
});
