import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

const CompetitionList = React.createClass({
  render () {
    let {competitions} = this.props;

    return (
      <div>
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
  return {
    user: Meteor.user(),
    loading: !Meteor.subscribe('competitions').ready(),
    competitions: Competitions.find({}, {
      fields: {
        wcaCompetitionId: 1,
        competitionName: 1,
        listed: 1,
      }
    }).fetch()
  };
}, CompetitionList);
