var assert = require("assert");
var expect = require("chai").expect;

// __wca.js uses assert and doesn't require() it, so lets jam it into the
// global scope for it.
global.assert = assert;

require("../../both/__wca.js");
require("../../both/components/jChester.js");

describe('wca', function() {
  describe('compareSolveTimes', function() {
    it('DNF == DNF', function() {
      expect(wca.compareSolveTimes(dnf(), dnf())).to.equal(0);
    });
    it('DNS == DNS', function() {
      expect(wca.compareSolveTimes(dns(), dns())).to.equal(0);
    });
    it('DNS > DNF', function() {
      expect(wca.compareSolveTimes(dns(), dnf())).to.be.gt(0);
      expect(wca.compareSolveTimes(dnf(), dns())).to.be.lt(0);
    });
  });

  describe('computeSolvesStatistics', function() {
    describe('average of five', function() {
      var roundFormatCode = 'a';

      it('simple average', function() {
        var solves = [time(1300), time(555), time(1000), time(9999), time(1300)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(1200));
        expectBestWorstIndex(stats, 1, 3);
      });

      it('average with DNF', function() {
        var solves = [time(555), time(1200), time(1200), dnf(), time(1200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(1200));
        expectBestWorstIndex(stats, 0, 3);
      });

      it('average with DNS', function() {
        var solves = [time(1200), time(555), time(1200), dns(), time(1200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(1200));
        expectBestWorstIndex(stats, 1, 3);
      });

      it('average with double dnf', function() {
        var solves = [time(1200), dnf(), time(1200), dnf(), time(1200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(dnf());
        expectBestWorstIndex(stats, 0, 3);
      });

      it('average with double DNS', function() {
        var solves = [time(1200), dns(), time(1200), dns(), time(1200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        // https://www.worldcubeassociation.org/regulations/#9f9
        expect(stats.average).to.deep.equal(dnf());
        expectBestWorstIndex(stats, 0, 3);
      });

      it('average with soft cutoff', function() {
        var solves = [time(1200), time(3200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 0, 1);
      });

      it('average with soft cutoff', function() {
        var solves = [time(1200), time(3200), null, null, null];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(null);
        expectBestWorstIndex(stats, 0, 1);
      });

      it('first solve is DNF', function() {
        var solves = [dnf(), time(500), time(500), time(100), time(200)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(400));
        expectBestWorstIndex(stats, 3, 0);
      });

      it('average with 5 identical times', function() {
        var solves = [time(555), time(555), time(555), time(555), time(555)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(555));
        // We don't particularly care which of these 5 identical solves is
        // best or worst, but we do care that they are different solves.
        expect(stats.bestIndex).to.not.equal(stats.worstIndex);
      });
    });

    describe('mean of three', function() {
      var roundFormatCode = 'm';

      it('simple mean', function() {
        var solves = [time(2300), time(2000), time(2300)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(2200));
        expectBestWorstIndex(stats, 1, 2);
      });

      it('mean with DNF', function() {
        var solves = [time(2300), time(2000), dnf()];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(dnf());
        expectBestWorstIndex(stats, 1, 2);
      });

      it('mean with cutoff', function() {
        var solves = [time(2300), time(2000)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 1, 0);
      });
    });

    describe('best of three', function() {
      var roundFormatCode = '3';

      describe('times', function() {
        it('simple times', function() {
          var solves = [time(2300), time(2000), time(2300)];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.deep.equal(time(2200));
          expectBestWorstIndex(stats, 1, 2);
        });

        it('with DNF', function() {
          var solves = [time(2300), time(2000), dnf()];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.deep.equal(dnf());
          expectBestWorstIndex(stats, 1, 2);
        });

        it('with cutoff', function() {
          var solves = [time(2300), time(2000)];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.equal(null);
          expectBestWorstIndex(stats, 1, 0);
        });
      });


      describe('fmc', function() {
        it('simple fmc', function() {
          var solves = [moves(27), moves(29), moves(24)];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);

          var fmcAverage = moves(26.67);
          fmcAverage.decimals = 2;
          expect(stats.average).to.deep.equal(fmcAverage);
          expectBestWorstIndex(stats, 2, 1);
        });

        it('with DNF', function() {
          var solves = [moves(33), moves(42), dnf()];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.deep.equal(dnf());
          expectBestWorstIndex(stats, 0, 2);
        });
      });

    });

    describe('best of two', function() {
      var roundFormatCode = '2';

      it('simple', function() {
        var solves = [time(2300), time(2000)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 1, 0);
      });

      it('with DNF', function() {
        var solves = [time(2300), dnf()];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 0, 1);
      });

      it('with cutoff', function() {
        var solves = [time(2300)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 0, 0);
      });
      describe('multiblind', function() {
        it('sorts correctly', function() {
          var solves = [mbf(1000, 1, 2), mbf(1200, 2, 2)];
          var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.equal(null);
          expectBestWorstIndex(stats, 1, 0);
        });
      });
    });

    describe('best of one', function() {
      var roundFormatCode = '1';

      it('simple', function() {
        var solves = [time(2300)];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 0, 0);
      });

      it('with DNF', function() {
        var solves = [dnf()];
        var stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 0, 0)
      });
    });
  });

  describe('softCutoffFormats', function() {
    describe('cumulative', function() {
      var softCutoffFormatCode = 'cumulative';
      var softCutoffFormat = wca.softCutoffFormatByCode[softCutoffFormatCode];
      it('missed cutoff', function() {
        expect(softCutoffFormat.getExpectedSolveCount([time(340)], time(320), 'a')).to.equal(1);
      });
    });

    describe('in 1', function() {
      var softCutoffFormatCode = '1';
      var softCutoffFormat = wca.softCutoffFormatByCode[softCutoffFormatCode];
      it('missed cutoff', function() {
        expect(softCutoffFormat.getExpectedSolveCount([time(340)], time(320), 'a')).to.equal(1);
      });
      it('made cutoff', function() {
        expect(softCutoffFormat.getExpectedSolveCount([time(320)], time(320), 'a')).to.equal(5);
      });
    });

    describe('in 2', function() {
      var softCutoffFormatCode = '2';
      var softCutoffFormat = wca.softCutoffFormatByCode[softCutoffFormatCode];

      it('has not yet made or missed cutoff', function() {
        expect(softCutoffFormat.getExpectedSolveCount([time(340)], time(320), 'a')).to.equal(5);
      });

      it('made cutoff', function() {
        expect(softCutoffFormat.getExpectedSolveCount([time(300)], time(320), 'a')).to.equal(5);
      });

      it('missed cutoff', function() {
        expect(softCutoffFormat.getExpectedSolveCount([time(340), dnf()], time(320), 'a')).to.equal(2);
      });
    });

    describe('in 3', function() {
      var softCutoffFormatCode = '3';
      var softCutoffFormat = wca.softCutoffFormatByCode[softCutoffFormatCode];
      it('has not yet made or missed cutoff', function() {
        expect(softCutoffFormat.getExpectedSolveCount([time(340)], time(320), 'a')).to.equal(5);
      });
    });
  });

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

  function expectBestWorstIndex(solveStats, expected_best, expected_worst) {
    expect(solveStats.bestIndex).to.equal(expected_best, "wrong bestIndex");
    expect(solveStats.worstIndex).to.equal(expected_worst, "wrong worstIndex");
  }

});
