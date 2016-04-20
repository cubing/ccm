import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

Template.participantResults.rendered = function() {
  let template = this;

  template.autorun(function() {
    let data = Template.currentData();
    ReactDOM.render(<ParticipantResults competitionId={data.competitionId}
                                     competitionUrlId={data.competitionUrlId}
                                     registration={data.registration}/>,
      template.$('.reactRenderArea')[0]
    );
  });
};
Template.participantResults.destroyed = function() {
  let template = this;
  ReactDOM.unmountComponentAtNode(
    template.$(".reactRenderArea")[0]
  );
};

const SingleEventResults = React.createClass({
  render: function() {
    let maxSolvesInRound = _.max(this.props.results.map(result => result.round.format().count));
    let preferredFormat = wca.formatByCode[wca.formatsByEventCode[this.props.eventCode][0]];
    return (
      <table className="table table-hover">
        <thead>
          <tr>
            <th>#</th>
            <th>{wca.eventByCode[this.props.eventCode].name}</th>
            <th className="results-average text-right">{preferredFormat.averageName}</th>
            <th className="results-best text-right">Best</th>
            <th className="text-center" colSpan={maxSolvesInRound}>Solves</th>
          </tr>
        </thead>
        <tbody>
          {_.sortBy(this.props.results, result => -result.round.nthRound).map(result => {
            return (
              <ResultRowWithRound key={result._id}
                                  competitionUrlId={this.props.competitionUrlId}
                                  result={result}
              />
            );
          })}
        </tbody>
      </table>
    );
  },
});

const ParticipantResults = createContainer((props) => {
  let results = Results.find({
    competitionId: props.competitionId,
    registrationId: props.registration._id,
  }).fetch();
  results.forEach(result => {
    result.round = Rounds.findOne(result.roundId);
    result.registration = Registrations.findOne(result.registrationId);
  });
  let eventAndResults = ( _.chain(results)
    .groupBy(result => result.round.eventCode)
    .pairs()
    .map(([eventCode, results]) => [ eventCode, _.sortBy(results, result => -result.round.nthRound) ])
    .sortBy(([eventCode, results]) => wca.eventByCode[eventCode].index)
    .value()
  );
  return {
    eventAndResults: eventAndResults,
  };
}, React.createClass({
  render: function() {
    let wcaProfileLink = null;
    if(this.props.registration.wcaId) {
      let url = "https://www.worldcubeassociation.org/results/p.php?i=" + encodeURIComponent(this.props.registration.wcaId);
      wcaProfileLink = (
        <a href={url} target="_blank" className="wca-profile-link">WCA profile</a>
      );
    }
    return (
      <div>
        <h1>
          {this.props.registration.uniqueName} {wcaProfileLink}
        </h1>

        {this.props.eventAndResults.map(([eventCode, results]) => {
          return (
            <ResultsList key={eventCode}
                         competitionUrlId={this.props.competitionUrlId}
                         results={results}
                         eventToShowInHeader={eventCode}
                         prettyStringOpts={{ showEventName: false, showName: true, showFormat: false }}
            />
          );
        })}
      </div>
    );
  },
}));
