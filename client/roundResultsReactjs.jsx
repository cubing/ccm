Template.roundResultsReactjs.rendered = function() {
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

    var start = performance.now();
    var limit = resultsListLimitReact.get();
    React.render(
      <ResultsList limit={limit} roundId={data.roundId}/>,
      template.$("#reactRenderArea")[0]
    );
    var end = performance.now();
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

Template.roundResultsReactjs.destroyed = function() {
  var template = this;
  React.unmountComponentAtNode(
    template.$("#reactRenderArea")[0]
  );
};

var autocompleteEnteredReact = new ReactiveVar(null);

Template.roundResultsReactjs.events({
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

    //<<<var formatCode = getRoundAttribute(result.roundId, 'formatCode');
    var formatCode = 'a';//<<<
    var format = wca.formatByCode[formatCode];
    var primarySortField = format.averageName.toLowerCase();

    var competitorAdvanced = false;//<<<
    var competitionUrlId = null;//<<<
    var competitorName = this.props.competitorName;
    var competitorNameNode;
    if(competitionUrlId) {
      competitorNameNode = (
        <a href="{{pathFor 'competitorResults' competitionUrlId=../../competitionUrlId competitorName=competitorName }}">
          {competitorName}
        </a>
      );
    } else {
      competitorNameNode = competitorName;
    }

    var averageClasses = React.addons.classSet({
      'results-average': true,
      'text-right': true,
      'results-primary-sort-field': (primarySortField == 'average'),
    });

    var bestClasses = React.addons.classSet({
      'results-best': true,
      'text-right': true,
      'results-primary-sort-field': (primarySortField == 'best'),
    });
    return (
      <tr className={competitorAdvanced ? 'competitor-advanced' : ''}>
        <td>{result.position}</td>
        <td>{competitorNameNode}</td>
        <td className={averageClasses}>{clockFormat(result.average)}</td>
        <td className={bestClasses}>{clockFormat(result.best)}</td>
        {result.solves.map(function(solve, i) {
          return (
            <td key={i} className="results-solve text-right">{clockFormat(solve)}</td>
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
      return a.position - b.position;
    });

    var users = Meteor.users.find({
    }, {
      fields: {
        "profile.name": 1
      },
      reactive: false,
    }).fetch();
    var userById = {};
    _.each(users, function(user) {
      userById[user._id] = user;
    });

    var formatCode = getRoundAttribute(roundId, 'formatCode');
    var format = wca.formatByCode[formatCode];

    return {
      results: results,
      userById: userById,
      primarySortField: format.averageName,
    }
  },
  componentDidMount: function() {
    console.log(performance.now() + " component did mount");
  },
  componentWillUpdate(nextProps, nextState) {
    console.log(performance.now() + " componentWillUpdate");//<<<
  },
  componentDidUpdate(prevProps, prevState) {
    console.log(performance.now() + " componentDidUpdate");//<<<
  },
  render: function() {
    var that = this;
    var selectCompetitor = false;//<<<
    var roundId = that.props.roundId;

    var formatCode = getRoundAttribute(roundId, 'formatCode');
    var format = wca.formatByCode[formatCode];
    var roundCumulativeResultFieldName = format.averageName;

    var formatCode = getRoundAttribute(roundId, 'formatCode');
    var format = wca.formatByCode[formatCode];
    var solveCount = format.count;

    return (
      <div className={selectCompetitor ? 'col-xs-12 col-sm-7' : ''}>
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th className="results-average text-right">
                {roundCumulativeResultFieldName}
              </th>
              <th className="results-best text-right">Best</th>
              <th className="text-center" colSpan={solveCount}>Solves</th>
            </tr>
          </thead>
          <tbody>
            {that.state.results.map(function(result) {
              return (
                <ResultRow key={result._id} result={result}
                           competitorName={that.state.userById[result.userId].profile.name} />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
});
