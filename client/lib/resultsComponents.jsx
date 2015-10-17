ResultRow = function(ResultIdentifierTd) {
  return React.createClass({
    render: function() {
      let result = this.props.result;
      let competitionUrlId = this.props.competitionUrlId;

      let roundFormat = this.props.result.round.format();
      let sortByField = roundFormat.sortBy.toLowerCase();
      let averageClasses = classNames({
        'results-average': true,
        'text-right': true,
        'results-primary-sort-field': (sortByField == 'average'),
      });

      let bestClasses = classNames({
        'results-best': true,
        'text-right': true,
        'results-primary-sort-field': (sortByField == 'best'),
      });

      let rowClasses = classNames({
        'result': true,
        'participant-advanced': result.advanced,
        'last-participant-to-advance': this.props.drawLastToAdvanceLine,
        'last-participant-allowed-to-advance': this.props.drawLastAllowedToAdvanceLine,
        'no-show': result.noShow,
        'selected-result': this.props.selected,
      });

      let trimBestAndWorst = result.average && roundFormat.trimBestAndWorst;
      let tiedPrevious = this.props.tiedPrevious;
      let solves = result.allSolves();
      return (
        <tr className={rowClasses} data-result-id={result._id}>
          <td className={tiedPrevious ? 'results-solve-tied' : ''}>{result.position}</td>
          <ResultIdentifierTd competitionUrlId={competitionUrlId} result={result} onNameClick={this.props.onNameClick} />
          <td className={averageClasses}>{clockFormat(result.average)}</td>
          <td className={bestClasses}>{clockFormat(result.solves[result.bestIndex])}</td>
          {solves.map(function(solve, i) {
            let solveClasses = classNames({
              'results-solve': true,
              'results-solve-dropped': (trimBestAndWorst && (i === result.bestIndex || i === result.worstIndex)),

              'text-right': true,
            });
            return (
              <td key={i} data-solve-index={i} className={solveClasses}>{clockFormat(solve)}</td>
            );
          })}
        </tr>
      );
    },
  });
};

ResultRowWithName = ResultRow(React.createClass({
  render: function() {
    let competitionUrlId = this.props.competitionUrlId;
    let result = this.props.result;

    let uniqueNameNode;
    if(this.props.competitionUrlId) {
      uniqueNameNode = (
        <a href="#" onClick={this.props.onNameClick.bind(null, result)}>
          {result.registration.uniqueName}
        </a>
      );
    } else {
      uniqueNameNode = result.registration.uniqueName;
    }
    return (
      <td className="participant-name">{uniqueNameNode}</td>
    );
  },
}));

ResultRowWithRound = ResultRow(React.createClass({
  render: function() {
    let result = this.props.result;
    let roundPath = Router.routes.roundResults.path({
      competitionUrlId: this.props.competitionUrlId,
      eventCode: result.round.eventCode,
      nthRound: result.round.nthRound,
    });
    return (
      <td><a href={roundPath}>{wca.roundByCode[result.round.roundCode()].name}</a></td>
    );
  },
}));
