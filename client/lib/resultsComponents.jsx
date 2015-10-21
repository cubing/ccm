const log = logging.handle("resultsComponents");

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
        'bronze': result.round.isLast() && result.position === 3,
        'silver': result.round.isLast() && result.position === 2,
        'gold': result.round.isLast() && result.position === 1,
        'last-participant-to-advance': this.props.drawLastToAdvanceLine,
        'last-participant-allowed-to-advance': this.props.drawLastAllowedToAdvanceLine,
        'no-show': result.noShow,
        'selected-result': this.props.selected,
      });

      let positionClasses = classNames({
        'results-solve-tied': tiedPrevious,
        'text-right': true,
      });

      let trimBestAndWorst = result.average && roundFormat.trimBestAndWorst;
      let tiedPrevious = this.props.tiedPrevious;
      let solves = result.allSolves();
      while(solves.length < this.props.maxSolveCountInResults) {
        solves.push(null);
      }
      return (
        <tr className={rowClasses} data-result-id={result._id}>
          <td className={positionClasses}>{result.position}</td>
          <ResultIdentifierTd competitionUrlId={competitionUrlId}
                              result={result}
                              prettyStringOpts={this.props.prettyStringOpts}
                              onNameClick={this.props.onNameClick}
          />
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
          <td></td>
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
        <a href="#" onClick={this.props.onNameClick ? this.props.onNameClick.bind(null, result) : null}>
          {result.registration.uniqueName}
        </a>
      );
    } else {
      uniqueNameNode = result.registration.uniqueName;
    }
    return (
      <td>{uniqueNameNode}</td>
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
      <td><a href={roundPath}>{result.round.prettyString(this.props.prettyStringOpts)}</a></td>
    );
  },
}));

ResultsList = React.createClass({
  getInitialState: function() {
    return { selectedResult: null };
  },
  componentWillMount: function() {
    log.l1("component will mount");
  },
  componentDidMount: function() {
    log.l1("component did mount");

    let $resultsTable = $(this.refs.resultsTable.getDOMNode());
    makeTableSticky($resultsTable);
  },
  componentWillUpdate(nextProps, nextState) {
    log.l1("component will update");
  },
  componentDidUpdate(prevProps, prevState) {
    log.l1("component did update");
  },
  componentWillUnmount: function() {
    log.l1("component will unmount");

    let $resultsTable = $(this.refs.resultsTable.getDOMNode());
    makeTableNotSticky($resultsTable);
  },
  resultsTableScroll: function(e) {
    // TODO - move this logic into stickytables.js
    // Workaround for https://github.com/jmosbech/StickyTableHeaders/issues/68.
    // StickyTableHeaders doesn't handle horizontal scrolling, so we detect it
    // ourselves and force the table header to reposition itself.
    let $resultsTable = $(this.refs.resultsTable.getDOMNode());
    $resultsTable.data('plugin_stickyTableHeaders').toggleHeaders();
  },
	onNameClick: function(result) {
    let $resultDetailsModal = $(this.refs.resultDetailsModal.getDOMNode());
    this.setState({ selectedResult: result });
    $resultDetailsModal.modal('show');
	},
  render: function() {
    let maxSolveCountInResults = _.max(this.props.results.map(result => result.allSolves().length));
    let averageNames = ( _.chain(this.props.results)
      .map(result => result.round.format().averageName)
      .unique()
      .compact()
      .sortBy()
      .value()
      .join("/")
    );

    let footerRows = [];
    if(this.props.showFooter) {
      let withResultsCount = _.select(this.props.results, result => !result.noShow && result.position).length;
      let incompleteCount = _.select(this.props.results, result => !result.noShow && !result.position).length;
      let competitorsCount = _.select(this.props.results, result => !result.noShow).length;
      let columnCount = 4 + maxSolveCountInResults + 1;
      footerRows.push(
        <tr key={footerRows.length}>
          <td colSpan={columnCount}>
            {withResultsCount} with results + {incompleteCount} incomplete = {competitorsCount} competitors
          </td>
        </tr>
      );

      let noShowCount = _.select(this.props.results, result => result.noShow).length;
      if(noShowCount > 0) {
        footerRows.push(
          <tr key={footerRows.length}>
            <td colSpan={columnCount}>
              {noShowCount} did not show up
            </td>
          </tr>
        );
      }
    }

    let secondHeader;
    if(this.props.showNameInHeader) {
      let registrationPath = Router.routes.participantResults.path({
        competitionUrlId: this.props.competitionUrlId,
        participantUniqueName: this.props.registration.uniqueName,
      });
      secondHeader = (<th><a href={registrationPath}>{this.props.registration.uniqueName}</a></th>);
    } else if(this.props.eventToShowInHeader) {
      if(this.props.round) {
        let roundPath = Router.routes.roundResults.path({
          competitionUrlId: this.props.competitionUrlId,
          eventCode: this.props.round.eventCode,
          nthRound: this.props.round.nthRound,
        });
        secondHeader = (<th><a href={roundPath}>{this.props.round.eventName()}</a></th>);
      } else {
        secondHeader = (<th>{wca.eventByCode[this.props.eventToShowInHeader].name}</th>);
      }
    } else {
      secondHeader = (<th>Name</th>);
    }

    let resultDetailsModalContent = null;
    if(this.state.selectedResult) {
      let result = this.state.selectedResult;
      let registration = result.registration;
      let allResultsPath = Router.routes.participantResults.path({
        competitionUrlId: this.props.competitionUrlId,
        participantUniqueName: registration.uniqueName,
      });
      let bestNode = null;
      if(!_.isUndefined(result.bestIndex)) {
        bestNode = (
          <p><strong>Best</strong> {clockFormat(result.solves[result.bestIndex])}</p>
        );
      }
      let averageNode = null;
      if(result.average) {
        averageNode = (
          <p><strong>Average</strong> {clockFormat(result.average)}</p>
        );
      }
      let positionNode = null;
      if(result.position) {
        positionNode = (
          <p><strong>Position</strong> {result.position}</p>
        );
      }
      resultDetailsModalContent = (
        <div className="modal-content">
          <div className="modal-header">
            <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h4 className="modal-title">
              {registration.uniqueName} <span className={"flag-icon flag-icon-" + registration.countryId.toLowerCase()}></span>
            </h4>
          </div>
          <div className="modal-body">
            <p>
              {result.solves.map((solve, i) => {
                let str = clockFormat(solve);
                if(i === result.bestIndex || i === result.worstIndex) {
                  str = "(" + str + ")";
                }
                return str;
              }).join(", ")}
            </p>
            {positionNode}
            {averageNode}
            {bestNode}
            <a href={allResultsPath}>All results</a>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
          </div>
        </div>
      );
    }

    let maxAllowedToAdvanceCount= this.props.round ? this.props.round.getMaxAllowedToAdvanceCount() : null;
    return (
      <div className="table-responsive" onScroll={this.resultsTableScroll}>
        <table className="table table-striped table-hover table-results" ref="resultsTable">
          <thead>
            <tr>
              <th></th>
              {secondHeader}
              <th className="results-average text-right">{averageNames}</th>
              <th className="results-best text-right">Best</th>
              <th className="text-center" colSpan={maxSolveCountInResults}>Solves</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {this.props.results.map((result, i) => {
              let prevResult = i > 0 ? this.props.results[i - 1] : null;
              let lastToAdvance = this.props.configurableAdvanceCount && this.props.advanceCount == i + 1;
              let lastAllowedToAdvance = this.props.configurableAdvanceCount && this.props.maxAllowedToAdvanceCount == i + 1;
              if(this.props.prettyStringOpts) {
                return (
                  <ResultRowWithRound key={result._id}
                                      competitionUrlId={this.props.competitionUrlId}
                                      maxSolveCountInResults={maxSolveCountInResults}
                                      result={result}
                                      prettyStringOpts={this.props.prettyStringOpts}
                  />
                );
              } else {
                return (
                  <ResultRowWithName key={result._id}
                                     competitionUrlId={this.props.competitionUrlId}
                                     maxSolveCountInResults={maxSolveCountInResults}
                                     result={result}
                                     drawLastToAdvanceLine={lastToAdvance}
                                     drawLastAllowedToAdvanceLine={lastAllowedToAdvance}
                                     selected={result._id == this.props.selectedResultId}
                                     tiedPrevious={prevResult && prevResult.position == result.position}
                                     onNameClick={this.onNameClick}
                  />
                );
              }
            })}
          </tbody>
          <tfoot>
            {footerRows}
          </tfoot>
        </table>
				<div className="modal fade" ref="resultDetailsModal">
					<div className="modal-dialog">
            {resultDetailsModalContent}
					</div>
				</div>
      </div>
    );
  }
});
