Template.podiums.rendered = function() {
  let template = this;

  template.autorun(function() {
    let data = Template.currentData();
    React.render(<EventPodiums competitionUrlId={data.competitionUrlId}
                               byPerson={false}
                               finalRounds={data.finalRounds}
                               finalResults={data.finalResults} />,
      template.$('.reactRenderArea')[0]
    );
  });
};
Template.podiums.destroyed = function() {
  let template = this;
  React.unmountComponentAtNode(
    template.$(".reactRenderArea")[0]
  );
};

Template.podiumsByPerson.rendered = function() {
  let template = this;

  template.autorun(function() {
    let data = Template.currentData();
    React.render(<EventPodiumsByPerson competitionUrlId={data.competitionUrlId}
                                       finalRounds={data.finalRounds}
                                       finalResults={data.finalResults} />,
      template.$('.reactRenderArea')[0]
    );
  });
};
Template.podiumsByPerson.destroyed = function() {
  let template = this;
  React.unmountComponentAtNode(
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
                         byPerson={false}
                         results={results}
                         round={round}
                         showEventInHeader={true}
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
      .sortBy(([registrationId, results]) => _.min(_.map(results, resultValue)))
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
                         byPerson={true}
                         registration={registration}
                         results={results}
                         showNameInHeader={true}
            />
          );
        })}
      </div>
    );
  }
});

const EventPodium = React.createClass({
  render: function() {
    let maxSolvesInRound = _.max(this.props.results.map(result => result.round.format().count));
    let averageNames = _.unique(_.map(this.props.results, result => result.round.format().averageName).sort()).join("/");
    let secondHeader;
    if(this.props.byPerson) {
      let registrationPath = Router.routes.participantResults.path({
        competitionUrlId: this.props.competitionUrlId,
        participantUniqueName: this.props.registration.uniqueName,
      });
      secondHeader = (<a href={registrationPath}>{this.props.registration.uniqueName}</a>);
    } else {
      let roundPath = Router.routes.roundResults.path({
        competitionUrlId: this.props.competitionUrlId,
        eventCode: this.props.round.eventCode,
        nthRound: this.props.round.nthRound,
      });
      secondHeader = (<a href={roundPath}>{this.props.round.eventName()}</a>);
    }
    return (
      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              <th>#</th>
              <th>{secondHeader}</th>
              <th className="results-average text-right">{averageNames}</th>
              <th className="results-best text-right">Best</th>
              <th className="text-center" colSpan={maxSolvesInRound}>Solves</th>
            </tr>
          </thead>
          <tbody>
            {this.props.results.map(result => {
              if(this.props.byPerson) {
                return (
                  <ResultRowWithRound key={result._id}
                                      competitionUrlId={this.props.competitionUrlId}
                                      result={result}
                  />
                );
              } else {
                return (
                  <ResultRowWithName key={result._id}
                                     competitionUrlId={this.props.competitionUrlId}
                                     result={result}
                                     onNameClick={this.onNameClick}
                  />
                );
              }
            })}
          </tbody>
        </table>
      </div>
    );
  },
});
