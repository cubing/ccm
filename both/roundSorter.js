const log = logging.handle("roundSorter");

/*
 * RoundSorter.addRoundToSort(roundId) guarantees that a round will
 * be sorted within some COALESCE_MILLIS (the implementation is free
 * to sort sooner if the system is not busy). Multiple calls with
 * the same round will coalesce, but not push back our original
 * guarantee.
 * TODO - i don't know enough about node-fibers to think about what exactly this code will do when multiple DDP connections call it simultaneously.
 */
RoundSorter = {
  COALESCE_MILLIS: 500,
  _roundsToSortById: {},
  addRoundToSort(roundId) {
    if(Meteor.isClient) {
      // We only bother sorting serverside.
      return;
    }
    if(!this._roundsToSortById[roundId]) {
      if(this.COALESCE_MILLIS === 0) {
        // Tests set RoundSorter.COALESCE_MILLIS to 0 so they can run synchronously.
        this._handleSortTimer(roundId);
      } else {
        this._roundsToSortById[roundId] = Meteor.setTimeout(this._handleSortTimer.bind(this, roundId), this.COALESCE_MILLIS);
      }
    }
  },
  _handleSortTimer(roundId) {
    log.l1("RoundSorter._handleSortTimer(", roundId, ")");
    delete this._roundsToSortById[roundId];
    let round = Rounds.findOne(roundId);
    if(round) {
      // There's no guarantee that this round still exists by the time we
      // decide to sort it. We seem to be hitting this race in tests.
      round.sortResults();
    }
  },
};
