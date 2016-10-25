import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';

const ExportResultsView = React.createClass({
  getInitialState() {
    return {
      wcaResults: null,
      exportProblems: []
    };
  },

  wcaResultsJson: function() {
    let template = Template.instance();
    let wcaResults = template.wcaResultsReact.get();
    if(!wcaResults) {
      return '';
    }
    let wcaResultsJson = JSON.stringify(wcaResults, undefined, 2);
    return wcaResultsJson;
  },

  generateWcaResults() {
    Meteor.call('exportWcaResults', this.props.competitionId, this.props.competitionUrlId, (err, result) => {
      if(err) {
        console.error("Meteor.call() error: " + err);
        this.setState({
          wcaResults: null,
          exportProblems: [err]
        });
      } else {
        this.setState({
          wcaResults: result.wcaResults,
          exportProblems: result.exportProblems
        });
      }
    });
  },

  render() {
    let {wcaResults, exportProblems } = this.state;

    return (
      <div className="container">
        <h4>Export Results</h4>
        <hr/>

        <button id="buttonGenerateWcaResults" className="btn btn-default" onClick={this.generateWcaResults}>Generate WCA JSON</button>

        <div>
          <ul className="list-group problemsList">
            {exportProblems.map((problem, index) =>
              <li key={index} className={`list-group-item`}>
                {problem.message}
                {problem.fixUrl ?
                  <a href="{problem.fixUrl}" className="pull-right">
                    <span className="glyphicon glyphicon-wrench"></span>
                  </a> : null}
              </li>
            )}
          </ul>
          <pre className="resultsJson">{JSON.stringify(wcaResults)}</pre>
        </div>

      </div>
    );
  }
});

export default createContainer((props) => {
  Meteor.subscribe('competition', props.competitionUrlId);

  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  return {
    ready: FlowRouter.subsReady('competition'),
    user: Meteor.user(),
    competition: competition,
    competitionId: competitionId,
  };
}, ExportResultsView);
