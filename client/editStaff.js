// <<< To create an OAuth account on someone's behalf:
//  Meteor.users.insert({services: {worldcubeassociation: {id: 6145}}, emails: [], createdAt: new Date(), siteAdmin: true})
Template.editStaff.helpers({
  staff: function() {
    return CompetitionStaff.find({ competitionId: this.competitionId });
  },
});
