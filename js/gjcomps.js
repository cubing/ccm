Competitions = new Meteor.Collection("competitions");
People = new Meteor.Collection("people");
Rounds = new Meteor.Collection("rounds");
Results = new Meteor.Collection("results");
Groups = new Meteor.Collection("groups");

if(Meteor.isClient) {
  Template.compsTemplate.allComps = function() {
    return Competitions.find({}, {
      fields: {
        wcaCompetitionId: 1
      }
    });
  };

  Template.compTemplate.events = function() {
    var events = Rounds.find(
      { competitionId: this._id }
    ).fetch();

    events = _.uniq(events, function(e) { return e.eventCode; });
    return events;
  };

  Template.compTemplate.rounds = function() {
    var rounds = Rounds.find(
      { competitionId: this.competitionId, eventCode: this.eventCode }
    );
    return rounds;
  };

  Template.roundTemplate.results = function() {
    var results = Results.find(
      { roundId: this.round._id },
      {}
    );
    return results;
  };
  Template.personTemplate.results = function() {
    var results = Results.find(
      { personId: this.person._id }
    );
    console.log(results);
    return results;
  };
}

if(Meteor.isServer) {
  Meteor.publish('competitions', function() {
    return Competitions.find({}, { fields: { wcaCompetitionId: 1 } });
  });

  Meteor.publish('competition', function(wcaCompetitionId) {
    var competition = Competitions.findOne({ wcaCompetitionId: wcaCompetitionId });
    return [
      Competitions.find({ _id: competition._id }),
      Rounds.find({ competitionId: competition._id }),
      Results.find({ competitionId: competition._id }),
      People.find({_id: {$in: _.pluck(competition.people,"_id")},{fields:{_id:1,name:1,wcaId:1,countryId:1,gender:1}});
    ];
  });

  Meteor.publish("people",function(){
    return People.find({},{fields:{_id:1,name:1,wcaId:1,countryId:1,gender:1}});
  });

  Meteor.publish("person",function(personName){
   // var competition = Competitions.findOne({ wcaCompetitionId: wcaCompetitionId });
    return People.find({name:personName},{fields:{_id:1,name:1,wcaId:1,countryId:1,gender:1}});
    //         Competitions.find({ _id: competition._id }),
    //         Rounds.find({ competitionId: competition._id }),
    //         Results.find({ competitionId: competition._id }),
    // ];  
  });
}
