import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import ResultsList from '../../components/resultsList';

const CompetitionResults = React.createClass({
  render() {
    let {ready, round, competitionUrlId, eventCode, nthRound, limit} = this.props;

    return (
      <div className='container'>
        <ResultsList competitionUrlId={competitionUrlId} eventCode={eventCode} nthRound={nthRound}
                     limit={parseInt(limit)}
                     round={round}
                     showFooter={true}
        />
      </div>
    );
  }
});

export default createContainer(function(props) {
  Subs.subscribe('competition', props.competitionUrlId);

  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);

  let round = competitionId ? Rounds.findOne({
    competitionId: competitionId,
    eventCode: props.eventCode,
    nthRound: parseInt(props.nthRound),
  }) : null;

  return {
    ready: Subs.ready(),
    competitionId,
    round,
    ...props
  };
}, CompetitionResults);
