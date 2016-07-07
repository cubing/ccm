import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

const CompetitionSchedule = React.createClass({
  shouldComponentUpdate: (props) => {console.log(6, props); return false;},

  render () {
    let {ready, competitionId} = this.props;

      console.log(10, ready); 
    if (ready) {
      setupCompetitionCalendar($('#calender'), false, competitionId);
      $('#calender').fullCalendar('refetchEvents');
    }
    
    return (
      <div className='container'>
        <div className="container">
          <div className="public-schedule" id="calendar"></div>
        </div>
      </div>
    );  
  }
});

export default createContainer((props) => {
  let compSub = Meteor.subscribe('competition', props.competitionUrlId);
  let schedSub = Meteor.subscribe('scheduleEvents', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);

  return {
    ready: compSub.ready() && schedSub.ready(),
    competitionId: competitionId,
  };
}, CompetitionSchedule);
