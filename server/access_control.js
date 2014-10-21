Competitions.allow({
  update: function(userId, doc, fields, modifier){
    if(doc.organizers.indexOf(userId) == -1){
      return false;
    }
    var allowedFields = [
      'competitionName',
      'wcaCompetitionId',
      'organizers',
      'staff'
    ];

    // TODO - see https://github.com/jfly/gjcomps/issues/10
    allowedFields.push("listed");

    if(_.difference(fields, allowedFields).length > 0){
      return false;
    }
    return true;
  },
  fetch: [ 'organizers' ]
});
