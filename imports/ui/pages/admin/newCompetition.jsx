import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

function getTodayDateNoTime() {
  let today = moment();
  return new Date(Date.UTC(today.year(), today.month(), today.date()));
}

const NewCompetition = React.createClass({
  getDefaultProps() {
    return {
      user: null,
      tab: 'new',
    };
  },

  getInitialState() {
    return {
      competitionName: '',
      uploadedCompetition: '',
    };
  },

  competitionNameChange(e) {
    this.setState({
      competitionName: e.target.value
    });
  },

  submitNewCompetition(e) {
    e.preventDefault();

    let form = e.currentTarget;
    let competitionName = this.state.competitionName;
    Meteor.call("createCompetition", competitionName, getTodayDateNoTime(), function(err, competitionUrlId) {
      if(err) {
        FlashMessages.sendError("Error submitting form: " + err.message, { autoHide: true, hideDelay: 5000 });
        console.error("Meteor.call() error: " + err);
      } else {
        Router.go('manageCompetition', { competitionUrlId: competitionUrlId });
      }
    });
  },

  tabs: {
    'new': function() {
      let {competitionName} = this.state;

      return (
        <div className="tab-content">
          <form id="formNewCompetition" className="form-horizontal" role="form">
            <div className="form-group">
              <label htmlFor="inputCompetitionName" className="col-sm-3 col-lg-2 control-label">Competition Name</label>
              <div className="col-sm-9 col-lg-10">
                <input type="text" className="form-control" id="inputCompetitionName" name="competitionName" value={competitionName} onChange={this.competitionNameChange}/>
              </div>
            </div>

            <button type="submit" className="btn btn-primary form-control" onClick={this.submitNewCompetition} disabled={!competitionName}>Create competition</button>
          </form>
        </div>
      );
    },
    'import': function() {
      let {uploadedCompetition} = this.state;

      return (
        <div className="tab-content">
          <form id="formImportCompetition" className="form-horizontal" role="form">
            <p>
              <label className="btn btn-default btn-block">
                <input type="file" style={{display: "none"}}/>
                Upload competition JSON...
              </label>
            </p>
            <button type="submit" className="btn btn-primary form-control" disabled={!uploadedCompetition}>
              Import
              {/*{#if uploadedCompetition}}
                {{uploadedCompetition.competitionId}}
              {{/if}*/}
            </button>
          </form>
        </div>
      );
    },
  },

  render() {
    const {user, tab} = this.props;

    return (
      <div className="container">
        {/*{> flashMessages}*/}

        {/*{#ifLoggedInAndVerified}*/}

          <ul className="nav nav-tabs">
            <li role="presentation" className={tab === 'new' ? 'active' : ''}>
              <a href={FlowRouter.path('newCompetition')}>New competition</a>
            </li>

            {user ?
              <li role="presentation" className={tab === 'import' ? 'active' : ''}>
                <a href={FlowRouter.path('importCompetition')}>Import competition</a>
              </li> :  null
            }
          </ul>

          {this.tabs[tab].call(this)}

        {/*{/ifLoggedInAndVerified}*/}
      </div>
    );
  },
});

export default createContainer((props) => {
  return {
    user: Meteor.user(),
  };
}, NewCompetition);
