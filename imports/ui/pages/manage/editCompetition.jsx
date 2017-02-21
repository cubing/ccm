import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

const log = logging.handle("editCompetition");

const EditCompetition = React.createClass({
  getDefaultProps() {
    return {
      user: null,
      competitionUrlId: '',
    };
  },

  getInitialState() {
    return {
      competitionName: '',
      lislted: false,
    };
  },

  componentWillReceiveProps(props) {
    if(props.competition) {
      this.state.competitionName = props.competition.competitionName;
      this.state.listed = props.competition.listed;
    }
  },

  setCompetitionAttribute(attribute, value) {
    let update;
    if(value === null || typeof value === "undefined") {
      update = {
        $unset: {
          [attribute]: 1
        }
      };
    } else {
      update = {
        $set: {
          [attribute]: value
        }
      };
    }
    Competitions.update(this.props.competitionId, update);
  },

  set(key, value) {
    this.setCompetitionAttribute(key, value);
    this.setState({
      [key]: value
    });
  },

  defaultCompetitionDataDocument() {
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

  setListed(listed) {
    this.set('listed', listed);
  },

  render() {
    const {ready, user, competition, competitionId, competitionUrlId} = this.props;
    let listed = competition ? competition.listed : this.state.listed;

    return (
      <div className='container'>
        <div className="panel panel-default">
          <div className="panel-heading">
            <h3 className="panel-title">
              Administrative settings
            </h3>
          </div>

          { ready ?
            <div className="panel-body">
              <form className="form-horizontal" id="competitionAttributes" role="form">
                <div className="form-group">
                  <label htmlFor="inputWcaCompetitionId" className="col-sm-3 col-lg-2 control-label">WCA Competition ID</label>
                  <div className="col-sm-9 col-lg-10">
                    <input type="text" className="form-control" id="inputWcaCompetitionId" name="wcaCompetitionId" value={competition && competition.wcaCompetitionId} disabled={user && user.siteAdmin}/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="col-sm-3 col-lg-2 control-label">Visibility</label>
                  <div className="col-sm-9 col-lg-10">
                    {user && user.siteAdmin ?
                      <div id="toggleCompetitionListed" className="btn-group">
                        <button type="button" className={`btn btn-default ${listed ? 'active' : ''}`} onClick={() => this.setListed(true)}>
                          Listed
                        </button>
                        <button type="button" className={`btn btn-default ${listed ? '' : 'active'}`} onClick={() => this.setListed(false)}>
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
            </div> :
            null }
        </div>

        <div className="panel panel-default">
          <div className="panel-heading">
            <h3 className="panel-title">
              General settings for {competition ? competition.competitionName : null}
            </h3>
          </div>

          <div className="panel-body">
            <p>Competition Name:</p>
            <input type="text" className="form-control" value={this.state.competitionName} onChange={e => this.set('competitionName', e.target.value)}/>
          </div>
        </div>
      </div>
    );
  },
});

export default createContainer((props) => {
  let subscription = Meteor.subscribe('competition', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  return {
    ready: FlowRouter.subsReady('competition'),
    user: Meteor.user(),
    competition: competition,
    competitionId: competitionId,
  };
}, EditCompetition);
