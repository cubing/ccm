import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import {eventName, roundName} from '/imports/util';

const EventPickerView = React.createClass({
  render() {
    let {competition, competitionUrlId} = this.props;
    let selectedEventCode = this.props.eventCode;

    return (
      <nav className="navbar navbar-default navbar-plain-rectangle" role="navigation">
        <div className="container-fluid">
          <div className="navbar-collapse collapse-buttons">
            <ul className="nav navbar-nav">
              {competition ? competition.getEventCodes().map((eventCode, index) =>
                <li key={index} className={selectedEventCode === eventCode ? 'active' : ''}>
                  <a href={FlowRouter.path('roundResults', {competitionUrlId, eventCode})} className="brand"
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

  isCurrentRound() {
    let roundData = Template.parentData(1);
    let currentRoundId = roundData.roundId;
    if(!currentRoundId) {
      return false;
    }
    let currentRound = Rounds.findOne(currentRoundId);
    let template = Template.instance();
    let selectedEventCode = template.selectedEventCodeReact.get();
    if(selectedEventCode != currentRound.eventCode) {
      return false;
    }

    return this.nthRound == currentRound.nthRound;
  },

  render() {
    let {competition, competitionUrlId, eventCode} = this.props;
    let currentRound = this.props.nthRound;
    let activeRound = (round) => currentRound === round;

    if (!eventCode) {
      return null;
    }

    return (
      <nav className="navbar navbar-default navbar-plain-rectangle" role="navigation">
        <div className="container-fluid">
          <div className="navbar-collapse collapse-buttons">
            <ul className="nav navbar-nav">
              <li className="{{#if isCurrentRound}}active{{/if}} leaf">
                <p className="navbar-text navbar-brand">
                  <span className={`cubing-icon icon-${eventCode}`} alt={eventCode}></span><span>{eventName(eventCode)}</span>
                </p>
              </li>
              {this.roundsForEvent(eventCode).map((round, index) => 
                <li key={index} className={`${activeRound(round) ? 'active' : ''} leaf`}>
                  <a href={FlowRouter.path('roundResults', {competitionUrlId, eventCode, nthRound: round.nthRound})}>
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

export const RoundPicker = createContainer((props) => {
  let subscription = Meteor.subscribe('competition', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  return {
    ready: subscription.ready(),
    competition: competition,
    competitionId: competitionId,
  };
}, RoundPickerView);