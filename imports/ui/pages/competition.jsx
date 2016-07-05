import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

const CompetitionView = React.createClass({
  registeredForCompetition: function() {
    let registration = Registrations.findOne({
      competitionId: this.props.competitionId,
      userId: this.props.userId,
    }, {
      fields: { _id: 1 }
    });
    return !!registration;
  },

  competitionIsScheduled: function() {
    return Competitions.findOne(this.props.competitionId).startDate;
  },

  dateInterval: function() {
    let comp = Competitions.findOne(this.props.competitionId);
    return $.fullCalendar.formatRange(moment(comp.startDate).utc(), moment(comp.endDate()).utc(), "LL");
  },

  render () {
    let {competitionId, competitionUrlId} = this.props;
    let name = Competitions.findOne(this.props.competitionId).competitionName;
    
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
  return {
    userId: Meteor.userId(),
  };
}, CompetitionView);

Template.competition.rendered = function () {
  let template = this;
  template.autorun(() => {
    ReactDOM.render(
      <CompetitionView 
        competitionId={template.data.competitionId}
        competitionUrlId={template.data.competitionUrlId}
        userId={Meteor.userId()}/>,
        template.$(".reactRenderArea")[0]
    );
  });
}