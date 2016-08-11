export const buildRoundData = function(props) {
  Meteor.subscribe('competition', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);
  let nthRound = parseInt(props.nthRound);
  let round = Rounds.findOne({
    competitionId: competitionId,
    eventCode: props.eventCode,
    nthRound: nthRound,
  });

  let results = round ? round.getResultsWithRegistrations({ limit: 0, sorted: true }) : [];

  return {
    ready: FlowRouter.subsReady('competition'),
    competition: competition,
    competitionId: competitionId,
    nthRound: nthRound,
    round: round,
    results: results,
  };
};
