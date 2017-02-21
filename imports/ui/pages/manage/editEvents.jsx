import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer, ReactMeteorData} from 'meteor/react-meteor-data';
import { FormControl, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Panel, Button, Popover, OverlayTrigger} from 'react-bootstrap';
import {eventName, roundName, eventAllowsCutoffs, softCutoffFormatName, formatShortName, toAtMostFixed} from '/imports/util';
import JChester from '../../components/jChester';
import CCMModal from '../../components/ccmModal';

let deviceSizeAndEventCounts = [
  ['xs', 1],
  ['sm', 2],
  ['md', 2],
  ['lg', 3],
];

const formats = function(event) {
  return wca.formatsByEventCode[event.eventCode];
};

const eventColumnsClasses = function() {
  let classes = deviceSizeAndEventCounts.map(([deviceSize, eventCount]) => {
    let cols = Math.floor(12 / eventCount);
    return "col-" + deviceSize + "-" + cols;
  });
  return classes.join(" ");
};

const roundSoftCutoffAllowed = function(event) {
  if(!event.softCutoff) {
    return true;
  }
  let format = wca.formatByCode[event.formatCode];
  let allowedSoftCutoffFormatCodes = format.softCutoffFormatCodes;
  return _.contains(allowedSoftCutoffFormatCodes, event.softCutoff.formatCode);
};

const isCurrentRoundFormat = function(round) {
  let formatCode = round.toString();
  return round.formatCode == formatCode;
};

const showRegistrationCount = function(round) {
  // First round and hasn't started yet
  return round.nthRound === 1 && round.isUnstarted();
};

const participantsRegisteredForEventCount = function(event) {
  let participantsCount = Registrations.find({
    competitionId: event.competitionId,
    registeredEvents: event.eventCode,
  }, {
    fields: { _id: 1 }
  }).count();
  return participantsCount;
};

const progressClasses = function(round) {
  let progress = RoundProgresses.findOne({roundId: round._id});
  let classes = "progress-bar-" + {incomplete: "warning", complete: "success", overcomplete: "danger"}[progress.completeness()];
  if(round.isOpen()) {
    classes += " progress-bar-striped active";
  }
  return classes;
};

const clearfixVisibleClass = function(index) {
  let classes = deviceSizeAndEventCounts.map(([deviceSize, eventCount]) => {
    if((index + 1) % eventCount === 0) {
      return 'visible-' + deviceSize + '-block';
    }
    return '';
  });
  return classes.join(" ");
};

const showEvent = function(event) {
  return !!localStorage[event.competitionId + event.eventCode + "visible"];
};


const roundSizeWarning = function(round) {
  if(!round) {
    return false;
  }

  let maxAllowedRoundSize = round.getMaxAllowedSize();
  if(maxAllowedRoundSize === null) {
    return false;
  }
  return round.size > maxAllowedRoundSize;
};

const canManageGroupsForRound = function(round) {
  return round.isOpen();
};

const canCloseRound = function(round) {
  return round.isOpen();
};

const canOpenRound = function(round) {
  let previousRound = round.getPreviousRound();
  if(previousRound && !previousRound.isClosed()) {
    // If the previous round is not closed, we can't open this round.
    return false;
  }
  let nextRound = round.getNextRound();
  if(nextRound && !nextRound.isUnstarted()) {
    // If there's a next round that is already opened (or
    // closed), we can't reopen this round.
    return false;
  }
  if(round.isUnstarted()) {
    let progress = RoundProgresses.findOne({roundId: round._id});
    // We always create and delete WCA Rounds and RoundProgresses together,
    // but when deleting a Round, there's a window where this helper gets called,
    // so we first make sure progress exists before we use it.
    if(progress) {
      // Only allow opening this unstarted round if there are some people *in*
      // the round.
      return progress.total > 0;
    }
  }
  return round.isClosed();
};

const canAdvanceRound = function(round) {
  if(!round.isClosed()) {
    // We only allow advancing from rounds when they are closed
    return false;
  }
  // We can't advance people from the final round
  return !round.isLast();
};

const SetRoundSizeModal = React.createClass({
  show(round) {
    this.round = round;
    this.modal.show();
    this.forceUpdate();
  },

  save() {
    Meteor.call('setRoundSize', this.round._id, parseInt(this.input.value));
    this.modal.close();
  },

  render() {
    let header = this.round ? `Change size of ${eventName(this.round.eventCode)}: ${roundName(this.round.roundCode())}` : '';

    return (
      <CCMModal ref={modal => this.modal = modal} save={this.save} header={header}>
        {this.round ?
          <div className='form-group'>
            <input type='number' min='1' name='roundSize' className='form-control' ref={ref => this.input = ref} defaultValue={this.round.size}/>
          </div> : null}
      </CCMModal>
    );
  }
});

const SetRoundCutoffModal = React.createClass({
  getInitialState() {
    return {
      softCutoffFormat: ''
    };
  },

  show(round) {
    this.round = round;
    this.modal.show();
    this.setState({
      softCutoffFormat: round.softCutoff ? round.softCutoff.formatCode : '',
      softCutoffTime: round.softCutoff ? round.softCutoff.time : '',
    });
  },

  save() {
    let softCutoff = {};
    if(this.state.softCutoffFormat) {
      let time = this.jChester ? this.jChester.getSolveTime() : {};
      softCutoff = {
        time: time,
        formatCode: this.state.softCutoffFormat,
      };
    } else {
      softCutoff = null;
    }

    let that = this;
    Meteor.call('setRoundSoftCutoff', this.round._id, softCutoff, function(err, result) {
      if(!err) {
        that.modal.close();
        that.setState(that.getInitialState());
      } else {
        console.error('Meteor.call() error: ' + err);
      }
    });
  },

  change(event) {
    this.setState({ softCutoffFormat: event.target.value});
  },

  isAllowedSoftCutoffFormat: function(softCutoffFormat) {
    let roundFormat = wca.formatByCode[this.round.formatCode];
    return _.contains(roundFormat.softCutoffFormatCodes, softCutoffFormat.code);
  },

  render() {
    let { softCutoffFormat, softCutoffTime } = this.state;
    let header = this.round ? `Change Soft Cutoff for ${eventName(this.round.eventCode)}: ${roundName(this.round.roundCode())}` : '';

    return (
      <CCMModal ref={modal => this.modal = modal} save={this.save} header={header}>
        {this.round ?
          <div>
            <FormControl componentClass='select' value={softCutoffFormat} name='softCutoffFormatCode' onChange={this.change} style={{marginBottom: '5px'}}>
              {/*!-- will end up selected if nothing else is */}
              <option value=''>No soft cutoff</option>

              {/*<!-- http://stackoverflow.com/a/23498190 --> */}
              <optgroup label='───────────────'/>

              {wca.softCutoffFormats.map((format, index) =>
                <option key={index} value={format.code} disabled={!this.isAllowedSoftCutoffFormat(format)}>{format.name}</option>
              )}
            </FormControl>
            {softCutoffFormat ? <JChester ref={(ref) => this.jChester = ref} solveTime={softCutoffTime}/> : null}
          </div> : null}
      </CCMModal>
    );
  }
});

const SetRoundTimeLimitModal = React.createClass({
  show(round) {
    this.round = round;
    this.modal.show();
    this.forceUpdate();
  },

  save() {
    let time = this.jChester.getSolveTime();
    Rounds.update(this.round._id, {
      $set: {
        // Explicitly listing all the fields in SolveTime as a workaround for
        //  https://github.com/aldeed/meteor-simple-schema/issues/202
        //'timeLimit.time': time
        'timeLimit.time.millis': time.millis,
        'timeLimit.time.decimals': time.decimals,
        'timeLimit.time.penalties': time.penalties,
      }
    });
    this.modal.close();
  },

  render() {
    let header = this.round ? `Change size of ${eventName(this.round.eventCode)}: ${roundName(this.round.roundCode())}` : '';

    return (
      <CCMModal ref={modal => this.modal = modal} save={this.save} header={header}>
        {this.round ?
          <JChester ref={ref => this.jChester = ref} solveTime={this.round.timeLimit.time}/> : null}
      </CCMModal>
    );
  }
});

const ReallyRemoveRoundModal = React.createClass({
  show(round) {
    this.round = round;
    this.modal.show();
    this.forceUpdate();
  },

  delete() {
    Meteor.call('removeLastRound', this.round.competitionId, this.round.eventCode);
    this.modal.close();
  },

  render() {
    let header = this.round ?
      `Are you sure you want to delete ${eventName(this.round.eventCode)}: ${roundName(this.round.roundCode())}?` : '';

    let footer = (
      <ModalFooter>
        <button type="button" className='btn' onClick={() => this.modal.close()}>Cancel</button>
        <button type="button" className="btn btn-danger" name="buttonReallyRemoveRound" onClick={this.delete}>
          <span className="glyphicon glyphicon-trash"/> Delete round
        </button>
      </ModalFooter>
    );

    return (
      <CCMModal ref={modal => this.modal = modal} save={this.save} header={header} footer={footer}>
        <p>It appears that this round contains results. If you delete it, those results will be lost.</p>
      </CCMModal>
    );
  }
});

const Event = React.createClass({
  mixins: [ReactMeteorData],
  getMeteorData() {
    return {
      rounds: Rounds.find({
        competitionId: this.props.competitionId,
        eventCode: this.props.event.eventCode
      }, {
        sort: { nthRound: 1 }
      }).fetch()
    };
  },

  modals: {},

  getInitialState() {
    return {
      expanded: window.localStorage[`${this.props.competitionId}${this.props.event.eventCode}visible`] === 'true'
    };
  },

  expand() {
    this.setState({
      expanded: true
    });
    window.localStorage[`${this.props.competitionId}${this.props.event.eventCode}visible`] = 'true';
  },

  collapse() {
    this.setState({
      expanded: false
    });
    window.localStorage[`${this.props.competitionId}${this.props.event.eventCode}visible`] = 'false';
  },

  toggle() {
    this.setState({
      expanded: !this.state.expanded
    });
    window.localStorage[`${this.props.competitionId}${this.props.event.eventCode}visible`] = !this.state.expanded ? 'true' : 'false';
  },

  changeRoundFormat(round) {
    return (e) => Rounds.update(round._id, { $set: { formatCode: e.currentTarget.value } });
  },

  /* Helpers */

  lastRoundResultsCount() {
    let competition = Competitions.findOne(this.props.competitionId);
    let lastRound = competition.getLastRoundOfEvent(this.props.event.eventCode);
    if(!lastRound) {
      return 0;
    }
    let progress = RoundProgresses.findOne({roundId: lastRound._id});
    return progress.total;
  },

  canRemoveRound: function() {
    let competition = Competitions.findOne(this.props.event.competitionId);
    let lastRound = competition.getLastRoundOfEvent(this.props.event.eventCode);
    if(!lastRound) {
      return false;
    }
    return canRemoveRound(Meteor.userId(), lastRound._id);
  },

  canAddRound: function() {
    return canAddRound(Meteor.userId(), this.props.event.competitionId, this.props.event.eventCode);
  },

  addRound() {
    Meteor.call('addRound', this.props.competitionId, this.props.event.eventCode);
  },

  removeRound() {
    let { competitionId, event } = this.props;
    let competition = Competitions.findOne(competitionId);
    let lastRound = competition.getLastRoundOfEvent(event.eventCode);
    let progress = RoundProgresses.findOne({roundId: lastRound._id});
    if(progress.total > 0) {
      this.modals.reallyRemoveRound.show(lastRound);
    } else {
      Meteor.call('removeLastRound', competitionId, event.eventCode);
    }
  },

  openRound(round) {
    Rounds.update(round._id, { $set: { status: wca.roundStatuses.open } });
  },

  closeRound(round) {
    let roundProgress = RoundProgresses.findOne({roundId: round._id});
    // When closing a round, set it to unstarted if nobody has any results yet.
    let newRoundStatus = roundProgress.done === 0 ? wca.roundStatuses.unstarted : wca.roundStatuses.closed;
    Rounds.update(round._id, { $set: { status: newRoundStatus } });
  },

  renderRound(round, index) {
    let { event, competitionUrlId } = this.props;

    let roundProgress = RoundProgresses.findOne({roundId: round._id});
    let roundParams = {
      competitionUrlId,
      eventCode: event.eventCode,
      nthRound: round.nthRound
    };

    return (
      <tr key={index}>
        {/* ============= Nth Round ============= */}
        <td className="tight-cell">{round.nthRound}</td>

        {/* ============= Format ============= */}
        <td className="tight-cell">
          <select name="roundFormat" className="form-control input-xs" defaultValue={round.formatCode} onChange={this.changeRoundFormat(round)  }>
            {formats(event).map((format, index) =>
              <option key={index} value={format}>{formatShortName(format)}</option>
            )}
          </select>
        </td>

        {eventAllowsCutoffs(event.eventCode) ? [
          /* ============= Soft Cutoff ============= */
          <td key={0} className="tight-cell text-center">
            <button type="button" name="buttonSoftCutoff" className={`btn ${roundSoftCutoffAllowed(round) ? 'btn-default' : 'btn-warning'} btn-xs`}
                    onClick={() => this.modals.setRoundCutoff.show(round)}>
              {round.softCutoff ? `${clockFormat(round.softCutoff.time)} ${softCutoffFormatName(round.softCutoff.formatCode)}` : '-'}
            </button>
          </td>,

          /* ============= Time limit ============= */
          <td key={1} className="tight-cell text-center">
            <button type="button" name="buttonTimeLimit" className="btn btn-default btn-xs"
                    onClick={() => this.modals.setRoundTimeLimit.show(round)}>
              {round.timeLimit ? clockFormat(round.timeLimit.time) : '-'}
            </button>
          </td>
        ] : null}

        {/* ============= Progress ============= */}
        <td className="text-center">
          {showRegistrationCount(round) ?
            `${participantsRegisteredForEventCount(event)} registered, ${roundProgress.total} checked in` :
            roundProgress.total ?
              <a href={FlowRouter.path('dataEntry', {competitionUrlId, eventCode: event.eventCode, nthRound: round.nthRound})} title="Go to data entry">
                <div className="progress">
                  <div className={`progress-bar ${progressClasses(round)}`} role="progressbar" style={{width: `${roundProgress.percentage()}%`}}>
                    {toAtMostFixed(roundProgress.done, 1)}/{roundProgress.total}
                  </div>
                </div>
              </a> :
              <button type="button" name="buttonSetRoundSize"
                      className={`btn ${roundSizeWarning() ? 'btn-warning' : 'btn-default'} btn-xs btn-block`}
                      title={`${roundSizeWarning() ? `Round cannot be larger than ${round.getMaxAllowedSize()}` : ''}`}
                      onClick={() => this.modals.setRoundSize.show(round)}>
                {round.size ? `Size: ${round.size}` : `Set round size`}
              </button>
          }
        </td>

        {/* ============= Open/Close Round ============= */}
        <td className="tight-cell text-center">
          {canOpenRound(round) ?
            <button type="button" name="buttonOpenRound" onClick={() => this.openRound(round)}
                    className="btn btn-default btn-xs btn-unlock" title="Click to open round">
              <i className="fa"/>
            </button> : null}
          {canCloseRound(round) ?
            <button type="button" name="buttonCloseRound" onClick={() => this.closeRound(round)}
                    className="btn btn-default btn-xs btn-lock" title="Click to close round">
              <i className="fa"/>
            </button> : null}
          {canAdvanceRound(round) ?
            <a href={FlowRouter.path('advanceParticipants', roundParams)} title="Advance competitors to next round">
              <i className="fa fa-step-forward"/>
            </a> : null}
          {canManageGroupsForRound(round) ?
            <a href={FlowRouter.path('manageScrambleGroups', roundParams)} title="Open and close scramble groups">
              <i className="fa fa-group"/>
            </a> : null}
        </td>
      </tr>
    );
  },

  renderHeader() {
    let { event } = this.props;

    return (
      <span>
        <span className={`img-thumbnail cubing-icon icon-${event.eventCode}`} alt={event.eventCode}/>
        <span>{eventName(event.eventCode)}</span>
        <span className="collapse-indicator"/>
      </span>
    );
  },

  render() {
    let { event, competitionId } = this.props;
    let { expanded } = this.state;
    let { rounds } = this.data;

    const formatsOverlay = (
      <Popover id='formats' title='WCA Round Formats'>
        <table className='table-condensed'>
          <tbody>
            {wca.formats.map((format, index) => <tr key={index}><td><strong>{format.shortName}</strong></td><td>{format.name}</td></tr>)}
          </tbody>
        </table>
      </Popover>
    );

    return (
      <div className={eventColumnsClasses()}>
        <Panel collapsible header={this.renderHeader()} expanded={expanded} onSelect={this.toggle}>
          <div className="table-responsive">
            <table className="table table-condensed">
              {/* ============= Rounds property headers ============= */}
              <thead>
                <tr>
                  <th className="tight-cell">#</th>
                  <th className="tight-cell text-center">
                    <OverlayTrigger trigger='click' rootClose placement='right' overlay={formatsOverlay}>
                      <a style={{cursor: 'pointer'}}>Format</a>
                    </OverlayTrigger>
                  </th>
                  {eventAllowsCutoffs(event.eventCode) ? [
                    <th key={0} className="tight-cell text-center">Soft</th>,
                    <th key={1} className="tight-cell text-center">Hard</th>
                  ] : null}
                  <th className="text-center">Progress</th>
                  <th className="tight-cell text-center">
                    <span className="glyphicon glyphicon-cog"></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rounds.map(this.renderRound)}
              </tbody>
            </table>

            {/* ============= Are You Sure Delete Round?  ============= */}
            {rounds.length ? <ReallyRemoveRoundModal ref={modal => this.modals.reallyRemoveRound = modal}/> : null}
          </div>

          {/* ============= Delete/Add round buttons ============= */ }
          <div className="btn-group btn-group-justified">
            <div className="btn-group">
              <button type="button" name="buttonRemoveRound" onClick={this.removeRound}
                      className={`btn btn-default btn-xs ${this.lastRoundResultsCount() ? 'btn-danger' : ''}`}
                      disabled={!this.canRemoveRound()}>
                <span className="glyphicon glyphicon-minus"/> Delete last round
              </button>
            </div>
            <div className="btn-group">
              <button type="button" name="buttonAddRound" onClick={this.addRound}
                      className="btn btn-default btn-xs"
                      disabled={!this.canAddRound()}>
                <span className="glyphicon glyphicon-plus"/> Add round
              </button>
            </div>
          </div>
        </Panel>

        <SetRoundSizeModal ref={modal => this.modals.setRoundSize = modal}/>
        <SetRoundCutoffModal ref={modal => this.modals.setRoundCutoff = modal}/>
        <SetRoundTimeLimitModal ref={modal => this.modals.setRoundTimeLimit = modal}/>
      </div>
    );
  }
});

const EditEvents = React.createClass({
  _events: [],

  events: function() {
    let events = wca.events.map((e, i) => {
      return {
        index: i,
        competitionId: this.props.competitionId,
        eventCode: e.code,
        eventName: e.name,
      };
    });
    return events;
  },

  /* Events */

  collapseAllEvents() {
    this._events.forEach(event => { event.collapse(); });
  },

  expandAllEvents() {
    this._events.forEach(event => { event.expand(); });
  },

  render() {
    let { competitionId, competitionUrlId } = this.props;

    return (
      <div className="container-fluid">
        <div id="editEventsList">
          {/* ===================== Page Header ===================== */}
          <div className="row">
            <div className="col-xs-5">
              <h2>Events</h2>
            </div>
            <div className="col-xs-7 text-right">
              <div className="btn-group" id="expandCollapseAllEvents">
                <button className="btn btn-default" onClick={this.expandAllEvents}>
                  <span className="glyphicon glyphicon-resize-full"/>
                </button>
                <button className="btn btn-default" onClick={this.collapseAllEvents}>
                  <span className="glyphicon glyphicon-resize-small"/>
                </button>
              </div>
            </div>
          </div>

          <div className="row">
            {this.props.ready ? this.events().map((event, index) => [
              <Event key={index} ref={ref => {this._events[index] = ref;}} {...this.props} event={event}/>,
              clearfixVisibleClass(index) ? <div className={`clearfix ${clearfixVisibleClass(index)}`}/> : null
            ]) : null}
          </div>
        </div>
      </div>
    );
  }
});

const subs = new SubsManager();

export default createContainer((props) => {
  Meteor.subscribe('competition', props.competitionUrlId);
  Meteor.subscribe('competitionRegistrations', props.competitionUrlId);
  Meteor.subscribe('roundProgresses', props.competitionUrlId);

  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  return {
    ready: FlowRouter.subsReady('competition', 'roundProgresses'),
    user: Meteor.user(),
    competition: competition,
    competitionId: competitionId,
  };
}, EditEvents);
