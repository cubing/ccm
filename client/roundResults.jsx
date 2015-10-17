let log = logging.handle("roundResults");

Template.roundResults.helpers({
  round: function() {
    return Rounds.findOne(this.roundId);
  },
});

Template.roundResultsList.rendered = function() {
  let template = this;

  // To give the illusion of loading quickly, first render
  // a small subset of all the results for this round, and then
  // render the rest later.
  let resultsListLimitReact = new ReactiveVar(25);
  Meteor.defer(function() {
    resultsListLimitReact.set(0);
  });

  template.autorun(function() {
    let data = Template.currentData();

    let limit = resultsListLimitReact.get();
    React.render(
      <ResultsList competitionUrlId={data.competitionUrlId}
                   roundId={data.roundId}
                   advanceCount={data.advanceCount}
                   configurableAdvanceCount={data.configurableAdvanceCount}
                   selectedResultId={data.selectedResultId}
                   limit={limit}
      />,
      template.$(".reactRenderArea")[0]
    );
  });

  let $sidebar = template.$('.results-sidebar');
  $sidebar.affix({
    offset: {
      top: function() {
        let parentTop = $sidebar.parent().offset().top;
        let affixTopSpacing = 20; // From .results-sidebar.affix in roundResults.css
        return parentTop - affixTopSpacing;
      },
    }
  });
};

Template.roundResultsList.destroyed = function() {
  let template = this;
  React.unmountComponentAtNode(
    template.$(".reactRenderArea")[0]
  );
};

let autocompleteEnteredReact = new ReactiveVar(null);

Template.roundResultsList.events({
  'input #inputParticipantName': function(e) {
    autocompleteEnteredReact.set(e.currentTarget.value);
  },
  'focus #inputParticipantName': function(e) {
    e.currentTarget.select();
  },
});

let ResultsList = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData: function() {
    let roundId = this.props.roundId;

    // https://github.com/cubing/ccm/issues/75
    let results = getResultsWithRegistrations(roundId, this.props.limit);
    // Asking meteor to sort is slower than just fetching and doing
    // it ourselves. So here we go.
    results.sort(function(a, b) {
      // position may be undefined if no times have been entered yet.
      // We intentionally sort so that unentered rows (results without a position)
      // are on the bottom, with noShows even lower than them.
      if(a.noShow && !b.noShow) {
        return 1;
      } else if(!a.noShow && b.noShow) {
        return -1;
      }
      if(!a.position && !b.position) {
        // Both of these results do not have a position yet, so sort them
        // by how they did in the previous round.
        if(!a.previousPosition) {
          return 1;
        }
        if(!b.previousPosition) {
          return -1;
        }
        return a.previousPosition - b.previousPosition;
      }
      if(!a.position) {
        return 1;
      }
      if(!b.position) {
        return -1;
      }
      return a.position - b.position;
    });
    let round = Rounds.findOne(roundId);
    results.forEach(result => {
      result.round = round;
    });

    return {
      results: results,
      round: round,
    };
  },
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
    let format = this.data.round.format();
    let columnCount = 4 + format.count;

    let withResultsCount = _.select(this.data.results, result => !result.noShow && result.position).length;
    let incompleteCount = _.select(this.data.results, result => !result.noShow && !result.position).length;
    let competitorsCount = _.select(this.data.results, result => !result.noShow).length;
    let footerText = `${withResultsCount} with results + ${incompleteCount} awaiting results = ${competitorsCount} competitors`;
    let footer = (
      <tr>
        <td colSpan={columnCount}>
          {withResultsCount} with results + {incompleteCount} incomplete = {competitorsCount} competitors
        </td>
      </tr>
    );

    let extraFooter = null;
    let noShowCount = _.select(this.data.results, result => result.noShow).length;
    if(noShowCount > 0) {
      extraFooter = (
        <tr>
          <td colSpan={columnCount}>
            {noShowCount} did not show up
          </td>
        </tr>
      );
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
    let maxAllowedToAdvanceCount = this.data.round.getMaxAllowedToAdvanceCount();
    return (
      <div className="table-responsive" onScroll={this.resultsTableScroll}>
        <table className="table table-striped table-hover table-results" ref="resultsTable" id="resultsTable">
          <thead>
            <tr>
              <th></th>
              <th className="participant-name">Name</th>
              <th className="results-average text-right">
                {format.averageName}
              </th>
              <th className="results-best text-right">Best</th>
              <th className="text-center" colSpan={format.count}>Solves</th>
            </tr>
          </thead>
          <tbody>
            {this.data.results.map((result, i) => {
              let prevResult = i > 0 ? this.data.results[i - 1] : null;
              let lastToAdvance = this.props.configurableAdvanceCount && this.props.advanceCount == i + 1;
              let lastAllowedToAdvance = this.props.configurableAdvanceCount && maxAllowedToAdvanceCount == i + 1;
              return (
                <ResultRowWithName key={result._id}
                                   competitionUrlId={this.props.competitionUrlId}
                                   result={result}
                                   drawLastToAdvanceLine={lastToAdvance}
                                   drawLastAllowedToAdvanceLine={lastAllowedToAdvance}
                                   selected={result._id == this.props.selectedResultId}
                                   tiedPrevious={prevResult && prevResult.position == result.position}
                                   onNameClick={this.onNameClick}
                />
              );
            })}
          </tbody>
          <tfoot>
            {footer}
            {extraFooter}
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
