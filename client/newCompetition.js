var newCompetitionNameReact = new ReactiveVar(null);
var uploadedCompetitionReact = new ReactiveVar(null);

Template.newCompetition.created = function() {
  newCompetitionNameReact.set(null);
  uploadedCompetitionReact.set(null);
};

Template.newCompetition.helpers({
  'newCompetitionName': function() {
    return newCompetitionNameReact.get();
  },
  'uploadedCompetition': function() {
    return uploadedCompetitionReact.get();
  },
});
Template.newCompetition.events({
  'input #formNewCompetition input[type="text"]': function(e, template) {
    newCompetitionNameReact.set(e.currentTarget.value);
  },
  'submit #formNewCompetition': function(e) {
    e.preventDefault();

    var form = e.currentTarget;
    var competitionName = form.inputCompetitionName.value;
    Meteor.call("createCompetition", competitionName, function(err, competitionId) {
      if(err) {
        throw err;
      }
      Router.go('manageCompetition', {
        competitionUrlId: competitionId
      });
    });
  },

  'change #formImportCompetition input[type="file"]': function(e, template) {
    uploadedCompetitionReact.set(null);

    var fileInput = e.currentTarget;
    var file = fileInput.files[0];

    var reader = new FileReader();
    reader.onload = function() {
      var wcaCompetition = JSON.parse(reader.result);
      uploadedCompetitionReact.set(wcaCompetition);
    };
    reader.readAsText(file);
  },
  'submit #formImportCompetition': function(e, template) {
    e.preventDefault();

    var $form = $(e.currentTarget);
    var wcaCompetition = uploadedCompetitionReact.get();

    $form.css('cursor', 'wait');
    $form.find('button').addClass('disabled');
    Meteor.call('uploadCompetition', wcaCompetition, function(err, competitionId) {
      $form.css('cursor', '');
      $form.find('button').removeClass('disabled');
      if(err) {
        throw err;
      }
      Router.go('manageCompetition', {
        competitionUrlId: competitionId
      });
    });
  },
});
