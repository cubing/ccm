Template.roundResultsList.rendered = function() {
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
  results: function() {
    var results = Results.find({
      competitionId: this.competitionId,
      roundId: this.roundId,
    });
    return results;
  },
  competitorName: function() {
    var user = Meteor.users.findOne({
      _id: this.userId
    }, {
      fields: {
        "profile.name": 1
      }
    });
    return user.profile.name;
  },
  competitorAdvanced: function() {
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
          callback: function(doc, element) {
            console.log(doc);//<<<
            console.log(element);//<<<
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
