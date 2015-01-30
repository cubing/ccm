var log = logging.handle("roundResults");

Template.roundResultsList.rendered = function() {
  var template = this;

  // To give the illusion of loading quickly, first render
  // a small subset of all the results for this round, and then
  // render the rest later.
  var resultsListLimitReact = new ReactiveVar(25);
  setTimeout(function() {
    resultsListLimitReact.set(0);
  }, 0);

  template.autorun(function() {
    var data = Template.currentData();

    var limit = resultsListLimitReact.get();
    React.render(
      <ResultsList competitionUrlId={data.competitionUrlId}
                   roundId={data.roundId}
                   advanceCount={data.advanceCount}
                   configurableAdvanceCount={data.configurableAdvanceCount}
                   limit={limit}
      />,
      template.$(".reactRenderArea")[0]
    );
  });

  var $sidebar = template.$('.results-sidebar');
  $sidebar.affix({
    offset: {
      top: function() {
        var parentTop = $sidebar.parent().offset().top;
        var affixTopSpacing = 20; // From .results-sidebar.affix in roundResults.css
        return parentTop - affixTopSpacing;
      },
    }
  });
};

Template.roundResultsList.destroyed = function() {
  var template = this;
  React.unmountComponentAtNode(
    template.$(".reactRenderArea")[0]
  );
};

var autocompleteEnteredReact = new ReactiveVar(null);

Template.roundResultsList.events({
  'input #inputCompetitorName': function(e) {
    autocompleteEnteredReact.set(e.currentTarget.value);
  },
  'focus #inputCompetitorName': function(e) {
    e.currentTarget.select();
  },
});

var ResultRow = React.createClass({
  render: function() {
    var result = this.props.result;
    var competitionUrlId = this.props.competitionUrlId;
    var competitorNameNode;
    if(competitionUrlId) {
      var path = Router.routes.competitorResults.path({
        competitionUrlId: competitionUrlId,
        competitorUniqueName: result.uniqueName,
      });
      competitorNameNode = (
        <a href={path}>
          {result.uniqueName}
        </a>
      );
    } else {
      competitorNameNode = result.uniqueName;
    }

    var roundFormat = this.props.roundFormat;
    var sortByField = roundFormat.sortBy.toLowerCase();
    var averageClasses = React.addons.classSet({
      'results-average': true,
      'text-right': true,
      'results-primary-sort-field': (sortByField == 'average'),
    });

    var bestClasses = React.addons.classSet({
      'results-best': true,
      'text-right': true,
      'results-primary-sort-field': (sortByField == 'best'),
    });

    var rowClasses = React.addons.classSet({
      'result': true,
      'competitor-advanced': result.advanced,
      'last-competitor-to-advance': this.props.drawLine,
    });

    var trimBestAndWorst = result.average && roundFormat.trimBestAndWorst;
    var tiedPrevious = this.props.tiedPrevious;
    return (
      <tr className={rowClasses} data-result-id={result._id}>
        <td className={tiedPrevious ? 'results-solve-tied' : ''}>{result.position}</td>
        <td>{competitorNameNode}</td>
        <td className={averageClasses}>{clockFormat(result.average)}</td>
        <td className={bestClasses}>{clockFormat(result.solves[result.bestIndex])}</td>
        {(result.solves || []).map(function(solve, i) {
          var solveClasses = React.addons.classSet({
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

var ResultsList = React.createClass({
  mixins: [ReactMeteor.Mixin],

  getMeteorState: function() {
    var roundId = this.props.roundId;

    // https://github.com/cubing/ccm/issues/75
    var results = getResultsWithUniqueNamesForRound(roundId, this.props.limit);
    // Asking meteor to sort is slower than just fetching and doing
    // it ourselves. So here we go.
    results.sort(function(a, b) {
      // position may be undefined if no times have been entered yet.
      // We intentionally sort so that unentered rows are on the bottom.
      if(!a.position) {
        return 1;
      }
      if(!b.position) {
        return -1;
      }
      return a.position - b.position;
    });

    var formatCode = getRoundAttribute(roundId, 'formatCode');

    return {
      results: results,
      formatCode: formatCode,
    };
  },
  componentWillMount: function() {
    log.l1("component will mount");
  },
  componentDidMount: function() {
    log.l1("component did mount");

    var $resultsTable = $(this.refs.resultsTable.getDOMNode());
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

    var $resultsTable = $(this.refs.resultsTable.getDOMNode());
    makeTableNotSticky($resultsTable);
  },
  resultsTableScroll: function(e) {
    // TODO - move this logic into stickytables.js
    // Workaround for https://github.com/jmosbech/StickyTableHeaders/issues/68.
    // StickyTableHeaders doesn't handle horizontal scrolling, so we detect it
    // ourselves and force the table header to reposition itself.
    var $resultsTable = $(this.refs.resultsTable.getDOMNode());
    $resultsTable.data('plugin_stickyTableHeaders').toggleHeaders();
  },
  render: function() {
    var that = this;
    var roundId = that.props.roundId;
    var format = wca.formatByCode[that.state.formatCode];

    return (
      <div className="table-responsive" onScroll={this.resultsTableScroll}>
        <table className="table table-striped table-results" ref="resultsTable">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th className="results-average text-right">
                {format.averageName}
              </th>
              <th className="results-best text-right">Best</th>
              <th className="text-center" colSpan={format.count}>Solves</th>
            </tr>
          </thead>
          <tbody>
            {that.state.results.map(function(result, i) {
              var prevResult = i > 0 ? that.state.results[i - 1] : null;
              var drawLine = that.props.configurableAdvanceCount && that.props.advanceCount == i + 1;
              return (
                <ResultRow key={result._id}
                           competitionUrlId={that.props.competitionUrlId}
                           result={result}
                           roundFormat={format}
                           drawLine={drawLine}
                           tiedPrevious={prevResult && prevResult.position == result.position}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
});
