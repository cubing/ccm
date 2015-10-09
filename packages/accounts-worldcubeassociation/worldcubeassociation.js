Accounts.oauth.registerService('worldcubeassociation');

if (Meteor.isClient) {
  // There's currently no way to configure the capitalized name of a service. See:
  //  https://github.com/meteor/meteor/blob/48264ccafdcdfe6ff88b59ea8fc5631210d79818/packages/accounts-ui-unstyled/login_buttons_single.js#L63
  Meteor.loginWithWorldcubeassociation = function(options, callback) {
    // support a callback without options
    if (! callback && typeof options === "function") {
      callback = options;
      options = null;
    }

    var credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
    WorldCubeAssociation.requestCredential(options, credentialRequestCompleteCallback);
  };
} else {
  Accounts.addAutopublishFields({
    // publish all fields including access token, which can legitimately
    // be used from the client (if transmitted over ssl or on
    // localhost).
    forLoggedInUser: ['services.worldcubeassociation'],
    forOtherUsers: [
      'services.worldcubeassociation.id',
      'services.worldcubeassociation.name',
      'services.worldcubeassociation.wca_id',
    ]
  });
}
