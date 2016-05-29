import React from 'react';
import ReactDOM from 'react-dom';

const EditProfileView = React.createClass({
  birthdate() {
    return this.props.user ? formatMomentDate(moment(this.props.user.profile.dob)) : null;
  },

  gender() {
    return this.props.user ? wca.genderByValue(this.props.user.profile.gender) : null;
  },

  countryId() {
    return this.props.user ? this.props.user.profile.countryId.toLowerCase() : null;
  },

  render() {
    let {user} = this.props;

    let logoutButton = (
      <button className='btn btn-sm' id='logout-button' onClick={this.logOut}>Log Out</button>
    );

    return (
      <div class="container">
        <h4>
          Your profile
          <small>
            {user ?
              <div>
                We got this information from your account on
                <a href="https://www.worldcubeassociation.org" target="_blank">worldcubeassociation.org</a>.
                If any of it looks wrong,
                <a href="https://www.worldcubeassociation.org/profile/edit" target="_blank">edit your WCA account</a>,
                and <logoutButton/> and log right back in.)
              </div> :
            'Ok, now log back in!'}
          </small>
        </h4>
        <hr/>

        <div class="text-center">
          <p>
            {!user && user.profile.name ?
              <span class="flag-icon flag-icon-countryId"></span> :
            null}
          </p>
          <p><b>Date Of Birth</b>: {this.birthdate()}</p>
          <p><b>WcaId</b>: {user.profile.wcaId}</p>
          <b>Avatar</b>:<br/>
          {user.services.worldcubeassociation.avatar ?
            <img src={user.services.worldcubeassociation.avatar.thumb_url}/> :
          null}
        </div>
      </div>
    );
  }
});

Template.editProfile.rendered = function() {
  let template = this;
  template.autorun(() => {
    ReactDOM.render(
      <EditProfileView
        user={Meteor.user()}/>,
        template.$(".reactRenderArea")[0]
    );
  });
};
