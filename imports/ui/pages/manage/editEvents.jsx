import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

const EditEvents = React.createClass({

  render() {
    return (
      <div>
      </div>
    );
  }
});

export default createContainer((props) => {
  let subscription = Meteor.subscribe('competition', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  return {
    ready: FlowRouter.subsReady('competition'),
    user: Meteor.user(),
    competition: competition,
    competitionId: competitionId,
  };
}, EditEvents);
