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
  //<<< TODO >>>
  Accounts.addAutopublishFields({
    // publish all fields including access token, which can legitimately
    // be used from the client (if transmitted over ssl or on
    // localhost). https://developers.facebook.com/docs/concepts/login/access-tokens-and-types/,
    // "Sharing of Access Tokens"
    forLoggedInUser: ['services.facebook'],
    forOtherUsers: [
      // https://www.facebook.com/help/167709519956542
      'services.facebook.id', 'services.facebook.username', 'services.facebook.gender'
    ]
  });
}
