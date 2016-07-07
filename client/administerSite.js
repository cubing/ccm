Template.administerSite.helpers({
  userPickerSettings: function() {
    return {
      collectionName: 'Meteor.users',
      field: 'profile.name',
      addDoc: function(userId) {
        Meteor.call('addSiteAdmin', userId);
      },
      removeDoc: function(userId) {
        Meteor.call('removeSiteAdmin', userId);
      },
      docCriteria: {
        siteAdmin: true,
      },
      isDeletable: function(user) {
        return user._id !== Meteor.userId();
      },
      pillTemplateName: 'userPill',
    };
  },
});

Template.administerSite.events({
});
