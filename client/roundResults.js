Template.roundResultsList.rendered = function() {
  console.log(Date.now() + " roundResultsList.rendered");//<<<
  var template = this;

  var $sidebar = template.$('.results-sidebar');
  $sidebar.affix({
    offset: {
      top: function() {
        var parentTop = $sidebar.parent().offset().top;
        var affixTopSpacing = 20; // From .results-sidebar.affix in roundResults.css
        return parentTop - affixTopSpacing;
      },
    }
  });
};
Template.roundResultsList.helpers({
  solveCount: function() {
    var formatCode = getRoundAttribute(this.roundId, 'formatCode');
    var format = wca.formatByCode[formatCode];
    return format.count;
  },
  roundCumulativeResultFieldName: function() {
    var formatCode = getRoundAttribute(this.roundId, 'formatCode');
    var format = wca.formatByCode[formatCode];
    return format.averageName;
  },
  resultsData: function() {
    var results = Results.find({
      competitionId: this.competitionId,
      roundId: this.roundId,
    }, {
      //limit: 50, https://github.com/jfly/gjcomps/issues/75
      sort: {
        'position': 1,
      },
    });

    var users = Meteor.users.find({
    }, {
      fields: {
        "profile.name": 1
      },
      reactive: false,
    }).fetch();
    var userById = {};
    _.each(users, function(user) {
      userById[user._id] = user;
    });

    var formatCode = getRoundAttribute(this.roundId, 'formatCode');
    var format = wca.formatByCode[formatCode];

    return {
      results: results,
      userById: userById,
      primarySortField: format.averageName,
    };
  },
  competitorName: function() {
    var resultsData = Template.parentData(1);
    return resultsData.userById[this.userId].profile.name;
  },
  isPrimarySortField: function(fieldName) {
    var resultsData = Template.parentData(1);
    return resultsData.primarySortField.toLowerCase() == fieldName.toLowerCase();
  },
  competitorAdvanced: function() {
    //<<< The following code is really slow. >>>
    // We're going to have to expand our schema to keep track of advancement.
    // See https://github.com/jfly/gjcomps/issues/23
    if(true) {
      return false;//<<<
    }
    var round = Rounds.findOne({
      _id: this.roundId,
    }, {
      fields: {
        competitionId: 1,
        eventCode: 1,
        nthRound: 1,
      }
    });
    var nextRound = Rounds.findOne({
      competitionId: round.competitionId,
      eventCode: round.eventCode,
      nthRound: round.nthRound + 1,
    }, {
      fields: {
        _id: 1,
        competitionId: 1,
      }
    });
    if(!nextRound) {
      // Nobody advances from final rounds =)
      return false;
    }
    var results = Results.findOne({
      competitionId: nextRound.competitionId,
      roundId: nextRound._id,
      userId: this.userId,
    });
    return !!results;
  },
  drawAdvanceLine: function() {
    var rootData = Template.parentData(2);
    if(!rootData.configurableAdvanceCount) {
      return false;
    }
    return rootData.advanceCount == this.position;
  },

  autocompleteSettings: function() {
    var results = Results.find({
      competitionId: this.competitionId,
      roundId: this.roundId,
    }, {
      fields: {
        userId: 1,
      }
    }).fetch();
    return {
      position: 'bottom',
      limit: 10,
      rules: [
        {
          // token: '',
          collection: MeteorUsersPreferentialMatching,
          filter: {
            _id: {
              $in: _.pluck(results, 'userId'),
            }
          },
          field: 'profile.name',
          matchAll: true,
          template: Template.roundResults_namePill,
          callback: function() {
            var rootData = Template.parentData(2);
            rootData.selectCompetitorListener.apply(this, arguments);
          }
        }
      ]
    };
  },
});

var autocompleteEnteredReact = new ReactiveVar(null);

Template.roundResultsList.events({
  'input #inputCompetitorName': function(e) {
    autocompleteEnteredReact.set(e.currentTarget.value);
  },
  'focus #inputCompetitorName': function(e) {
    e.currentTarget.select();
  },
});

Template.roundResults_namePill.helpers({
  highlightedName: function() {
    var substring = autocompleteEnteredReact.get();
    var string = this.profile.name;

    if(substring.length === 0) {
      return _.escape(string);
    }

    var prettyFormat = "";
    var index = 0;
    while(index < string.length) {
      var substringStartIndex = string.toLowerCase().indexOf(substring.toLowerCase(), index);
      if(substringStartIndex < 0) {
        prettyFormat += _.escape(string.substring(index));
        break;
      }
      prettyFormat += _.escape(string.substring(index, substringStartIndex));
      var substringEndIndex = substringStartIndex + substring.length;
      assert(substringEndIndex <= string.length);
      prettyFormat += "<strong>" + _.escape(string.substring(substringStartIndex, substringEndIndex)) + "</strong>";
      index = substringEndIndex;
    }

    return prettyFormat;
  },
});
