import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

const EditProfile = React.createClass({
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
    console.log(user);

    return (
      <div className='container'>
        <h4>
          Your profile
          <small>
            {user ?
              <div>
                We got this information from your account on
                <a href='https://www.worldcubeassociation.org' target='_blank'>worldcubeassociation.org</a>.
                If any of it looks wrong, 
                <a href='https://www.worldcubeassociation.org/profile/edit' target='_blank'>edit your WCA account</a>,
                and <logoutButton/> and log right back in.)
              </div>
            : <p>Ok, now log back in!</p>}
          </small>
        </h4>
        <hr/>

        {user ?
          <div className='text-center'>
            <h1>{user.profile.name}
              <span className={`flag-icon flag-icon-${this.countryId()}`}></span>
            </h1>
            <p><b>Date Of Birth</b>: {this.birthdate()}</p>
            <p><b>WcaId</b>: {user.profile.wcaId}</p>
            <b>Avatar</b>:<br/>
            {user.services.worldcubeassociation && user.services.worldcubeassociation.avatar ? 
              <img src={user.services.worldcubeassociation.avatar.thumb_url}/>
            : null}
        </div> : null}
      </div>
    );
  }
});

export default createContainer((props) => {
  return {
    user: Meteor.user()
  }
}, EditProfile);
