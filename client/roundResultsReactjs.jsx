var log = logging.handle("roundResultsReact");

Template.roundResultsListReactjs.rendered = function() {
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

Template.roundResultsListReactjs.destroyed = function() {
  var template = this;
  React.unmountComponentAtNode(
    template.$(".reactRenderArea")[0]
  );
};

var autocompleteEnteredReact = new ReactiveVar(null);

Template.roundResultsListReactjs.events({
  'input #inputCompetitorName': function(e) {
    autocompleteEnteredReact.set(e.currentTarget.value);
  },
  'focus #inputCompetitorName': function(e) {
    e.currentTarget.select();
  },
});

Template.roundResultsReact_namePill.helpers({
  highlightedName: function() {
    var substring = autocompleteEnteredReact.get();
    var string = this.profile.name;

    if(substring.length === 0) {
      return _.escape(string);
    }

    var prettyFormat = "";
    var index = 0;
    while(index < string.length) {
      var substringStartIndex = string.toLowerCase().indexOf(substring.toLowerCase(), index);
      if(substringStartIndex < 0) {
        prettyFormat += _.escape(string.substring(index));
        break;
      }
      prettyFormat += _.escape(string.substring(index, substringStartIndex));
      var substringEndIndex = substringStartIndex + substring.length;
      assert(substringEndIndex <= string.length);
      prettyFormat += "<strong>" + _.escape(string.substring(substringStartIndex, substringEndIndex)) + "</strong>";
      index = substringEndIndex;
    }

    return prettyFormat;
  },
});

var ResultRow = React.createClass({
  render: function() {
    var result = this.props.result;
    var competitionUrlId = this.props.competitionUrlId;
    var competitorNameNode;
    if(competitionUrlId) {
      var path = Router.routes['competitorResults'].path({
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

    result.solves = result.solves || [];
    // TODO - i think a lot of this logic will get moved into
    // the Results collection via autovalues.
    var bestSolve, bestIndex;
    var worstSolve, worstIndex;
    if(roundFormat.code == "a") {
      var isCombinedAndDidNotDoAverage = false;
      if(this.props.roundType.combined) {
        var hasEmptySolve = _.find(result.solves, function(solve) {
          return solve.millis === 0;
        });
        if(hasEmptySolve || result.solves.length != roundFormat.count) {
          isCombinedAndDidNotDoAverage = true;
        }
      }

      // Only compute the dropped solves if the competitor *did* do a full average.
      if(!isCombinedAndDidNotDoAverage) {
        result.solves.forEach(function(solve, i) {
          if(!worstSolve || solve.millis > worstSolve.millis || $.solveTimeIsDNF(solve) || $.solveTimeIsDNS(solve)) {
            worstIndex = i;
            worstSolve = solve;
          }
          if(!bestSolve || solve.millis < bestSolve.millis) {
            bestIndex = i;
            bestSolve = solve;
          }
        });
      }
    }

    var hidePosition = this.props.hidePosition;
    return (
      <tr className={rowClasses} data-result-id={result._id}>
        <td>{hidePosition ? '' : result.position}</td>
        <td>{competitorNameNode}</td>
        <td className={averageClasses}>{clockFormat(result.average, true)}</td>
        <td className={bestClasses}>{clockFormat(result.best)}</td>
        {(result.solves || []).map(function(solve, i) {
          var solveClasses = React.addons.classSet({
            'results-solve': true,
            'results-solve-dropped': (i === bestIndex || i === worstIndex),

            'text-right': true,
          });
          return (
            <td key={i} className={solveClasses}>{clockFormat(solve)}</td>
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
    var resultsCursor = Results.find({
      roundId: roundId,
    }, {
      limit: this.props.limit, // https://github.com/jfly/gjcomps/issues/75
      sort: {
        // Note that limiting without sorting will result in an
        // essentially random set of people being displayed, but
        // that's fine, because we care more about speed than
        // correctness. See comment below about sorting.
        //'position': 1,
      },
    });
    // This is *insane*, but asking meteor to sort is
    // *significantly* slower than just fetching and doing
    // it ourselves. So here we go.
    var results = resultsCursor.fetch();
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
    var roundCode = getRoundAttribute(roundId, 'roundCode');

    return {
      results: results,
      formatCode: formatCode,
      roundCode: roundCode,
    }
  },
  componentWillMount: function() {
    log.l1("component will mount");
  },
  componentDidMount: function() {
    log.l1("component did mount");

    var $resultsTable = $(this.refs.resultsTable.getDOMNode());
    $resultsTable.stickyTableHeaders();

    // React freaks out if it finds dom nodes that share a data-reactid.
    // Since $.stickyTableHeaders copies the <thead> we generated with react,
    // that copy has a data-reactid. Explicitly removing this attribute seems to
    // be enough to make react happy.
    var $floatingHead = $resultsTable.find("thead.tableFloatingHeader");
    $floatingHead.removeAttr('data-reactid');
  },
  componentWillUpdate(nextProps, nextState) {
    log.l1("component will update");
  },
  componentDidUpdate(prevProps, prevState) {
    log.l1("component did update");
  },
  render: function() {
    var that = this;
    var roundId = that.props.roundId;
    var format = wca.formatByCode[that.state.formatCode];
    var roundType = wca.roundByCode[that.state.roundCode];

    return (
      <div className="table-responsive">
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
                           roundType={roundType}
                           drawLine={drawLine}
                           hidePosition={prevResult && prevResult.position == result.position}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
});
