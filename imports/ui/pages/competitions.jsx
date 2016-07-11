import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

const CompetitionList = React.createClass({
  render() {
    let {competitions} = this.props;

    return (
      <div className='container'>
        {competitions.map((comp, index) => (
          <li className={'competition' + (comp.listed ? 'listed' : 'unlisted')} key={index}>
            <a href={comp.wcaCompetitionId ? comp.wcaCompetitionId : comp._id}>{comp.competitionName}</a>
          </li>
        ))}
      </div>
    );
  }
});

export default createContainer((props) => {
  let subscription = Meteor.subscribe('competitions');

  return {
    ready: subscription.ready(),
    user: Meteor.user(),
    competitions: api.getCompetitions().fetch(),
  };
}, CompetitionList);
