Template.participantResults.rendered = function() {
  let template = this;

  template.autorun(function() {
    var data = Template.currentData();
    React.render(<ParticipantResults competitionId={data.competitionId}
                                     competitionUrlId={data.competitionUrlId}
                                     registration={data.registration}/>,
      template.$('.reactRenderArea')[0]
    );
  });
};

Template.participantResults.destroyed = function() {
  var template = this;
  React.unmountComponentAtNode(
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

const ParticipantResults = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData: function() {
    let results = Results.find({
      competitionId: this.props.competitionId,
      registrationId: this.props.registration._id,
    }).fetch();
    results.forEach(result => {
      result.round = Rounds.findOne(result.roundId);
    });
    let resultsByEvent = _.groupBy(results, result => result.round.eventCode);
    return {
      resultsByEvent: resultsByEvent,
    };
  },
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

        {Object.keys(this.data.resultsByEvent).sort().map(eventCode => {
          return <SingleEventResults key={eventCode}
                                     eventCode={eventCode}
                                     competitionUrlId={this.props.competitionUrlId}
                                     results={this.data.resultsByEvent[eventCode]} />;
        })}
      </div>
    );
  },
});
