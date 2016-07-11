import React from 'react';
import {FlowRouter} from 'meteor/kadira:flow-router';
import {BlazeLayout} from 'meteor/kadira:blaze-layout';
import Tabs from './tabs';
import BlazeToReact from '/imports/ui/components/blazeToReact';
import {Layout, Competitions, EditProfile} from '/imports/ui/pages/index';
import {EventPicker, RoundPicker, OpenRoundPicker} from '/imports/ui/roundPicker.jsx';
import NewCompetition from '/imports/ui/pages/admin/newCompetition';
import {Competition, CompetitionEvents, CompetitionSchedule, CompetitionResults} from '/imports/ui/pages/competition/index';
import {EditCompetition, DataEntry} from '/imports/ui/pages/manage/index';

const log = logging.handle("routes");

subs = new SubsManager({
  cacheLimit: 10,
  expireIn: 5, // minutes
});

// It appears that iron-router does nothing useful when a subscription throws
// an error. We explicitly catch that error, log it, and then render 'notFound'
const subscriptionError = function(that) {
  return {
    onError: function(err) {
      console.error(err);
      // that.render('notFound');
    }
  };
};

global.Router = FlowRouter;

FlowRouter.route('/', {
  name: 'home',
  subscriptions(params) {
    this.register('competitions', Meteor.subscribe('competitions'));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      content: (<Competitions/>)
    });
  }
});

FlowRouter.route('/settings/profile', {
  name: 'editProfile',
  action(params, queryParams) {
    ReactLayout.render(Layout, {
      content: (<EditProfile/>)
    });
  }
});

FlowRouter.route('/new', {
  name: 'newCompetition',
  titlePrefix: 'Create competition',

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      content: (<NewCompetition/>)
    });
  }
});

FlowRouter.route('/new/import', {
  name: 'importCompetition',
  titlePrefix: 'Import competition',

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      content: (<NewCompetition tab='import'/>)
    });
  }
});

/* Mange View */

const manageRoutes = FlowRouter.group({
  name: 'manage',
  prefix: '/manage/:competitionUrlId',

  subscriptions(params) {
    this.register('competition', Meteor.subscribe('competition', params.competitionUrlId));
  },
});

manageRoutes.route('/', {
  name: 'manageCompetition',
  titlePrefix: "Manage",

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      tabs: Tabs.managerTabs,
      content: (<EditCompetition {...params}/>)
    });
  }
});

manageRoutes.route('/data-entry/:eventCode?/:nthRound?', {
  name: 'dataEntry',
  titlePrefix: "Data entry",

  subscriptions(params, queryParams) {
    this.register(Meteor.subscribe('roundResults', params.competitionUrlId, params.eventCode, parseInt(params.nthRound)));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      tabs: Tabs.managerTabs,
      content: [
        <OpenRoundPicker key={0} {...params} manage={true}/>,
        <EventPicker key={1} {...params} manage={true}/>,
        <RoundPicker key={2} {...params} manage={true}/>,
        <DataEntry key={3} {...params}/>
      ]
    });
  }
});

/* User View */

const competitionRoutes = FlowRouter.group({
  name: 'competition',
  prefix: '/:competitionUrlId',

  subscriptions(params) {
    this.register('competition', Meteor.subscribe('competition', params.competitionUrlId));
  },
});

competitionRoutes.route('/', {
  name: 'competition',

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      tabs: Tabs.userTabs,
      activeTab: this.name,
      content: (<Competition {...params}/>)
    });
  }
});

competitionRoutes.route('/events', {
  name: 'competitionEvents',
  titlePrefix: 'Events',

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      tabs: Tabs.userTabs,
      activeTab: this.name,
      content: (<CompetitionEvents {...params}/>)
    });
  }
});

competitionRoutes.route('/schedule', {
  name: 'competitionSchedule',
  titlePrefix: 'Schedule',

  subscriptions(params) {
    this.register('scheduleEvents', Meteor.subscribe('scheduleEvents', params.competitionUrlId));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      tabs: Tabs.userTabs,
      activeTab: this.name,
      content: (<div/>)
    });
  }
});

competitionRoutes.route('/results/:eventCode?/:nthRound?', {
  name: 'roundResults',
  template: 'roundResults',

  subscriptions(params) {
    this.register('roundResults', Meteor.subscribe('roundResults', params.competitionUrlId, params.eventCode, parseInt(params.nthRound)));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      tabs: Tabs.userTabs,
      activeTab: this.name,
      content: [
        <EventPicker key={0} {...params}/>,
        <RoundPicker key={1} {...params}/>,
        <CompetitionResults key={2} {...params} {...queryParams}/>
      ]
    });
  }
});
