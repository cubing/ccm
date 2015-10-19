Template.podiums.rendered = function() {
  let template = this;

  template.autorun(function() {
    var data = Template.currentData();
    React.render(<EventPodiums competitionId={data.competitionId}
                               competitionUrlId={data.competitionUrlId}
                               finalRounds={data.finalRounds} />,
      template.$('.reactRenderArea')[0]
    );
  });
};

Template.podiums.destroyed = function() {
  var template = this;
  React.unmountComponentAtNode(
    template.$(".reactRenderArea")[0]
  );
};

const EventPodiums = React.createClass({
  render: function() {
    return (
      <div>
        {this.props.finalRounds.map(round => {
          return (
            <EventPodium key={round._id}
                         competitionUrlId={this.props.competitionUrlId}
                         competitionId={this.props.competitionId}
                         round={round} />
          );
        })}
      </div>
    );
  }
});

const EventPodium = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData: function() {
    let results = Results.find({
      roundId: this.props.round._id,
      position: { $in: [1, 2, 3] },
    }, {
      sort: {
        position: 1,
      }
    }).fetch();
    results.forEach(result => {
      result.round = this.props.round;
      result.registration = Registrations.findOne(result.registrationId);
    });
    return { results: results };
  },
  render: function() {
    let maxSolvesInRound = _.max(this.data.results.map(result => result.round.format().count));
    let preferredFormat = wca.formatByCode[wca.formatsByEventCode[this.props.round.eventCode][0]];
    return (
      <table className="table table-hover">
        <thead>
          <tr>
            <th>#</th>
            <th>{wca.eventByCode[this.props.round.eventCode].name}</th>
            <th className="results-average text-right">{preferredFormat.averageName}</th>
            <th className="results-best text-right">Best</th>
            <th className="text-center" colSpan={maxSolvesInRound}>Solves</th>
          </tr>
        </thead>
        <tbody>
          {_.sortBy(this.data.results, result => -this.props.round.nthRound).map(result => {
            return (
              <ResultRowWithName key={result._id}
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
