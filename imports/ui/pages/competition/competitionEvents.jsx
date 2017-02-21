import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

// Helpers
// TODO: move into a utils.js to be used by various other components
const eventName = eventCode => wca.eventByCode[eventCode].name;
const clockFormat = solveTime => jChester.solveTimeToStopwatchFormat(solveTime);
const softCutoffFormatName = softCutoffFormatCode => wca.softCutoffFormatByCode[softCutoffFormatCode].name;
const formatName = formatCode => wca.formatByCode[formatCode].name;

const CompetitionEvents = React.createClass({
  rounds(event) {
    let rounds = Rounds.find({
      competitionId: this.props.competitionId,
      eventCode: event,
    }, {
      sort: { nthRound: 1 }
    });
    return rounds;
  },

  render() {
    let {competition} = this.props;

    console.log(70)

    return (
      <div className='container'>
        <table className='table table-striped'>
          <thead>
            <tr>
              <th rowSpan='2'>Event Name</th>
              {competition && competition.getMaxRoundsInCompetition().map((round, index) =>
                <th colSpan={4} key={index}>Round {index+1}</th>
              )}
            </tr>
            <tr>
              {competition && competition.getMaxRoundsInCompetition().map((round, index) => 
                [<th>Format</th>,
                <th>Cutoff</th>,
                <th>Time limit</th>,
                <th>Num</th>]
              )}
            </tr>
          </thead>
          <tbody>
            {competition && competition.getEventCodes().map((event, index) => 
              <tr key={index}>
                <td>{eventName(event)}</td>
                {this.rounds(event).map((round, index) => 
                  [<td>{formatName(round.formatCode)}</td>,
                  <td>{round.softCutoff ? (round.softCutoff.time ?
                    clockFormat(round.softCutoff.time) : softCutoffFormatName(round.softCutoff.formatCode)) : ''}</td>,
                  <td>{clockFormat(round.timeLimit.time)}</td>,
                  <td>{round.size}</td>]
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
});

export default createContainer((props) => {
  console.log(props.competitionUrlId)
  let subscription = Subs.subscribe('competition', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  return {
    competition: competition,
    competitionId: competitionId,
  };
}, CompetitionEvents);
