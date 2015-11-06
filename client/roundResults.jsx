const log = logging.handle("roundResults");

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
  // https://github.com/cubing/ccm/issues/75
  let resultsListLimitReact = new ReactiveVar(25);
  Meteor.defer(function() {
    resultsListLimitReact.set(0);
  });

  template.autorun(function() {
    let data = Template.currentData();

    let limit = resultsListLimitReact.get();
    let round = Rounds.findOne(data.roundId);
    let results = round.getResultsWithRegistrations(limit);
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

    ReactDOM.render(
      <ResultsList competitionUrlId={data.competitionUrlId}
                   advanceCount={data.advanceCount}
                   configurableAdvanceCount={data.configurableAdvanceCount}
                   round={round}
                   selectedResultId={data.selectedResultId}
                   results={results}
                   showFooter={true}
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
  ReactDOM.unmountComponentAtNode(
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
