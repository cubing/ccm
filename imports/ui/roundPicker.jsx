import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import {eventName, roundName} from '/imports/util';
import {buildRoundData} from '/imports/buildData';

const EventPickerView = React.createClass({
  render() {
    let {competition, competitionUrlId} = this.props;
    let selectedEventCode = this.props.eventCode;

    let route = this.props.manage ? 'dataEntry' : 'roundResults';

    return (
      <nav className="navbar navbar-default navbar-plain-rectangle" role="navigation">
        <div className="container-fluid">
          <div className="navbar-collapse collapse-buttons">
            <ul className="nav navbar-nav">
              {competition ? competition.getEventCodes().map((eventCode, index) =>
                <li key={index} className={selectedEventCode === eventCode ? 'active' : ''}>
                  <a href={FlowRouter.path(route, {competitionUrlId, eventCode})} className="brand"
                    data-toggle="tooltip" data-placement="bottom" data-container="body" title={eventName(eventCode)}>
                    <span className={`cubing-icon icon-${eventCode}`}/>
                    <span className="hidden-xs"> {eventCode}</span>
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </nav>
    );
  }
});

export const EventPicker = createContainer((props) => {
  let subscription = Meteor.subscribe('competition', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  return {
    ready: subscription.ready(),
    competition: competition,
    competitionId: competitionId,
  };
}, EventPickerView);

const RoundPickerView = React.createClass({
  roundsForEvent(selectedEventCode) {
    let rounds = Rounds.find({
      competitionId: this.props.competitionId,
      eventCode: selectedEventCode,
    }, {
      sort: { nthRound: 1 }
    });
    return rounds;
  },

  isCurrentRound(selectedEventCode) {
    if(!this.props.round) {
      return false;
    }

    let currentRound = this.props.round;
    if(selectedEventCode != currentRound.eventCode) {
      return false;
    }

    return this.props.nthRound == currentRound.nthRound;
  },

  render() {
    let {competition, competitionUrlId, eventCode} = this.props;
    let currentRound = this.props.round;
    let activeRound = (round) => currentRound && currentRound._id === round;

    if(!eventCode) {
      return null;
    }

    let route = this.props.manage ? 'dataEntry' : 'roundResults';

    return (
      <nav className="navbar navbar-default navbar-plain-rectangle" role="navigation">
        <div className="container-fluid">
          <div className="navbar-collapse collapse-buttons">
            <ul className="nav navbar-nav">

              {this.roundsForEvent(eventCode).map((round, index) =>
                <li key={index} className={`${activeRound(round._id) ? 'active' : ''} leaf`}>
                  <a href={FlowRouter.path(route, {competitionUrlId, eventCode, nthRound: round.nthRound})}>
                    {roundName(round.roundCode())}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    );
  }
});

export const RoundPicker = createContainer(buildRoundData, RoundPickerView);

const OpenRoundPickerView = React.createClass({
  showAllRounds(roundId) {
    if(!this.allowChosingClosedRounds) {
      return false;
    }

    if(roundId) {
      if(!Rounds.findOne(roundId).isOpen()) {
        // If the selected round is not open, we need to show all rounds so we
        // can see the selected round.
        return true;
      }
    } else {
      // If they've only selected an eventCode, we want to show all rounds.
      return true;
    }

    // let template = Template.instance();
    // return template.showAllRoundsReact.get();
    return true;
  },

  openRounds() {
    return Rounds.find({
      competitionId: this.props.competitionId,
      status: wca.roundStatuses.open,
    }, {
      sort: {
        eventCode: 1,
        nthRound: 1,
      }
    });
  },

  isSelectedRound(id) {
    console.log(166, this.props.round ? this.props.round._id : null, id);
    return this.props.round && this.props.round._id == id;
  },

  render() {
    let {allowChosingClosedRounds, competitionUrlId, eventCode, nthRound} = this.props;
    let currentRound = this.props.round;
    let openRounds = this.openRounds();

    let route = this.props.manage ? 'dataEntry' : 'roundResults';

    return (
      <nav className="navbar navbar-default navbar-plain-rectangle round-picker" role="navigation">
         <div className="container-fluid">
           <div className="navbar-collapse collapse-buttons">
             <ul className="nav navbar-nav">
               {openRounds.length > 0 ? openRounds.map((round, index) =>
                 <li className={this.isSelectedRound(round._id) ? 'active' : 'leaf'}>
                   <a href={FlowRouter.path(route, {competitionUrlId, eventCode: round.eventCode, nthRound: round.nthRound})}>
                      className="brand">
                     <span className={`cubing-icon icon-${round.eventCode}`} alt={round.eventCode}></span>
                     {round.prettyStringNoFormat()}
                   </a>
                 </li>) :
                 <p className="navbar-text">
                   No rounds currently open
                 </p>
               }

               {allowChosingClosedRounds ?
                 <li className={this.showAllRounds ? 'active' : ''}>
                   <a href="#" className="brand" id="showAllRoundsLink"
                      data-toggle="tooltip" data-placement="bottom" data-container="body"
                      title="If you really need to edit a round that isn't open, click here.">
                     All rounds
                     {this.showAllRounds() ?
                       <span className="glyphicon glyphicon-chevron-down"></span> :
                       <span className="glyphicon glyphicon-chevron-right"></span>
                     }
                   </a>
                 </li> :
               null}
             </ul>

             <ul className="nav navbar-nav navbar-right">
               <li>
                 <a href={currentRound ? FlowRouter.path('roundResults', {competitionUrlId, eventCode: currentRound.eventCode, nthRound: nthRound}) : null}>
                   Public link
                 </a>
               </li>
             </ul>
           </div>
         </div>
       </nav>
    );
  }
});


export const OpenRoundPicker = createContainer(buildRoundData, OpenRoundPickerView);
