Template.exportResults.created = function() {
  var template = this;
  this.wcaResultsReact = new ReactiveVar(null);
  this.exportProblemsReact = new ReactiveVar(null);
};

Template.exportResults.helpers({
  wcaResultsJson: function() {
    var template = Template.instance();
    var wcaResults = template.wcaResultsReact.get();
    if(!wcaResults) {
      return '';
    }
    var wcaResultsJson = JSON.stringify(wcaResults, undefined, 2);
    return wcaResultsJson;
  },
  problems: function() {
    var template = Template.instance();
    return template.exportProblemsReact.get();
  }
});

Template.exportResults.events({
  'click #buttonGenerateWcaResults': function(e, template) {
    Meteor.call('exportWcaResults', this.competitionId, this.competitionUrlId, function(err, result) {
      if(err) {
        template.wcaResultsReact.set(null);
        template.exportProblemsReact.set([err]);
      } else {
        template.wcaResultsReact.set(result.wcaResults);
        template.exportProblemsReact.set(result.exportProblems);
      }
    });
  },
});
