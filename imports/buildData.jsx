export const buildRoundData = function(props) {
  let subscription = Meteor.subscribe('competition', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);
  let nthRound = parseInt(props.nthRound);
  let round = Rounds.findOne({
    competitionId: competitionId,
    eventCode: props.eventCode,
    nthRound: nthRound,
  }, {
    fields: {
      _id: 1,
      nthRound: 1,
    }
  });

  return {
    ready: subscription.ready(),
    competition: competition,
    competitionId: competitionId,
    nthRound: nthRound,
    round: round,
  };
};
