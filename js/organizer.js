
if(Meteor.isClient) {

  Template.organizerTemplate.myCompetitions = function() {
    var myCompetitions =  Competitions.find(
      { organizers: { $elemMatch: { $in: [ Meteor.userId() ] } } }
    );
    return myCompetitions;
  };

  Template.organizerTemplate.events({
    'submit #newCompetitionForm': function(event) {
      console.log(event);//<<<
      event.preventDefault();
    }
  });

}

Meteor.methods({
  createCompetition: function(competitionName) {
    check(competitionName, String);

    Competitions.insert({
      competitionName: competitionName
    });
  }
});
