Template.editCompetition.events({
  'input input[type="text"]': function(e){
    var attribute = e.currentTarget.name;
    var value = e.currentTarget.value;
    var toSet = {};
    toSet[attribute] = value;
    var competitionId = this._id;
    Competitions.update({ _id: competitionId }, { $set: toSet });
  },
  'change input[type="checkbox"]': function(e){
    var attribute = e.currentTarget.name;
    var value = e.currentTarget.checked;
    var toSet = {};
    toSet[attribute] = value;
    var competitionId = this._id;
    Competitions.update({ _id: competitionId }, { $set: toSet });
  },
  'click button[name="buttonAddRound"]': function(e, t){
    Meteor.call('addRound', this.competitionId, this.eventCode);
  },
  'click button[name="buttonRemoveRound"]': function(e, t){
    var roundId = this._id;
    Meteor.call('removeRound', roundId);
  },
  'click .dropdown-menu li a': function(e){
    var target = e.currentTarget;
    var formatCode = target.dataset.format_code;
    var roundId = target.dataset.round_id;
    Rounds.update({
      _id: roundId
    }, {
      $set: {
        formatCode: formatCode
      }
    });
  }
});

var eventCountPerRowByDeviceSize = {
  xs: 1,
  sm: 2,
  md: 2,
  lg: 3,
};
Template.editCompetition.helpers({
  events: function(){
    var competitionId = this._id;
    var events = _.map(_.toArray(wca.eventByCode), function(e, i){
      return {
        index: i,
        competitionId: competitionId,
        eventCode: e.code,
        eventName: e.name
      };
    });
    return events;
  },
  eventColumnsClasses: function(){
    var classes = _.map(eventCountPerRowByDeviceSize, function(eventCount, deviceSize){
      var cols = Math.floor(12 / eventCount);
      return "col-" + deviceSize + "-" + cols;
    });
    return classes.join(" ");
  },
  clearfixVisibleClass: function(){
    var that = this;
    var classes = _.map(eventCountPerRowByDeviceSize, function(eventCount, deviceSize){
      if((that.index + 1) % eventCount === 0){
        return 'visible-' + deviceSize + '-block';
      }
      return '';
    });
    return classes.join(" ");
  },

  rounds: function(){
    var rounds = Rounds.find({
      competitionId: this.competitionId,
      eventCode: this.eventCode
    }, {
      sort: {
        "nthRound": 1
      }
    });
    return rounds;
  },
  roundProgressPercentage: function(){
    var results = Results.find({
      competitionId: this.competitionId,
      roundId: this._id
    });
    var solves = _.chain(results.fetch())
      .pluck("solves")
      .flatten()
      .map(function(time){
        return time ? 1 : 0;
      })
      .value();
    if(solves.length === 0){
      return 0;
    }
    var percent = Math.round(100*_.reduce(solves,function(a, b){return a + b;})/solves.length);
    return percent;
  },
  canRemoveRound: function(){
    return canRemoveRound(Meteor.userId(), this._id);
  },
  canAddRound: function(){
    return canAddRound(Meteor.userId(), this.competitionId, this.eventCode);
  },
  formats: function(){
    return wca.formatsByEventCode[this.eventCode];
  }
});

function getSelectedUser(t){
  var nameInput = t.find('input[name="name"]');
  var username = getNameAndUsernameFromUserString(nameInput.value)[1];
  var user = Meteor.users.findOne({
    'username': username
  });
  return user;
}

function getWarningForSheet(competitionId, sheet){
  var round = findRoundForSheet(competitionId, sheet);
  if(!round){
    return "Could not find round for sheet";
  }
  var existingGroup = Groups.findOne({
    roundId: round._id,
    group: sheet.group
  });
  if(existingGroup){
    return "Existing group will be clobbered";
  }
  return null;
}

function maybeEnableUserSelectForm(t){
  var user = getSelectedUser(t);
  var $submit = t.$('button[name="buttonAddUser"]');
  $submit.prop("disabled", !user);
}

Template.editCompetition_users.events({
  'input input[name="name"]': function(e, t){
    maybeEnableUserSelectForm(t);
  },
  'typeahead:selected input[name="name"]': function(e, t){
    maybeEnableUserSelectForm(t);
  },
  'typeahead:autocompleted input[name="name"]': function(e, t){
    maybeEnableUserSelectForm(t);
  },
  'click button[name="buttonRemoveUser"]': function(e, t){
    var user = this;
    var $pull = {};
    $pull[t.data.userIdsAtribute] = user._id;
    Competitions.update({
      _id: t.data.competitionId
    }, {
      $pull: $pull
    });
  },
  'submit form': function(e, t){
    e.preventDefault();

    var user = getSelectedUser(t);
    if(!user){
      // This should never happen, because we only enable
      // submission when the input is valid (ie: the input maps to a user).
      return;
    }
    var $addToSet = {};
    $addToSet[this.userIdsAtribute] = user._id;
    Competitions.update({
      _id: this.competitionId
    }, {
      $addToSet: $addToSet
    });

    // Clear name input and close typeahead dialog
    var $nameInput = t.$('input[name="name"]');
    $nameInput.typeahead('val', '');
    maybeEnableUserSelectForm(t);
  },
});

function getNameAndUsernameFromUserString(userStr){
  var match = userStr.match(/([^(]*)(?:\((.*)\))?/);
  var name = match[1].trim();
  var id = match[2];
  return [ name, id ];
}

function getUploadButtonState(competitionId){
  var uploadedScrambleSets = Session.get("uploadScramblesModal-uploadedScrambleSets");
  if(!uploadedScrambleSets || uploadedScrambleSets.length === 0){
    return "disabled";
  }

  var error = _.some(uploadedScrambleSets, function(uploadedScrambleSet){
    return uploadedScrambleSet.error;
  });
  if(error){
    return "error";
  }

  var warnings = _.some(uploadedScrambleSets, function(uploadedScrambleSet){

    if(!uploadedScrambleSet.tnoodleScrambles){
      return false;
    }
    return _.some(uploadedScrambleSet.tnoodleScrambles.sheets, function(sheet){
      return getWarningForSheet(competitionId, sheet);
    });
  });
  if(warnings){
    return "warning";
  }

  return "";
}

Template.editCompetition_users.rendered = function(){
  var substringMatcher = function(collection, attributes){
    return function findMatches(q, cb){
      var name = getNameAndUsernameFromUserString(q)[0];
      var seenIds = {};
      var arr = [];
      var addResult = function(result){
        if(seenIds[result._id]){
          return;
        }
        seenIds[result._id] = true;
        arr.push(result);
      };

      _.each([true, false], function(startOfWordMatch){
        _.each(attributes, function(attribute){
          var findParams = {};
          var $regex;
          if(startOfWordMatch){
            $regex = "\\b" + RegExp.escape(name);
          }else{
            $regex = RegExp.escape(name);
          }
          findParams[attribute] = {
            $regex: $regex,
            $options: 'i'
          };
          var results = collection.find(findParams).fetch();
          for(var i = 0; i < results.length; i++){
            addResult(results[i]);
          }
        });
      });

      cb(arr);
    };
  };

  this.$('.typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, {
    name: 'users',
    displayKey: function(user){
      return user.profile.name + " (" + user.username + ")";
    },
    source: substringMatcher(Meteor.users, [ 'profile.name', 'username' ]),
  });

  maybeEnableUserSelectForm(this);
};

Template.editCompetition_users.helpers({
  users: function(){
    // TODO - sort by name?
    var comp = Competitions.findOne({ _id: this.competitionId });
    if(!comp || !comp[this.userIdsAtribute]){
      return [];
    }
    return Meteor.users.find({
      _id: {
        $in: comp[this.userIdsAtribute]
      }
    });
  },
  isCurrentUser: function(){
    return Meteor.userId() == this._id;
  }
});

var TNOODLE_ROOT_URL = "http://localhost:2014";
var TNOODLE_VERSION_URL = TNOODLE_ROOT_URL + "/version.json";
var TNOODLE_VERSION_POLL_FREQUENCY_MILLIS = 1000;

var tnoodleStatusPoller = null;
function startPollingTNoodleStatus(){
  if(tnoodleStatusPoller === null){
    tnoodleStatusPoller = setTimeout(pollTNoodleStatus, 0);
  }
}
function stopPollingTNoodleStatus(){
  if(tnoodleStatusPoller !== null){
    clearTimeout(tnoodleStatusPoller);
    tnoodleStatusPoller = null;
  }
}
function pollTNoodleStatus(){
  $.ajax({
    url: TNOODLE_VERSION_URL
  }).done(function(data){
    Session.set("tnoodleStatus", data);
  }).fail(function(){
    Session.set("tnoodleStatus", null);
  });
  tnoodleStatusPoller = setTimeout(pollTNoodleStatus, TNOODLE_VERSION_POLL_FREQUENCY_MILLIS);
}

function getRoundsWithoutScrambles(competitionId){
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

function findRoundForSheet(competitionId, sheet){
  var round = Rounds.findOne({
    competitionId: competitionId,
    eventCode: sheet.event,
    nthRound: (sheet.round - 1)
  });
  return round;
}

function extractJsonFromZip(filename, zipId, pw, cb){
  Meteor.call("unzipTNoodleZip", zipId, pw, function(error, data){
    if(error){
      if(error.reason == "invalid-password"){
        var promptStr = "Enter password for\n" + filename;
        if(pw !== null){
          promptStr = "Wrong password! " + promptStr;
        }
        var newPw = prompt(promptStr);
        if(newPw !== null){
          extractJsonFromZip(filename, zipId, newPw, cb);
        }else{
          cb("Wrong password");
        }
        return;
      }else{
        throw error;
      }
    }
    cb(null, data);
  });
}

Meteor.startup(function(){
  delete Session.keys['uploadScramblesModal-uploadedScrambleSets'];
});

Template.uploadScramblesModal.events({
  'shown.bs.modal .modal': function(e){
    startPollingTNoodleStatus();
  },
  'hidden.bs.modal .modal': function(e){
    stopPollingTNoodleStatus();
  },
  'change input[type="file"]': function(e, t){
    var fileInput = e.currentTarget;
    // Convert FileList to javascript array
    var files = _.map(fileInput.files, _.identity);
    var uploadedScrambleSets = [];

    files.forEach(function(file, index){
      var uploadedScrambleSet = {
        index: index,
        file: file,
        error: null
      };
      uploadedScrambleSets.push(uploadedScrambleSet);

      var addScramblesJsonStr = function(jsonStr){
        var scrambleData;
        try{
          scrambleData = JSON.parse(jsonStr);
          uploadedScrambleSet.tnoodleScrambles = scrambleData;
          Session.set("uploadScramblesModal-uploadedScrambleSets", uploadedScrambleSets);
        }catch(e){
          uploadedScrambleSet.error = "Failed to parse JSON in:\n" + file.name + "\n\n" + e;
          Session.set("uploadScramblesModal-uploadedScrambleSets", uploadedScrambleSets);
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
      reader.onload = function(){
        if(isJson){
          addScramblesJsonStr(reader.result);
        }else if(isZip){
          Meteor.call('uploadTNoodleZip', reader.result, function(error, zipId){
            if(error){
              uploadedScrambleSet.error = error;
              Session.set("uploadScramblesModal-uploadedScrambleSets", uploadedScrambleSets);
              throw error;
            }
            extractJsonFromZip(file.name, zipId, null, function(error, jsonStr){
              if(error){
                uploadedScrambleSet.error = error;
                Session.set("uploadScramblesModal-uploadedScrambleSets", uploadedScrambleSets);
                throw error;
              }
              addScramblesJsonStr(jsonStr);
            });
          });
        }else{
          // Should never get here
          throw "";
        }
      };
      if(isJson){
        reader.readAsText(file);
      }else if(isZip){
        reader.readAsBinaryString(file);
      }else{
        uploadedScrambleSet.error = "Unrecognized file extension:\n" + file.name;
        Session.set("uploadScramblesModal-uploadedScrambleSets", uploadedScrambleSets);
      }
    });
    Session.set("uploadScramblesModal-uploadedScrambleSets", uploadedScrambleSets);
    // Clear selected files so a subsequent select of the same files
    // will fire an event. Note that we *don't* fire a change event
    // here.
    $(fileInput).val('');
  },
  'click #buttonUploadScrambles': function(e, t){
    var competition = this;

    var uploadedScrambleSets = Session.get("uploadScramblesModal-uploadedScrambleSets");

    uploadedScrambleSets.forEach(function(uploadedScrambleSet){
      if(!uploadedScrambleSet.tnoodleScrambles){
        return;
      }
      var tnoodleScrambles = uploadedScrambleSet.tnoodleScrambles;
      tnoodleScrambles.sheets.forEach(function(sheet){
        var round = findRoundForSheet(competition._id, sheet);
        if(!round){
          console.warn("No round found for competitionId: " + competition._id);
          console.warn(sheet);
          return;
        }

        var newGroup = {
          competitionId: round.competitionId,
          roundId: round._id,
          group: sheet.group,
          scrambles: sheet.scrambles,
          extraScrambles: sheet.extraScrambles
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

Template.uploadScramblesModal.rendered = function(){
  // Bootstrap's tooltips are opt in, so just enable it on all elements with a
  // title.
  this.$('[title]').tooltip();
  updateUrlHashForModals();
};

Template.uploadScramblesModal.helpers({
  tnoodleVersionUrl: TNOODLE_VERSION_URL,
  tnoodleStatus: function(){
    return Session.get("tnoodleStatus");
  },
  tnoodleRunningVersionAllowed: function(){
    var tnoodleStatus = Session.get("tnoodleStatus");
    if(!tnoodleStatus){
      return false;
    }
    return _.contains(tnoodleStatus.allowed, tnoodleStatus.running_version);
  },

  roundsWithoutScrambles: function(){
    var competition = this;
    var roundsWithoutScrambles = getRoundsWithoutScrambles(competition._id);
    return roundsWithoutScrambles;
  },
  generateMissingScramblesUrl: function(){
    var competition = this;
    var roundsWithoutScrambles = getRoundsWithoutScrambles(competition._id);

    var params = {};
    params.version = "1.0";
    params.competitionName = competition.competitionName;

    var events = [];
    roundsWithoutScrambles.forEach(function(round){
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
  uploadedScrambleSets: function(){
    var uploadedScrambleSets = Session.get("uploadScramblesModal-uploadedScrambleSets");
    return uploadedScrambleSets;
  },
  warningForUploadedSheet: function(){
    var competition = Template.parentData(2);
    var sheet = this;
    var warning = getWarningForSheet(competition._id, sheet);
    return warning;
  },
  uploadWarning: function(){
    var competition = this;
    var uploadButtonState = getUploadButtonState(competition._id);
    if(uploadButtonState == "error"){
      return "Errors detected, see above for details";
    } else if(uploadButtonState == "warning"){
      return "Warnings detected, see above for details";
    } else if(uploadButtonState == "disabled"){
      return "";
    } else {
      return "";
    }
  },
  classForUploadButton: function(){
    var competition = this;
    var uploadButtonState = getUploadButtonState(competition._id);
    if(uploadButtonState == "error"){
      return "btn-danger";
    } else if(uploadButtonState == "warning"){
      return "btn-warning";
    } else if(uploadButtonState == "disabled"){
      return "disabled";
    } else {
      return "btn-success";
    }
  }
});
