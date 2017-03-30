import React from 'react';
import ReactDOM from 'react-dom';

const CompetitionList = React.createClass({
  getCompetitions () {
    return Competitions.find({}, {
      fields: {
        wcaCompetitionId: 1,
        competitionName: 1,
        listed: 1,
      }
    });
  },

  render () {
    let competitions = this.getCompetitions();

    return (
      <div>
        {competitions.map((comp, index) => (
          <li className={classNames('competition', comp.listed ? 'listed' : 'unlisted')} key={index}>
            <a href={comp.wcaCompetitionId ? comp.wcaCompetitionId : comp._id}>{comp.competitionName}</a>
          </li>
        ))}
      </div>
    );
  }
});

Template.competitions.rendered = function () {
  let template = this;
  template.autorun(() => {
    ReactDOM.render(
      <CompetitionList/>, template.$(".reactRenderArea")[0]
    );
  });
}
