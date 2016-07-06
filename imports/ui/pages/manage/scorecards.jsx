import React from 'react';
import ReactDOM from 'react-dom';
import Scorecard from '../../components/scorecard';

const ScorecardsPage = React.createClass({
  render () {
    return (
      <div id='page' style={{border: '2px solid white', width: '8.4in', height: '10.5in', pageBreakInside: 'avoid', pageBreakAfter: 'always'}}>
        <Scorecard competitionName='Atomic Cubing Summer 2016' name='Caleb Hoover' wcaid='2016HOOV01' event='3x3' round='1'/>
        <Scorecard competitionName='Atomic Cubing Summer 2016' name='Kit Clement' wcaid='2016HOOV01' event='3x3' round='1'/>
        <Scorecard competitionName='Atomic Cubing Summer 2016' name='Jeremy Fleischman' wcaid='2016HOOV01' event='3x3' round='1'/>
        <Scorecard competitionName='Atomic Cubing Summer 2016' name='James LaChance' wcaid='2016HOOV01' event='3x3' round='1'/>
      </div>
    );
  }
});

Template.competitions.rendered = function () {
  let template = this;
  template.autorun(() => {
    ReactDOM.render(
      <ScorecardsPage/>, template.$(".reactRenderArea")[0]
    );
  });
}