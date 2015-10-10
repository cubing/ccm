Accounts.onLogin(function(user_wrapper) {
  let user = user_wrapper.user;
  let wca = user.services.worldcubeassociation;
  if(wca) {
    Meteor.users.update(user._id, {
      $set: {
        'profile.name': wca.name,
        'profile.wcaId': wca.wca_id,
        // The WCA doesn't expose these fields yet =(
        // See https://github.com/cubing/ccm/issues/259
        //'profile.countryId': wca.country_id,
        //'profile.gender': wca.gender,
        //'profile.dob': wca.dob,
      }
    });
  }
});
