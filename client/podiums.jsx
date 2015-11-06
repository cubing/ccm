Template.podiums.rendered = function() {
  let template = this;

  template.autorun(function() {
    let data = Template.currentData();
    ReactDOM.render(<EventPodiums competitionUrlId={data.competitionUrlId}
                               finalRounds={data.finalRounds}
                               finalResults={data.finalResults} />,
      template.$('.reactRenderArea')[0]
    );
  });
};
Template.podiums.destroyed = function() {
  let template = this;
  ReactDOM.unmountComponentAtNode(
    template.$(".reactRenderArea")[0]
  );
};

Template.podiumsByPerson.rendered = function() {
  let template = this;

  template.autorun(function() {
    let data = Template.currentData();
    ReactDOM.render(<EventPodiumsByPerson competitionUrlId={data.competitionUrlId}
                                       finalRounds={data.finalRounds}
                                       finalResults={data.finalResults} />,
      template.$('.reactRenderArea')[0]
    );
  });
};
Template.podiumsByPerson.destroyed = function() {
  let template = this;
  ReactDOM.unmountComponentAtNode(
    template.$(".reactRenderArea")[0]
  );
};

const EventPodiums = React.createClass({
  render: function() {
    return (
      <div>
        {this.props.finalRounds.map(round => {
          let results = _.select(this.props.finalResults, result => result.roundId === round._id);
          results = _.sortBy(results, result => result.position);
          return (
            <ResultsList key={round._id}
                         competitionUrlId={this.props.competitionUrlId}
                         results={results}
                         round={round}
                         eventToShowInHeader={round.eventCode}
            />
          );
        })}
      </div>
    );
  }
});

const EventPodiumsByPerson = React.createClass({
  render: function() {
    // When grouping results by person, we want to order people so that the winner
    // of the most important event (3x3) shows up first, followed by the other
    // people who placed in that round. We do this same thing for every event, or
    // until we've deal with everyone.
    let resultValue = (result => wca.eventByCode[result.round.eventCode].index * 3 + result.position);
    let resultsByRegistration = _.chain(this.props.finalResults)
      .groupBy(result => result.registrationId)
      .pairs()
      .sortBy(([registrationId, results]) => _.min(results.map(resultValue)))
      .map(([registrationId, results]) => [ registrationId, _.sortBy(results, result => wca.eventByCode[result.round.eventCode].index) ])
      .value()
    ;
    return (
      <div>
        {resultsByRegistration.map(([registrationId, results]) => {
          let registration = Registrations.findOne(registrationId);
          return (
            <ResultsList key={registration._id}
                         competitionUrlId={this.props.competitionUrlId}
                         roundPrettyStringOpts={{}}
                         registration={registration}
                         results={results}
                         prettyStringOpts={{ showEventName: true, showName: false, showFormat: false }}
                         showNameInHeader={true}
            />
          );
        })}
      </div>
    );
  }
});
