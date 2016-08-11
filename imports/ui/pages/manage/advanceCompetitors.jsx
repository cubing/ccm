import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import {eventName, roundName} from '/imports/util';
import RoundResults from '/imports/ui/components/resultsList';
import {buildRoundData} from '/imports/buildData';

const advanceCompetitors = React.createClass({
  getInitialState() {
    return {
      isSaveable: true,
      advanceCount: 1,
    };
  },

  componentWillReceiveProps(props) {
    if(props.round) {
      this.setState({
        advanceCount: props.round.getNextRound().size || Math.floor(props.round.size * 0.75)
      });
    }
  },

  btnClass: function() {
    let round = Rounds.findOne(this.props.round._id);
    let maxAllowed = round.getMaxAllowedToAdvanceCount();
    if(this.state.advanceCount > maxAllowed) {
      return 'btn-warning';
    } else if(this.state.isSaveable) {
      return 'btn-success';
    }
    return '';
  },

  canAdvance() {
    let round = Rounds.findOne(this.props.round._id);
    let maxAllowed = round.getMaxAllowedToAdvanceCount();
    return this.state.advanceCount > maxAllowed;
  },

  tooltip: function() {
    let round = Rounds.findOne(this.props.round._id);
    let maxAllowed = round.getMaxAllowedToAdvanceCount();
    return this.canAdvance() ?
      `According to regulation 9p1, you should not advance more than ${maxAllowed} competitors from this round.` : '';
  },

  participantsInRound: function() {
    return Results.find({ roundId: this.props.round._id }).count();
  },

  advanceCompetitors() {
    let { advanceCount } = this.state;
    Meteor.call('advanceParticipantsFromRound', advanceCount, this.props.round._id, function(error, result) {
      if(!error) {
        FlowRouter.go('editEvents', {competitionUrlId: this.props.competitionUrlId});
      } else {
        bootbox.alert(`Error! ${error.reason}`);
      }
    });
  },

  render() {
    let { eventCode, nthRound, round } = this.props;
    let { advanceCount } = this.state;

    return round ? (
      <div className='container'>
        <div className='row'>
          <div className='col-xs-6'>
            <h4>Advance participants from {eventName(eventCode)}: {roundName(nthRound)}</h4>
          </div>
          <div className='col-xs-6'>
            <form className='form-inline advance-participants-form'>
              <input type='number' min='1' max={this.participantsInRound()} name='advanceCount' className='form-control'
                     value={advanceCount} onChange={(e) => this.setState({ advanceCount: e.target.value })}/>
              <button className={`btn ${this.btnClass()}`} disabled={this.canAdvance()}
                      title={this.tooltip()} onClick={this.advanceCompetitors}>
                Advance competitors <span className='glyphicon glyphicon-step-forward'></span>
              </button>
            </form>
          </div>
        </div>
        <RoundResults {...this.props} round={round} advanceCount={advanceCount} configurableAdvanceCount={true}/>
      </div>
    ) : null;
  }
});

export default createContainer(buildRoundData, advanceCompetitors);
