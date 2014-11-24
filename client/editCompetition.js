setCompetitionAttribute = function(competitionId, attribute, value) {
  var update;
  if(value === null || typeof value === "undefined") {
    var toUnset = {};
    toUnset[attribute] = 1;
    update = { $unset: toUnset };
  } else {
    var toSet = {};
    toSet[attribute] = value;
    update = { $set: toSet };
  }
  Competitions.update({ _id: competitionId }, update);
};

Template.editCompetition.events({
  'input input[type="text"]': function(e) {
    if($(e.currentTarget).hasClass("typeahead")) {
      return;
    }
    var attribute = e.currentTarget.name;
    var value = e.currentTarget.value;
    setCompetitionAttribute(this.competitionId, attribute, value);
  },
  'change input[type="checkbox"]': function(e) {
    var attribute = e.currentTarget.name;
    var value = e.currentTarget.checked;
    setCompetitionAttribute(this.competitionId, attribute, value);
  },
  'click #toggleCompetitionListed': function(e) {
    var listed = getCompetitionAttribute(this.competitionId, 'listed');
    setCompetitionAttribute(this.competitionId, 'listed', !listed);
  },
  'click button[name="buttonDeleteCompetition"]': function(e) {
    var that = this;
    // Note that we navigate away from the competition page first, and wait for the
    // navigation to complete before we actually delete the competition. This
    // avoids a bunch of spurious error messages in the console due to looking
    // up attributes of a competition that no longer exists.
    Router.go('home');
    setTimeout(function() {
      Meteor.call("deleteCompetition", that.competitionId, function(err, data) {
        if(err) {
          throw err;
        }
      });
    }, 0);
  },
  'click button[name="buttonAddRound"]': function(e, t) {
    Meteor.call('addRound', this.competitionId, this.eventCode);
  },
  'click button[name="buttonRemoveRound"]': function(e, t) {
    var lastRoundResultsCount = getLastRoundResultsCount(this.competitionId, this.eventCode);
    if(lastRoundResultsCount > 0) {
      $("#modalReallyRemoveRound" + this.eventCode).modal('show');
    } else {
      var lastRoundId = getLastRoundIdForEvent(this.competitionId, this.eventCode);
      Meteor.call('removeRound', lastRoundId);
    }
  },
  'click button[name="buttonReallyRemoveRound"]': function(e, t) {
    var lastRoundId = getLastRoundIdForEvent(this.competitionId, this.eventCode);
    assert(lastRoundId);
    $("#modalReallyRemoveRound" + this.eventCode).modal('hide');
    Meteor.call('removeRound', lastRoundId);
  },
  'click button[name="buttonOpenRound"]': function(e, t) {
    Rounds.update({
      _id: this._id,
    }, {
      $set: {
        status: wca.roundStatuses.open,
      }
    });
  },
  'click button[name="buttonCloseRound"]': function(e, t) {
    Rounds.update({
      _id: this._id,
    }, {
      $set: {
        status: wca.roundStatuses.closed,
      }
    });
  },
  'click button[name="buttonAdvanceCompetitors"]': function(e, t) {
    console.log(this);//<<<
  },
  'change select[name="roundFormat"]': function(e) {
    var select = e.currentTarget;
    var formatCode = select.value;
    var roundId = this._id;
    Rounds.update({
      _id: roundId
    }, {
      $set: {
        formatCode: formatCode
      }
    });
  },
});

function getRoundProgressPercentage(roundId) {
  var results = Results.find({
    roundId: roundId,
  }, {
    fields: {
      solves: 1,
    }
  });
  var solves = _.chain(results.fetch())
    .pluck("solves")
    .flatten()
    .map(function(time) {
      return time ? 1 : 0;
    })
    .value();
  if(solves.length === 0) {
    return 0;
  }
  var percent = Math.round(100*_.reduce(solves, function(a, b) {return a + b;})/solves.length);
  return percent;
}

function getLastRoundResultsCount(competitionId, eventCode) {
  var roundId = getLastRoundIdForEvent(competitionId, eventCode);
  if(!roundId) {
    return false;
  }
  var resultsForRound = Results.find({
    roundId: roundId,
  }, {
    fields: {
      _id: 1,
    }
  });
  return resultsForRound.count();
}

var eventCountPerRowByDeviceSize = {
  xs: 1,
  sm: 2,
  md: 2,
  lg: 3,
};
Template.editCompetition.helpers({
  events: function() {
    var that = this;
    var events = _.map(_.toArray(wca.eventByCode), function(e, i) {
      return {
        index: i,
        competitionId: that.competitionId,
        eventCode: e.code,
        eventName: e.name
      };
    });
    return events;
  },
  eventColumnsClasses: function() {
    var classes = _.map(eventCountPerRowByDeviceSize, function(eventCount, deviceSize) {
      var cols = Math.floor(12 / eventCount);
      return "col-" + deviceSize + "-" + cols;
    });
    return classes.join(" ");
  },
  clearfixVisibleClass: function() {
    var that = this;
    var classes = _.map(eventCountPerRowByDeviceSize, function(eventCount, deviceSize) {
      if((that.index + 1) % eventCount === 0) {
        return 'visible-' + deviceSize + '-block';
      }
      return '';
    });
    return classes.join(" ");
  },

  rounds: function() {
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
  competitorCount: function() {
    var results = Results.find({
      competitionId: this.competitionId,
      roundId: this._id
    }, {
      fields: {
        _id: 1
      }
    });
    return results.count();
  },
  roundProgressPercentage: function() {
    return getRoundProgressPercentage(this._id);
  },
  lastRoundResultsCount: function() {
    return getLastRoundResultsCount(this.competitionId, this.eventCode);
  },
  canRemoveRound: function() {
    var roundId = getLastRoundIdForEvent(this.competitionId, this.eventCode);
    if(!roundId) {
      return false;
    }
    return canRemoveRound(Meteor.userId(), roundId);
  },
  canAddRound: function() {
    return canAddRound(Meteor.userId(), this.competitionId, this.eventCode);
  },
  formats: function() {
    return wca.formatsByEventCode[this.eventCode];
  },
  scheduleDescription: function() {
    var startDate = getCompetitionStartDateMoment(this.competitionId);
    if(!startDate) {
      return "Unscheduled";
    }
    var endDate = getCompetitionEndDateMoment(this.competitionId);
    assert(endDate);
    var formatStr = "MMMM D, YYYY";
    var rangeStr = $.fullCalendar.formatRange(startDate, endDate, formatStr);
    return startDate.fromNow() + " (" + rangeStr + ")";
  },
  roundComplete: function() {
    return getRoundProgressPercentage(this._id) === 100;
  },
  roundOpen: function() {
    var status = getRoundAttribute(this._id, 'status');
    return status == wca.roundStatuses.open;
  },
  canCloseRound: function() {
    var status = getRoundAttribute(this._id, 'status');
    return status == wca.roundStatuses.open;
  },
  canOpenRound: function() {
    var nextRound = Rounds.findOne({
      competitionId: this.competitionId,
      eventCode: this.eventCode,
      nthRound: this.nthRound + 1,
    }, {
      fields: {
        status: 1
      }
    });
    if(nextRound && nextRound.status != wca.roundStatuses.unstarted) {
      // If there's a next round that is already opened (or
      // closed), we can't reopen this round.
      return false;
    }
    if(this.status == wca.roundStatuses.unstarted) {
      var results = Results.find({
        roundId: this._id,
      }, {
        fields: {
          _id: 1,
        }
      });
      // Only allow opening this unstarted round if there are some people *in*
      // the round.
      return results.count() > 0;
    }
    return this.status == wca.roundStatuses.closed;
  },
  canAdvanceRound: function() {
    if(this.status != wca.roundStatuses.closed) {
      // We only allow advancing from rounds when they are closed
      return false;
    }
    var nextRound = Rounds.findOne({
      competitionId: this.competitionId,
      eventCode: this.eventCode,
      nthRound: this.nthRound + 1,
    }, {
      fields: {
        status: 1
      }
    });
    if(!nextRound) {
      // We can't possibly advance people from this round if there is no next
      // round.
      return false;
    }
    return nextRound.status == wca.roundStatuses.unstarted;
  },
  isCurrentRoundFormat: function() {
    var round = Template.parentData(1);
    var formatCode = this.toString();
    return round.formatCode == formatCode;
  },
});

function getSelectedUser(t) {
  var nameInput = t.find('input[name="name"]');
  var userId = getNameAndIdFromUserString(nameInput.value)[1];
  var user = Meteor.users.findOne({ _id: userId });
  return user;
}

function maybeEnableUserSelectForm(t) {
  var user = getSelectedUser(t);
  var $submit = t.$('button[name="buttonAddUser"]');
  $submit.prop("disabled", !user);
}

Template.editCompetition_users.events({
  'input input[name="name"]': function(e, t) {
    maybeEnableUserSelectForm(t);
  },
  'typeahead:selected input[name="name"]': function(e, t) {
    maybeEnableUserSelectForm(t);
  },
  'typeahead:autocompleted input[name="name"]': function(e, t) {
    maybeEnableUserSelectForm(t);
  },
  'click button[name="buttonRemoveUser"]': function(e, t) {
    var user = this;
    var $pull = {};
    $pull[t.data.userIdsAtribute] = user._id;
    Competitions.update({
      _id: t.data.competitionId
    }, {
      $pull: $pull
    });
  },
  'submit form': function(e, t) {
    e.preventDefault();

    var user = getSelectedUser(t);
    if(!user) {
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

function getNameAndIdFromUserString(userStr) {
  var match = userStr.match(/([^(]*)(?:\((.*)\))?/);
  var name = match[1].trim();
  var id = match[2];
  return [ name, id ];
}

Template.editCompetition_users.rendered = function() {
  var substringMatcher = function(collection, attributes) {
    return function findMatches(q, cb) {
      var name = getNameAndIdFromUserString(q)[0];
      var seenIds = {};
      var arr = [];
      var addResult = function(result) {
        if(seenIds[result._id]) {
          return;
        }
        seenIds[result._id] = true;
        arr.push(result);
      };

      _.each([true, false], function(startOfWordMatch) {
        _.each(attributes, function(attribute) {
          var findParams = {};
          var $regex;
          if(startOfWordMatch) {
            $regex = "\\b" + RegExp.escape(name);
          } else {
            $regex = RegExp.escape(name);
          }
          findParams[attribute] = {
            $regex: $regex,
            $options: 'i'
          };
          var results = collection.find(findParams).fetch();
          for(var i = 0; i < results.length; i++) {
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
    displayKey: function(user) {
      return user.profile.name + " (" + user._id + ")";
    },
    source: substringMatcher(Meteor.users, [ 'profile.name' ]),
  });

  maybeEnableUserSelectForm(this);
};

Template.editCompetition_users.helpers({
  users: function() {
    // TODO - sort by name?
    var comp = Competitions.findOne({ _id: this.competitionId });
    if(!comp || !comp[this.userIdsAtribute]) {
      return [];
    }
    return Meteor.users.find({
      _id: {
        $in: comp[this.userIdsAtribute]
      }
    });
  },
  isCurrentUser: function() {
    return Meteor.userId() == this._id;
  }
});

Template.editCompetition_userRow.helpers({
  isMe: function() {
    return this._id == Meteor.userId();
  },
});
