import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import {OverlayTrigger, Popover} from 'react-bootstrap';
import RoundResults from '/imports/ui/components/resultsList';
import BlazeToReact from '/imports/ui/components/blazeToReact';
import JChester from '/imports/ui/components/jChester';
import {clockFormat, softCutoffFormatName} from '/imports/util';
import {buildRoundData} from '/imports/buildData';

const SolveTimeEditor = React.createClass({
  componentWillReceiveProps(props) {
    this.props = props;
    this.setState(this.getInitialState(props));
  },

  getInitialState(props) {
    return {
      solveTime: props ? props.solveTime : this.props.solveTime,
      warningClass: '',
      warningText: '',
      status: 'saved',
    };
  },

  setSaved(saved) {
    this.setState({ status: saved ? 'saved' : 'unsaved' });
  },

  setSaving() {
    this.setState({ status: 'saving' });
  },

  setWarning(warningClass, warningText) {
    this.setState({ warningClass, warningText });
  },

  solveTimeChanged(validationErrors, solveTime) {
    if(solveTime.millis !== this.props.solveTime.millis) {
      this.setSaved(false);
    } else {
      this.setSaved(true);
    }

    if(this.props.changed) {
      this.props.changed();
    }
  },

  render() {
    let {index, solveTime, editableSolveTimeFields} = this.props;
    let warningPopover = this.state.warningText ? (
      <Popover id='SolveTimeWarning' title="Warning">
        {this.state.warningText}
      </Popover>
    ) : <div/>;

    return (
      <tr className={`${this.state.warningClass} ${this.state.status}`}>
        <td>
          <OverlayTrigger trigger={['hover', 'focus']} placement='top' rootClose overlay={warningPopover}>
            <i className="fa fa-fw solve-time-warning-icon"/>
          </OverlayTrigger>
        </td>
        <td>
          <JChester solveTime={solveTime} ref={(jChester) => this.jChester = jChester} editableSolveTimeFields={editableSolveTimeFields} solveTimeInput={this.solveTimeChanged}/>
        </td>
      </tr>
    );
  }
});
      // <BlazeToReact wrapperTag='td' blazeTemplate='mjChester' solveTime={solveTime} index={index} name="inputSolve" editableSolveTimeFields={editableSolveTimeFields}/>

const RoundDataEntry = React.createClass({
  solveTimeEditors: [],

  componentDidMount() {
    $('.typeahead').typeahead({
      hint: true,
      highlight: true,
      minLength: 1
    }, {
      name: 'results',
      displayKey: (result) => result.registration.uniqueName,
      source: substringMatcher(() => this.props.results, 'registration.uniqueName'),
    }).on('selected', this.typeaheadSelected);
  },

  getInitialState() {
    return {
      selectedResultId: null
    };
  },

  checkedIn(selectedResultId) {
    let result = Results.findOne(selectedResultId, { fields: { registrationId: 1 } });
    return result.registration().checkedIn;
  },

  noShow(selectedResultId) {
    let result = Results.findOne(selectedResultId, { fields: { noShow: 1 } });
    return !!(result && result.noShow);
  },

  disableNoShow(selectedResultId) {
    let result = Results.findOne(selectedResultId, { fields: { solves: 1 } });
    return result.solves && result.solves.length > 0;
  },

  noShowTooltip(selectedResultId) {
    let result = Results.findOne(selectedResultId, { fields: { solves: 1 } });
    if(result.solves && result.solves.length > 0) {
      return "Cannot mark someone as a no show if they have results";
    }
    return "";
  },

  round() {
    return Rounds.findOne(this.roundId);
  },

  selectedSolves(selectedResultId) {
    // It's really important to only select solves, roundId, and registrationId here,
    // as anything else causes this helper to refire shortly after editing a time
    // (because the server computes its position, average, etc...)
    // which deselects all the text in our newly focused jChester.
    let result = Results.findOne(selectedResultId, { fields: { solves: 1, roundId: 1, registrationId: 1 } });
    return result ? result.allSolves() : [];
  },

  userResultMaybeSelected(roundId, jChesterToFocusIndex) {
    jChesterToFocusIndex = jChesterToFocusIndex || 0;

    // Gets registration by name. Update to include ids;
    // Think about what to do about ids...
    let uniqueName = this.refs.inputParticipantName.value;

    let round = Rounds.findOne(roundId);
    let registration = Registrations.findOne({
      competitionId: this.props.competitionId,
      uniqueName: uniqueName
    });

    if(!registration) {
      this.setState({ selectedResultId: null });
      return;
    }

    let result = Results.findOne({
      roundId: roundId,
      registrationId: registration._id,
    }, {
      fields: { _id: 1 }
    });

    if(!result) {
      this.setState({ selectedResultId: null });
      return;
    }

    this.setState({ selectedResultId: result._id });
    //this.updateWarnings();
  },

  typeaheadSelected() {
    this.userResultMaybeSelected(this.props.round._id);
  },

  typeaheadInput(e) {
    this.state.selectedResultId = null;
  },

  typeaheadKeyDown(e) {
    if(e.key == 'Enter' || e.key === 'Backspace') {
      this.userResultMaybeSelected(this.props.round._id, e.shiftKey ? -1 : 0);
    }
  },

  getSolveJChesters() {
    if(this.state.selectedResultId) {
      return this.solveTimeEditors.map(solveTimeEditors => solveTimeEditors.jChester);
    }
  },

  // Just gets the warnings
  getSolveWarnings(resultId) {
    let solveTimes = this.getSolveJChesters().map(j => j.solveTime); //$('.jChester').toArray().map((jChester, index) => $(jChester).jChester('getSolveTime'));
    let result = Results.findOne(this.state.selectedResultId);
    result.solves = solveTimes;

    let round = result.round();

    let warnings = solveTimes.map(function(solveTime, index) {
      let expectedSolveCount = result.getExpectedSolveCount();
      let missedCutoff = expectedSolveCount != round.format().count;
      if(missedCutoff && index >= expectedSolveCount && solveTime) {
        // There's a SolveTime at this index and the user didn't make the cutoff.
        // Complain!
        return {
          classes: ['has-warnings', 'solve-skipped-due-to-cutoff'],
          text: 'Should not exist because previous solves did not make soft cutoff'
        };
      }

      let violatesTimeLimit = round.timeLimit && solveTime && !jChester.solveTimeIsDN(solveTime) && solveTime.millis > round.timeLimit.time.millis;
      if(violatesTimeLimit) {
        return {
          classes: ['has-warnings'],
          text: 'Greater than time limit'
        };
      }

      return null;
    });


    return warnings;
  },

  // Sets the warnings
  updateWarnings() {
    if(this.state.selectedResultId) {
      this.getSolveWarnings().forEach(function(warning, index) {
        if(warning) {
          this.solveTimeEditors[index].setWarning(warning.classes.join(' '), warning.text);
        } else {
          this.solveTimeEditors[index].setWarning('', '');
        }
      }, this);
    }
  },

  saveAll() {
    this.solveTimeEditors.forEach(function(editor, index) {
      console.log(235, editor)
      let jChester = editor.jChester;
      if(jChester.state.validationErrors && jChester.state.validationErrors.length) {
        return;
      }

      editor.setSaving();
      this.saveTime(index, jChester.solveTime, function() {
        editor.setSaved(true);
      });
    }, this);
  },

  saveTime(solveIndex, solveTime, cb) {
    let {selectedResultId} = this.state;

    if(solveTime && solveTime.decimals) {
      solveTime.decimals = 2;
    }

    Meteor.call('setSolveTime', selectedResultId, solveIndex, solveTime, function(err, result) {
      if(!err) {
        cb(result);
      } else {
        console.error("Meteor.call() error: " + err);
      }
    });
  },

  render() {
    let {round} = this.props;
    let {selectedResultId} = this.state;

    return (
      <div className="row">
        <div className="results-sidebar-container col-xs-12 col-sm-6 col-md-5 col-lg-4">
          <div className="results-sidebar">
            <div className="focusguard focusguard-top" tabIndex="0"></div>
            <input name="name" id="inputParticipantName" className="typeahead form-control" type="text" placeholder="Enter name"
              ref='inputParticipantName' selected={this.typeaheadSelected} onKeyDown={this.typeaheadKeyDown}/>
              {round.softCutoff ?
                <p>Soft cutoff: {clockFormat(round.softCutoff.time)} {softCutoffFormatName(round.softCutoff.formatCode)}</p> : null
              }
              {round.timeLimit ?
                <p>Time Limit: {clockFormat(round.timeLimit.time)}</p> : null
              }

            {selectedResultId ?
              !this.checkedIn(selectedResultId) ?
                <p>
                This competitor is not checked in yet! You can manage check-in over <a href="{{pathFor 'manageCheckin' competitionUrlId=../competitionUrlId}}">here</a>.
                </p> :
                <div>
                  <a type="button" id="js-no-show-button" className={`btn btn-default ${this.noShow(selectedResultId) ? 'active' : ''}`} disabled={this.disableNoShow(selectedResultId)} data-toggle="tooltip" data-placement="top" data-original-title="{{noShowTooltip}}" data-container="body">
                    No show
                  </a>
                  {!this.noShow(selectedResultId) ?
                    <div>
                      <table className="table table-condensed jChesterTable">
                        <tbody>
                          {this.selectedSolves(selectedResultId).map((solveTime, index) =>
                            <SolveTimeEditor key={index} ref={(editor) => this.solveTimeEditors[index] = editor} solveTime={solveTime} changed={this.updateWarnings} index={index} resultId={selectedResultId} roundId={round._id}/>
                          )}
                        </tbody>
                      </table>
                      <button id='save-button' className='btn btn-default' onClick={this.saveAll}>Save</button>
                      <div className="focusguard focusguard-bottom" tabIndex="0"/>
                    </div> : null
                  }
                </div> : null
            }
          </div>
        </div>

        <div id="selectableResults" className="col-xs-12 col-sm-6 col-md-7 col-lg-8">
          <RoundResults {...this.props} round={round} selectParticipant={true} selectParticipantListener={this.selectParticipantListener} selectedResultId={selectedResultId}/>
        </div>

      </div>
    );
  }
});

const DataEntry = React.createClass({
  render() {
    let {round} = this.props;

    return (
      <div className="container-fluid">
        {round ? <RoundDataEntry {...this.props}/> : null}

      </div>
    );
  }
});

export default createContainer(function(props) {
  Meteor.subscribe('competition', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);
  let nthRound = parseInt(props.nthRound);
  let round = Rounds.findOne({
    competitionId: competitionId,
    eventCode: props.eventCode,
    nthRound: nthRound,
  });

  let results = round ? round.getResultsWithRegistrations({ limit: 0, sorted: true }) : [];

  return {
    ready: FlowRouter.subsReady('competition'),
    competition: competition,
    competitionId: competitionId,
    nthRound: nthRound,
    round: round,
    results: results,
  };
}, DataEntry);
