import { chai } from 'meteor/practicalmeteor:chai';
import '/both/lib/jChester';
import '/both/lib/wca';

let expect = chai.expect;

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

  describe ('solveTimeToWcaValue', function() {
    it('333mbf', function() {
      expect(wca.solveTimeToWcaValue(mbf(1000*(57*60+29), 4, 6))).to.eq(970344902);
      expect(wca.solveTimeToWcaValue(mbf(1000*(27*60+17), 3, 5))).to.eq(980163702);
    });
  });

  describe('computeSolvesStatistics', function() {
    describe('average of five', function() {
      let roundFormatCode = 'a';

      it('simple average', function() {
        let solves = [time(1300), time(555), time(1000), time(9999), time(1300)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(1200));
        expectBestWorstIndex(stats, 1, 3);
      });

      it('simple average with rounding', function() {
        // Luke Tycksen 2x2 Round 1 at Atomic Cubing 2016
        let solves = [time(6030), time(4570), time(3880), time(3510), time(3250)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(3990));
        expectBestWorstIndex(stats, 4, 0);
      });

      it('average with DNF', function() {
        let solves = [time(555), time(1200), time(1200), dnf(), time(1200)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(1200));
        expectBestWorstIndex(stats, 0, 3);
      });

      it('average with DNS', function() {
        let solves = [time(1200), time(555), time(1200), dns(), time(1200)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(1200));
        expectBestWorstIndex(stats, 1, 3);
      });

      it('average with double dnf', function() {
        let solves = [time(1200), dnf(), time(1200), dnf(), time(1200)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(dnf());
        expectBestWorstIndex(stats, 0, 3);
      });

      it('average with double DNS', function() {
        let solves = [time(1200), dns(), time(1200), dns(), time(1200)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        // https://www.worldcubeassociation.org/regulations/#9f9
        expect(stats.average).to.deep.equal(dnf());
        expectBestWorstIndex(stats, 0, 3);
      });

      it('average with soft cutoff', function() {
        let solves = [time(1200), time(3200)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 0, 1);
      });

      it('average with soft cutoff', function() {
        let solves = [time(1200), time(3200), null, null, null];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(null);
        expectBestWorstIndex(stats, 0, 1);
      });

      it('first solve is DNF', function() {
        let solves = [dnf(), time(500), time(500), time(100), time(200)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(400));
        expectBestWorstIndex(stats, 3, 0);
      });

      it('average with 5 identical times', function() {
        let solves = [time(555), time(555), time(555), time(555), time(555)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        // Kind of tricky, but since WCA only handles hundredths, we round 0.555 to 0.56
        expect(stats.average).to.deep.equal(time(560));
        // We don't particularly care which of these 5 identical solves is
        // best or worst, but we do care that they are different solves.
        expect(stats.bestIndex).to.not.equal(stats.worstIndex);
      });
    });

    describe('mean of three', function() {
      let roundFormatCode = 'm';

      it('simple mean', function() {
        let solves = [time(2300), time(2000), time(2300)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(time(2200));
        expectBestWorstIndex(stats, 1, 2);
      });

      it('mean with DNF', function() {
        let solves = [time(2300), time(2000), dnf()];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.deep.equal(dnf());
        expectBestWorstIndex(stats, 1, 2);
      });

      it('mean with cutoff', function() {
        let solves = [time(2300), time(2000)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 1, 0);
      });
    });

    describe('best of three', function() {
      let roundFormatCode = '3';

      describe('times', function() {
        it('simple times', function() {
          let solves = [time(2300), time(2000), time(2300)];
          let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.deep.equal(time(2200));
          expectBestWorstIndex(stats, 1, 2);
        });

        it('with DNF', function() {
          let solves = [time(2300), time(2000), dnf()];
          let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.deep.equal(dnf());
          expectBestWorstIndex(stats, 1, 2);
        });

        it('with cutoff', function() {
          let solves = [time(2300), time(2000)];
          let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.equal(null);
          expectBestWorstIndex(stats, 1, 0);
        });
      });


      describe('fmc', function() {
        it('simple fmc', function() {
          let solves = [moves(27), moves(29), moves(24)];
          let stats = wca.computeSolvesStatistics(solves, roundFormatCode);

          let fmcAverage = moves(26.67);
          fmcAverage.decimals = 2;
          expect(stats.average).to.deep.equal(fmcAverage);
          expectBestWorstIndex(stats, 2, 1);
        });

        it('with DNF', function() {
          let solves = [moves(33), moves(42), dnf()];
          let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.deep.equal(dnf());
          expectBestWorstIndex(stats, 0, 2);
        });
      });

    });

    describe('best of two', function() {
      let roundFormatCode = '2';

      it('simple', function() {
        let solves = [time(2300), time(2000)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 1, 0);
      });

      it('with DNF', function() {
        let solves = [time(2300), dnf()];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 0, 1);
      });

      it('with cutoff', function() {
        let solves = [time(2300)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 0, 0);
      });
      describe('multiblind', function() {
        it('sorts correctly', function() {
          let solves = [mbf(1000, 1, 2), mbf(1200, 2, 2)];
          let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
          expect(stats.average).to.equal(null);
          expectBestWorstIndex(stats, 1, 0);
        });
      });
    });

    describe('best of one', function() {
      let roundFormatCode = '1';

      it('simple', function() {
        let solves = [time(2300)];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 0, 0);
      });

      it('with DNF', function() {
        let solves = [dnf()];
        let stats = wca.computeSolvesStatistics(solves, roundFormatCode);
        expect(stats.average).to.equal(null);
        expectBestWorstIndex(stats, 0, 0);
      });
    });
  });

  describe('softCutoffFormats', function() {
    describe('cumulative', function() {
      let softCutoffFormatCode = 'cumulative';
      let softCutoffFormat = wca.softCutoffFormatByCode[softCutoffFormatCode];
      it('missed cutoff', function() {
        expect(softCutoffFormat.getExpectedSolveCount([time(340)], time(320), 'a')).to.equal(1);
      });
    });

    describe('in 1', function() {
      let softCutoffFormatCode = '1';
      let softCutoffFormat = wca.softCutoffFormatByCode[softCutoffFormatCode];
      it('missed cutoff', function() {
        expect(softCutoffFormat.getExpectedSolveCount([time(340)], time(320), 'a')).to.equal(1);
      });
      it('made cutoff', function() {
        expect(softCutoffFormat.getExpectedSolveCount([time(320)], time(320), 'a')).to.equal(5);
      });
    });

    describe('in 2', function() {
      let softCutoffFormatCode = '2';
      let softCutoffFormat = wca.softCutoffFormatByCode[softCutoffFormatCode];

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
      let softCutoffFormatCode = '3';
      let softCutoffFormat = wca.softCutoffFormatByCode[softCutoffFormatCode];
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
