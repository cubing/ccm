var log = logging.handle("dataEntry");

var selectedResultIdReact = new ReactiveVar(null);
Router.onBeforeAction(function() {
  // Clear selected result
  selectedResultIdReact.set(null);
  $('#inputCompetitorName').val('');
  this.next();
});

Template.dataEntry.helpers({
  isSelectedRoundClosed: function() {
    if(!this.roundId) {
      // If there's no round selected, then the selected round is definitely
      // *not* closed =)
      return false;
    }
    var status = getRoundAttribute(this.roundId, 'status');
    return status === wca.roundStatuses.closed;
  },
  openRounds: function() {
    var openRounds = Rounds.find({
      competitionId: this.competitionId,
      status: wca.roundStatuses.open,
    }, {
      sort: {
        eventCode: 1,
        nthRound: 1,
      }
    });
    return openRounds;
  },
  closedRounds: function() {
    var closedRounds = Rounds.find({
      competitionId: this.competitionId,
      status: wca.roundStatuses.closed,
    }, {
      sort: {
        eventCode: 1,
        nthRound: 1,
      }
    });
    return closedRounds;
  },
  isSelectedRound: function() {
    var data = Template.parentData(1);
    var selectedRoundId = data.roundId;
    return selectedRoundId == this._id;
  },
});

Template.roundDataEntry.rendered = function() {
  var template = this;
  template.autorun(function() {
    // Highlight the currently selected result row.
    var selectedResultId = selectedResultIdReact.get();
    var $resultRows = template.$('tr.result');
    $resultRows.removeClass('selectedResult');
    if(selectedResultId) {
      var $selectedRow = $resultRows.filter('[data-result-id="' + selectedResultId + '"]');
      $selectedRow.addClass('selectedResult');
    }
  });

  var $sidebar = template.$('.results-sidebar');
  $sidebar.affix({
    offset: {
      top: function() {
        var parentTop = $sidebar.parent().offset().top;
        var affixTopSpacing = 20; // From .results-sidebar.affix in dataEntry.less
        return parentTop - affixTopSpacing;
      },
    }
  });

  // This is subtle: we want to only query for users that are *in* the current round.
  // As the selected round changes (or less likely, but still possible:
  // competitors are added/removed from the round), we want to recompute the set
  // of userIds we're interested in.
  // Note that we are careful to never redefine the usernames array
  // (only mutate it), because we passed it into our typeahead's source.
  var usernames = [];
  template.autorun(function() {
    var data = Template.currentData();
    var results = Results.find({
      roundId: data.roundId,
    }, {
      fields: {
        userId: 1,
      }
    }).fetch();

    // Urg, minimongo doesn't index, so we build our own.
    var users = Meteor.users.find({
    }, {
      fields: {
        "profile.name": 1
      },
    }).fetch();
    var userById = {};
    _.each(users, function(user) {
      userById[user._id] = user;
    });

    usernames.length = 0;
    _.each(results, function(result) {
      var user = userById[result.userId];
      // TODO - https://github.com/jfly/gjcomps/issues/83
      usernames.push({ _id: user._id, name: user.profile.name });
    });
  });

  this.$('.typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, {
    name: 'users',
    displayKey: function(obj) {
      return obj.name;
    },
    source: substringMatcher(usernames, 'name'),
  });
};
Template.roundDataEntry.helpers({
  selectedResultId: function() {
    return selectedResultIdReact.get();
  },
  selectedSolves: function() {
    var selectedResultId = selectedResultIdReact.get();
    var result = Results.findOne({ _id: selectedResultId });
    var roundFormatCode = getRoundAttribute(this.roundId, 'formatCode');
    var roundFormat = wca.formatByCode[roundFormatCode];
    var solves = result.solves || [];
    while(solves.length < roundFormat.count) {
      solves.push(null);
    }
    return solves;
  },
  editableSolveTimeFields: function() {
    var data = Template.parentData(1);
    var eventCode = getRoundAttribute(data.roundId, 'eventCode');
    var fields = wca.eventByCode[eventCode].solveTimeFields;
    if(!fields) {
      // jChester will only use its default if the value for
      // editableSolveTimeFields is undefined, null won't work.
      return undefined;
    }
    var obj = {};
    _.each(fields, function(field) {
      obj[field] = true;
    });
    return obj;
  },
});

function userMaybeSelected(template, roundId) {
  var nameInput = template.$('input[name="name"]');
  var name = nameInput.val();
  var user = Meteor.users.findOne({
    'profile.name': name,
  }, {
    fields: {
      _id: 1,
    }
  });
  if(!user) {
    selectedResultIdReact.set(null);
    return;
  }

  var result = Results.findOne({
    roundId: roundId,
    userId: user._id,
  }, {
    fields: {
      _id: 1,
    }
  });
  assert(result);
  if(!result) {
    log.l0("Unexpectedly failed to find result in round id:", roundId,
           "for user id:", user._id);
    selectedResultIdReact.set(null);
    return;
  }

  selectedResultIdReact.set(result._id);
  setTimeout(function() {
    // TODO <<< add focus to jChester api >>>
    template.$('.jChester').first().triggerHandler('focus');
  }, 0);
}

Template.roundDataEntry.events({
  'click #selectableResults tr.result': function(e, template) {
    var $row = $(e.currentTarget);
    var resultId = $row.data('result-id');

    var result = Results.findOne({
      _id: resultId,
    }, {
      fields: {
        userId: 1,
      }
    });
    assert(result);

    var user = Meteor.users.findOne({
      _id: result.userId,
    }, {
      fields: {
        // TODO - https://github.com/jfly/gjcomps/issues/83#issuecomment-67926066
        'profile.name': 1,
      }
    });
    assert(user);

    var nameInput = template.$('input[name="name"]');
    // TODO - https://github.com/jfly/gjcomps/issues/83#issuecomment-67926066
    nameInput.val(user.profile.name);

    userMaybeSelected(template, this.roundId);
  },
  'typeahead:selected .typeahead': function(e, template, suggestion, datasetName) {
    userMaybeSelected(template, this.roundId);
  },
  'typeahead:autocompleted .typeahead': function(e, template, suggestion, datasetName) {
    userMaybeSelected(template, this.roundId);
  },
  'keydown .typeahead': function(e, template) {
    if(e.which == 13) {
      userMaybeSelected(template, this.roundId);
    }
  },
  'input .typeahead': function(e, template) {
    // Wait for stronger user intent before we show the data entry fields.
    // If there are two competitors: "Jay" and "Jayman", we wouldn't want to
    // force the user to start entering times for "Jay" when they were really just
    // typing the first 3 letters of "Jayman".
    selectedResultIdReact.set(null);
  },
});
