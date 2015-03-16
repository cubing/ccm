Template.participantResults.helpers({
  results: function() {
    var results = Results.find({
      competitionId: this.competitionId,
      registrationId: this.registration._id,
    }, {
      sort: {
        roundId: 1,
      }
    });
    var resultsArray = results.fetch();
    //This big lot of code here is just sorting Results
    //by event name, and then organizing each round number
    //in ascending order.
    var groupByEvent = {};
    for(var i = 0; i < resultsArray.length; i++) {
      var round = Rounds.findOne({_id:resultsArray[i].roundId});
      if(groupByEvent.hasOwnProperty(round.eventCode)) {
        var len = groupByEvent[round.eventCode].length;
        groupByEvent[round.eventCode][len] = resultsArray[i];
      } else {
        groupByEvent[round.eventCode] = [resultsArray[i]];
      }
    }
    var grouped = [];
    for(i in groupByEvent) {
      var obj = {};
      obj.event = i;
      obj.times = groupByEvent[i];
      //Need to sort obj['times'] by nthRound
      var sorted_times = [];
      for(var x = 0; x < groupByEvent[i].length; x++) {
        var roundId = groupByEvent[i][x].roundId;
        var roundRef = Rounds.findOne({_id:roundId});
        var nthRound = parseInt(roundRef.nthRound);
        sorted_times[nthRound-1] = groupByEvent[i][x];
      }
      obj.sorted_times = sorted_times;

      grouped[grouped.length] = obj;
    }
    return grouped;
  },
  events: function() {
    var registeredEvents = this.registration.registeredEvents;
    return registeredEvents;
  },
  eventName: function() {
    var round = Rounds.findOne({_id:this.roundId});
    return round.eventCode;
  },
  roundNumber: function() {
    var round = Rounds.findOne({_id:this.roundId});
    return round.nthRound;
  },
  best: function() {
    return this.solves[this.bestIndex];
  },
  competitorName: function() {
    return this.registration.uniqueName;
  },
  numSolves: function() {
    return 5;
  },
  wcaProfileUrl: function() {
    var wcaId = this.registration.wcaId;
    return 'https://www.worldcubeassociation.org/results/p.php?i='+wcaId;
  }
});
