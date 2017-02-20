import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import ErrorPage from '../errorPage';
import Navbar from '../../components/navbar.jsx';
import OneTab from '../../components/oneTab.jsx';

const isActiveRoute = (route) => FlowRouter.current().route.name === route;

const Tabs = [{
  route: 'manageCompetition',
  title: 'Change competition registration window, competition name, location, organizers, and staff',
  icon: 'fa fa-cog',
  text: 'Manage',
}, {
  route: 'editStaff',
  title: 'Assign staff members',
  icon: 'fa fa-group',
  text: 'Staff',
}, {
  route: 'editEvents',
  title: 'Add and remove rounds, change cutoffs, open and close rounds',
  icon: 'fa fa-cube',
  text: 'Events',
}, {
  route: 'editSchedule',
  icon: 'glyphicon glyphicon-calendar',
  text: 'Schedule',
}, {
  route: 'scrambles',
  title: 'Generate scrambles, manage groups, and view scrambles for open groups',
  icon: '/img/tnoodle_logo.svg',
  text: 'Scrambles',
  leaf: false,
// Add back when it comes time
// }, {
//   route: 'scorecards',
//   title: 'Manage and Generate individual scorecards',
//   icon: '',
//   text: 'Scorecards',
//   leaf: false,
}, {
  route: 'manageCheckin',
  title: 'Edit the list of registered competitors and copy competitors to the first rounds they will compete in (check-in)',
  icon: 'fa fa-check-square-o',
  text: 'Check-in',
}, {
  route: 'dataEntry',
  icon: 'glyphicon glyphicon-edit',
  text: 'Data entry',
  leaf: false,
}, {
  route: 'podiums',
  icon: 'fa fa-trophy',
  text: 'Podiums',
  leaf: false,
}, {
  route: 'exportResults',
  title: 'Export results to WCA JSON',
  icon: '/img/WCAlogo_notext.svg',
  text: 'Export',
}];

const CompetitionLayout = React.createClass({
  renderPage() {
    let {ready, userId, competition} = this.props;

    if (!ready) {
    	return <div/>
    }

    if (!userId) {
    	return <ErrorPage error='400' message='Not authorized to manage competition.'/>
    }

    if (!competition) {
    	return <ErrorPage error='404' message='Competition Not Found'/>;
    }

    if (!competition.userIsStaffMember(userId)) {
    	return <ErrorPage error='400' message='Not authorized to manage competition.'/>
    }

    return this.props.children;
  },

  render() {
    let {competitionUrlId} = this.props;

    return (
      <div>
        <Navbar>
          {Tabs.map((tab, index) => <OneTab key={index} competitionUrlId={competitionUrlId} {...tab} active={isActiveRoute(tab.route)}/>)}
        </Navbar>

        {this.renderPage()}
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
