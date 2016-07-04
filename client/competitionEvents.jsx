import React from 'react';
import ReactDOM from 'react-dom';

// Helpers
// TODO: move into a utils.js to be used by various other components
const eventName = eventCode => wca.eventByCode[eventCode].name;
const clockFormat = solveTime => jChester.solveTimeToStopwatchFormat(solveTime);
const softCutoffFormatName = softCutoffFormatCode => wca.softCutoffFormatByCode[softCutoffFormatCode].name;
const formatName = formatCode => wca.formatByCode[formatCode].name;

const CompetitionEvents = React.createClass({
  getCompetition: function() {
    return Competitions.findOne(this.props.competitionId)
  },

  rounds (event) {
    let rounds = Rounds.find({
      competitionId: this.props.competitionId,
      eventCode: event,
    }, {
      sort: { nthRound: 1 }
    });
    return rounds;
  },

  render () {
    let comp = this.getCompetition();

    return (
      <table className='table table-striped'>
        <thead>
          <tr>
            <th rowSpan='2'>Event Name</th>
            {comp.getMaxRoundsInCompetition().map((round, index) =>
              <th colSpan={4} key={index}>Round {index+1}</th>
            )}
          </tr>
          <tr>
            {comp.getMaxRoundsInCompetition().map((round, index) => 
              [<th>Format</th>,
              <th>Soft</th>,
              <th>Hard</th>,
              <th>Num</th>]
            )}
          </tr>
        </thead>
        <tbody>
          {comp.getEventCodes().map((event, index) => 
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
    );
  }
});

Template.competitionEvents.rendered = function () {
  let template = this;
  template.autorun(() => {
    ReactDOM.render(
      <CompetitionEvents competitionId={template.data.competitionId}/>, template.$(".reactRenderArea")[0]
    );
  });
}