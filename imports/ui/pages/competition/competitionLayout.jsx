import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import NotFound from '../notFound';
import Navbar from '../../components/navbar.jsx';
import OneTab from '../../components/oneTab.jsx';

const isActiveRoute = (route) => FlowRouter.current().route.name === route;

const Tabs = [{
  route: 'competition',
  icon: 'glyphicon glyphicon-home',
  text: 'Home',
  otherClass: 'match-jumbotron',
}, {
  route: 'competitionEvents',
  icon: 'fa fa-cube',
  text: 'Events',
}, {
  route: 'competitionSchedule',
  icon: 'glyphicon glyphicon-calendar',
  text: 'Schedule',
}, {
  route: 'roundResults',
  icon: 'fa fa-trophy',
  text: 'Results',
  leaf: false,
}];

const CompetitionLayout = React.createClass({
  render() {
    let {ready, competition, competitionId, competitionUrlId} = this.props;

    return (
      <div>
        <Navbar>
          {Tabs.map((tab, index) => <OneTab key={index} competitionUrlId={competitionUrlId} {...tab} active={isActiveRoute(tab.route)}/>)}
        </Navbar>

        {ready ? (competition ? this.props.children : <NotFound message='Competition Not Found'/>) : <div/>}
      </div>
    );
  }
});

export default createContainer((props) => {
  let subscription = Meteor.subscribe('competition', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  return {
    ready: subscription.ready(),
    userId: Meteor.userId(),
    competition: competition,
    competitionId: competitionId,
  };
}, CompetitionLayout);
