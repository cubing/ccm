var scrambleSetsReact = new ReactiveVar(null);
var tnoodleStatusReact = new ReactiveVar(null);

function getWarningForSheet(competitionId, sheet) {
  var round = findRoundForSheet(competitionId, sheet);
  if(!round) {
    return "Could not find round for sheet";
  }
  var existingGroup = Groups.findOne({
    roundId: round._id,
    group: sheet.group
  });
  if(existingGroup) {
    return "Existing group will be clobbered";
  }
  return null;
}

function getUploadButtonState(competitionId) {
  var scrambleSets = scrambleSetsReact.get();
  if(!scrambleSets || scrambleSets.length === 0) {
    return "disabled";
  }

  var error = _.some(scrambleSets, function(scrambleSet) {
    return scrambleSet.error;
  });
  if(error) {
    return "error";
  }

  var warnings = _.some(scrambleSets, function(scrambleSet) {

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

var TNOODLE_ROOT_URL = "http://localhost:2014";
var TNOODLE_VERSION_URL = TNOODLE_ROOT_URL + "/version.json";
var TNOODLE_VERSION_POLL_FREQUENCY_MILLIS = 1000;

var tnoodleStatusPoller = null;
function startPollingTNoodleStatus() {
  if(tnoodleStatusPoller === null) {
    tnoodleStatusPoller = setTimeout(pollTNoodleStatus, 0);
  }
}
function stopPollingTNoodleStatus() {
  if(tnoodleStatusPoller !== null) {
    clearTimeout(tnoodleStatusPoller);
    tnoodleStatusPoller = null;
  }
}
function pollTNoodleStatus() {
  $.ajax({
    url: TNOODLE_VERSION_URL
  }).done(function(data) {
    tnoodleStatusReact.set(data);
  }).fail(function() {
    tnoodleStatusReact.set(null);
  });
  tnoodleStatusPoller = setTimeout(pollTNoodleStatus, TNOODLE_VERSION_POLL_FREQUENCY_MILLIS);
}

function getRoundsWithoutScrambles(competitionId) {
  var groups = Groups.find({
    competitionId: competitionId
  }, {
    fields: {
      roundId: 1
    }
  }).fetch();
  var rounds = Rounds.find({
    competitionId: competitionId,
    _id: {
      $nin: _.pluck(groups, "roundId")
    }
  }).fetch();
  return rounds;
}

function findRoundForSheet(competitionId, sheet) {
  var round = Rounds.findOne({
    competitionId: competitionId,
    eventCode: sheet.event,
    nthRound: (sheet.round - 1)
  });
  return round;
}

function extractJsonFromZip(filename, zipId, pw, cb) {
  Meteor.call("unzipTNoodleZip", zipId, pw, function(error, data) {
    if(error) {
      if(error.reason == "invalid-password") {
        var promptStr = "Enter password for\n" + filename;
        if(pw !== null) {
          promptStr = "Wrong password! " + promptStr;
        }
        var newPw = prompt(promptStr);
        if(newPw !== null) {
          extractJsonFromZip(filename, zipId, newPw, cb);
        } else {
          cb("Wrong password");
        }
        return;
      } else {
        throw error;
      }
    }
    cb(null, data);
  });
}

Template.uploadScrambles.created = function() {
  startPollingTNoodleStatus();
};

Template.uploadScrambles.destroyed = function() {
  stopPollingTNoodleStatus();
};

Template.uploadScrambles.events({
  'change input[type="file"]': function(e, t) {
    var fileInput = e.currentTarget;
    // Convert FileList to javascript array
    var files = _.map(fileInput.files, _.identity);
    var scrambleSets = [];

    files.forEach(function(file, index) {
      var scrambleSet = {
        index: index,
        file: file,
        error: null
      };
      scrambleSets.push(scrambleSet);

      var addScramblesJsonStr = function(jsonStr) {
        var scrambleData;
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
      var extension = file.name.toLowerCase().split('.').pop();
      var isJson = extension == "json";
      var isZip = extension == "zip";
      var reader = new FileReader();
      reader.onload = function() {
        if(isJson) {
          addScramblesJsonStr(reader.result);
        } else if(isZip) {
          Meteor.call('uploadTNoodleZip', reader.result, function(error, zipId) {
            if(error) {
              scrambleSet.error = error;
              scrambleSetsReact.set(scrambleSets);
              throw error;
            }
            extractJsonFromZip(file.name, zipId, null, function(error, jsonStr) {
              if(error) {
                scrambleSet.error = error;
                scrambleSetsReact.set(scrambleSets);
                throw error;
              }
              addScramblesJsonStr(jsonStr);
            });
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
    var competition = this.competition;

    var scrambleSets = scrambleSetsReact.get();

    scrambleSets.forEach(function(scrambleSet) {
      if(!scrambleSet.tnoodleScrambles) {
        return;
      }
      var tnoodleScrambles = scrambleSet.tnoodleScrambles;
      tnoodleScrambles.sheets.forEach(function(sheet) {
        var round = findRoundForSheet(competition._id, sheet);
        if(!round) {
          console.warn("No round found for competitionId: " + competition._id);
          console.warn(sheet);
          return;
        }

        var newGroup = {
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

    var $fileInput = $('input[type="file"]');
    // Clear selected files and fire change event to update ui
    $fileInput.val('');
    $fileInput.change();
  }
});

Template.uploadScrambles.rendered = function() {
  // Bootstrap's tooltips are opt in, so just enable it on all elements with a
  // title.
  this.$('[title]').tooltip();
};

Template.uploadScrambles.helpers({
  tnoodleVersionUrl: TNOODLE_VERSION_URL,
  tnoodleStatus: function() {
    return tnoodleStatusReact.get();
  },
  tnoodleRunningVersionAllowed: function() {
    var tnoodleStatus = tnoodleStatusReact.get();
    if(!tnoodleStatus) {
      return false;
    }
    return _.contains(tnoodleStatus.allowed, tnoodleStatus.running_version);
  },

  roundsWithoutScrambles: function() {
    var roundsWithoutScrambles = getRoundsWithoutScrambles(this.competitionId);
    return roundsWithoutScrambles;
  },
  generateMissingScramblesUrl: function() {
    var roundsWithoutScrambles = getRoundsWithoutScrambles(this.competitionId);

    var params = {};
    params.version = "1.0";
    params.competitionName = getCompetitionAttribute(this.competitionId, 'competitionName');

    var events = [];
    roundsWithoutScrambles.forEach(function(round) {
      var event = {
        eventID: round.eventCode,
        round: 1 + round.nthRound,
        //groupCount: '1',
        //scrambleCount: '5',
        //extraScrambleCount: '2'
      };
      events.push(event);
    });
    params.rounds = toURLPretty(events);

    // See http://bugs.jquery.com/ticket/3400
    var url = TNOODLE_ROOT_URL + "/scramble/#" + $.param(params).replace(/\+/g, "%20");
    return url;
  },
  uploadedScrambleSets: function() {
    return scrambleSetsReact.get();
  },
  warningForUploadedSheet: function() {
    var competitionId = Template.parentData(2).competitionId;
    var sheet = this;
    var warning = getWarningForSheet(competitionId, sheet);
    return warning;
  },
  uploadWarning: function() {
    var uploadButtonState = getUploadButtonState(this.competitionId);
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
    var uploadButtonState = getUploadButtonState(this.competitionId);
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
