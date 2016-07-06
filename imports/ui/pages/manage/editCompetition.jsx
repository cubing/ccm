import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

const log = logging.handle("editCompetition");

function setCompetitionAttribute(competitionId, attribute, value) {
  let update;
  if(value === null || typeof value === "undefined") {
    let toUnset = {};
    toUnset[attribute] = 1;
    update = { $unset: toUnset };
  } else {
    let toSet = {};
    toSet[attribute] = value;
    update = { $set: toSet };
  }
  Competitions.update(competitionId, update);
};

const EditCompetition = React.createClass({
  getDefaultProps() {
    return {
      user: null,
      competitionUrlId: '',
    }
  },

  getInitialState() {
    return {
    };
  },

  defaultCompetitionDataDocument: function() {
    let competitionId = this.props.competitionId;
    let competition = Competitions.findOne(competitionId);

    if(competition) {
      return competition;
    } else {
      return {
        // any default values
      };
    }
  },

  render() {
    const {ready, user, competition} = this.props;
    let listed = false;

    return (
      <div className='container'>
        <div className="panel-heading">
          <h3 className="panel-title">
            Administrative settings
          </h3>
        </div>

        { ready ?
          <div className="panel-body">
            <form className="form-horizontal" id="competitionAttributes" role="form">
              <div className="form-group">
                <label for="inputWcaCompetitionId" className="col-sm-3 col-lg-2 control-label">WCA Competition ID</label>
                <div className="col-sm-9 col-lg-10">
                  <input type="text" className="form-control" id="inputWcaCompetitionId" name="wcaCompetitionId" value={competition.wcaCompetitionId} disabled={user && user.isSiteAdmin}/>
                </div>
              </div>
              <div className="form-group">
                <label className="col-sm-3 col-lg-2 control-label">Visibility</label>
                <div className="col-sm-9 col-lg-10">
                  {user && user.isSiteAdmin ?
                    <div id="toggleCompetitionListed" className="btn-group">
                      <button type="button" className={`btn btn-default ${listed ? 'active' : ''}`}>
                        Listed
                      </button>
                      <button type="button" className={`btn btn-default ${listed ? '' : 'active'}`}>
                        Hidden
                      </button>
                    </div> :
                    <p className="form-control-static">
                      {listed ? 'Listed' : 'Hidden'}
                    </p>
                  }
                </div>
              </div>
            </form>
          </div>
          : null }
      </div>
    );
  },
});

export default createContainer((props) => {
  let subscription = Meteor.subscribe('competition', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  return {
    ready: subscription.ready(),
    user: Meteor.user(),
    competition: competition,
    competitionId: competitionId,
  };
}, EditCompetition);