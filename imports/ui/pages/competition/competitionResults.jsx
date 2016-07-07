import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import ResultsList from '../../components/resultsList';

const CompetitionResults = React.createClass({
  render () {
    let {ready, competitionUrlId, round} = this.props;

    let limit = parseInt(this.props.limit);
    let results = round ? round.getResultsWithRegistrations({ limit: limit, sorted: true }) : [];

    return (
      <div className='container'>
        <ResultsList competitionUrlId={competitionUrlId}
                     round={round}
                     results={results}
                     showFooter={true}
        />
      </div>
    );  
  }
});

export default createContainer((props) => {
  Meteor.subscribe('competition', props.competitionUrlId);
  Meteor.subscribe('roundResults', props.competitionUrlId, props.eventCode, parseInt(props.nthRound));

  if (FlowRouter.subsReady('competition', 'roundResults')) {
    let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
    let round = Rounds.findOne({
      competitionId: competitionId,
      eventCode: props.eventCode,
      nthRound: parseInt(props.nthRound),
    });

    return {
      ready: FlowRouter.subsReady('competition', 'roundResults'),
      round: round,
      competitionId: competitionId,
    };
  }

  return {};
}, CompetitionResults);
