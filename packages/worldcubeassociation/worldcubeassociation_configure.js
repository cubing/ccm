// There's currently no way to configure the capitalized name of a service. See:
//  https://github.com/meteor/meteor/blob/48264ccafdcdfe6ff88b59ea8fc5631210d79818/packages/accounts-ui-unstyled/login_buttons_single.js#L63
Template.configureLoginServiceDialogForWorldcubeassociation.helpers({
  siteUrl: function () {
    return Meteor.absoluteUrl() + "_oauth/worldcubeassociation";
  }
});

Template.configureLoginServiceDialogForWorldcubeassociation.fields = function () {
  return [
    {property: 'appId', label: 'App ID'},
    {property: 'secret', label: 'App Secret'}
  ];
};
