var assert = require("assert");
var expect = require("chai").expect;

// __wca.js uses assert and doesn't require() it, so lets jam it into the
// global scope for it.
global.assert = assert;

// Hacking to stub out jQuery
global.jQuery = {};
global.$ = jQuery;
jQuery.fn = {};
jQuery.extend = function(a) {
  for(var k in a) {
    $[k] = a[k];
  }
  return $;
};

require("../../both/__wca.js");
require("../../both/components/jChester.js");

function time(millis) {
  return {
    millis: millis,
    decimals: 2
  };
}

function moves(mvs) {
  return { moveCount: mvs };
}

function mbf(millis, solved, attempted) {
  return {
    millis: millis,
    puzzlesSolvedCount: solved,
    puzzlesAttemptedCount: attempted,
  };
}

function dnf() {
  return {
    puzzlesSolvedCount: 0,
    puzzlesAttemptedCount: 1
  };
}

function dns() {
  return {
    puzzlesSolvedCount: 0,
    puzzlesAttemptedCount: 0
  };
}

describe('wca', function() {
  describe('computeSolvesStatistics', function() {
    describe('average of five', function() {
      var roundFormatCode = 'a';

      it('simple average', function() {
        var solves = [time(1300), time(555), time(1000), time(9999), time(1300)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(1200));
        expect(stats.bestIndex).to.equal(1);
        expect(stats.worstIndex).to.equal(3);
      });

      it('average with DNF', function() {
        var solves = [time(555), time(1200), time(1200), dnf(), time(1200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(1200));
        expect(stats.bestIndex).to.equal(0);
        expect(stats.worstIndex).to.equal(3);
      });

      it('average with DNS', function() {
        var solves = [time(1200), time(555), time(1200), dns(), time(1200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(1200));
        expect(stats.bestIndex).to.equal(1);
        expect(stats.worstIndex).to.equal(3);
      });

      it('average with double DNF', function() {
        var solves = [time(1200), dnf(), time(1200), dnf(), time(1200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(dnf());
        expect(stats.bestIndex).to.equal(0);
        expect(stats.worstIndex).to.equal(1);
      });

      it('average with double DNS', function() {
        var solves = [time(1200), dns(), time(1200), dns(), time(1200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        // https://www.worldcubeassociation.org/regulations/#9f9
        expect(stats.average).to.deep.equal(dnf());
        expect(stats.bestIndex).to.equal(0);
        expect(stats.worstIndex).to.equal(1);
      });

      it('average with soft cutoff', function() {
        var solves = [time(1200), time(3200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expect(stats.bestIndex).to.equal(0);
        expect(stats.worstIndex).to.equal(1);
      });

      it('average with soft cutoff', function() {
        var solves = [time(1200), time(3200), null, null, null];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(null);
        expect(stats.bestIndex).to.equal(0);
        expect(stats.worstIndex).to.equal(1);
      });

      it('first solve is DNF', function() {
        var solves = [dnf(), time(500), time(500), time(100), time(200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(400));
        expect(stats.bestIndex).to.equal(3);
        expect(stats.worstIndex).to.equal(0);
      });
    });

    describe('mean of three', function() {
      var roundFormatCode = 'm';

      it('simple mean', function() {
        var solves = [time(2300), time(2000), time(2300)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(2200));
        expect(stats.bestIndex).to.equal(1);
        expect(stats.worstIndex).to.equal(0);
      });

      it('mean with DNF', function() {
        var solves = [time(2300), time(2000), dnf()];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(dnf());
        expect(stats.bestIndex).to.equal(1);
        expect(stats.worstIndex).to.equal(2);
      });

      it('mean with cutoff', function() {
        var solves = [time(2300), time(2000)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expect(stats.bestIndex).to.equal(1);
        expect(stats.worstIndex).to.equal(0);
      });
    });

    describe('best of three', function() {
      var roundFormatCode = '3';

      describe('times', function() {
        it('simple times', function() {
          var solves = [time(2300), time(2000), time(2300)];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.deep.equal(time(2200));
          expect(stats.bestIndex).to.equal(1);
          expect(stats.worstIndex).to.equal(0);
        });

        it('with DNF', function() {
          var solves = [time(2300), time(2000), dnf()];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.deep.equal(dnf());
          expect(stats.bestIndex).to.equal(1);
          expect(stats.worstIndex).to.equal(2);
        });

        it('with cutoff', function() {
          var solves = [time(2300), time(2000)];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.equal(null);
          expect(stats.bestIndex).to.equal(1);
          expect(stats.worstIndex).to.equal(0);
        });
      });


      describe('fmc', function() {
        it('simple fmc', function() {
          var solves = [moves(33), moves(42), moves(33)];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.deep.equal(moves(3600));
          expect(stats.bestIndex).to.equal(0);
          expect(stats.worstIndex).to.equal(1);
        });

        it('with DNF', function() {
          var solves = [moves(33), moves(42), dnf()];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.deep.equal(dnf());
          expect(stats.bestIndex).to.equal(0);
          expect(stats.worstIndex).to.equal(2);
        });
      });

    });

    describe('best of two', function() {
      var roundFormatCode = '2';

      it('simple', function() {
        var solves = [time(2300), time(2000)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expect(stats.bestIndex).to.equal(1);
        expect(stats.worstIndex).to.equal(0);
      });

      it('with DNF', function() {
        var solves = [time(2300), dnf()];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expect(stats.bestIndex).to.equal(0);
        expect(stats.worstIndex).to.equal(1);
      });

      it('with cutoff', function() {
        var solves = [time(2300)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expect(stats.bestIndex).to.equal(0);
        expect(stats.worstIndex).to.equal(0);
      });
      describe('multiblind', function() {
        it('(later)', function() {
          var solves = [mbf(1000, 1, 2), mbf(1200, 2, 2)];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.equal(null);
          expect(stats.bestIndex).to.equal(1);
          expect(stats.worstIndex).to.equal(0);
        });
      });
    });

    describe('best of one', function() {
      var roundFormatCode = '1';

      it('simple', function() {
        var solves = [time(2300)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expect(stats.bestIndex).to.equal(0);
        expect(stats.worstIndex).to.equal(0);
      });

      it('with DNF', function() {
        var solves = [dnf()];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expect(stats.bestIndex).to.equal(0);
        expect(stats.worstIndex).to.equal(0);
      });
    });
  });
});
