import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import NotFound from '../notFound';

const Competition = React.createClass({
  competitionIsScheduled: function() {
    return this.props.competition.startDate;
  },

  dateInterval: function() {
    let {competition} = this.props;
    return $.fullCalendar.formatRange(moment(competition.startDate).utc(), moment(competition.endDate()).utc(), "LL");
  },

  render () {
    let {ready, competition, competitionId, competitionUrlId} = this.props;
    if (!ready) {
      return <div/>;
    }

    let name = competition.competitionName;

    return (
      <div className='container'>
        <h1>{name}</h1>
        <p>
          {this.competitionIsScheduled() ? 
            <a href={`${competitionUrlId}/schedule`}>{this.dateInterval()}</a> : 'Unscheduled'
          }
        </p>
      </div>
    );
  }
});

export default createContainer((props) => {
  let subscription = Meteor.subscribe('competition', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  return {
    ready: subscription.ready(),
    userId: Meteor.userId(),
    competition: competition,
    competitionId: competitionId,
  };
}, Competition);
