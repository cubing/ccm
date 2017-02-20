import React from 'react';
import {FlowRouter} from 'meteor/kadira:flow-router';
import {BlazeLayout} from 'meteor/kadira:blaze-layout';
import Tabs from './tabs';
import BlazeToReact from '/imports/ui/components/blazeToReact';
import {Layout, Competitions, EditProfile, ErrorPage} from '/imports/ui/pages/index';
import {EventPicker, RoundPicker, OpenRoundPicker} from '/imports/ui/roundPicker.jsx';
import NewCompetition from '/imports/ui/pages/admin/newCompetition';
import {Competition, CompetitionLayout, CompetitionEvents, CompetitionSchedule, CompetitionResults} from '/imports/ui/pages/competition/index';
import {ManageCompetitionLayout, EditCompetition, EditStaff, EditEvents, ManageCheckin, DataEntry, AdvanceCompetitors, Export} from '/imports/ui/pages/manage/index';

const log = logging.handle("routes");

subs = new SubsManager({
  cacheLimit: 10,
  expireIn: 5, // minutes
});

global.Router = FlowRouter;

FlowRouter.notFound = {
  subscriptions(params) {
    this.register('competition', Meteor.subscribe('competition', params.competitionUrlId));
  },

  action() {
    ReactLayout.render(Layout, {
      content: (<ErrorPage error='404' message='Page Not Found'/>)
    });
  }
};

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
      content: (
        <ManageCompetitionLayout {...params}>
          <EditCompetition {...params}/>
        </ManageCompetitionLayout>
      )
    });
  }
});

manageRoutes.route('/staff', {
  name: 'editStaff',
  titlePrefix: "Staff",

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      content: (
        <ManageCompetitionLayout {...params}>
          <EditStaff {...params}/>
        </ManageCompetitionLayout>
      )
    });
  }
});

manageRoutes.route('/events', {
  name: 'editEvents',
  titlePrefix: "Edit Events",

  subscriptions(params) {
    this.register('roundProgresses', Meteor.subscribe('roundProgresses', params.competitionUrlId));
    this.register('rounds', Meteor.subscribe('rounds', params.competitionUrlId));
    this.register('competitionRegistrations', Meteor.subscribe('competitionRegistrations', params.competitionUrlId));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      content: (
        <ManageCompetitionLayout {...params}>
          <EditEvents {...params}/>
        </ManageCompetitionLayout>
      )
    });
  }
});

manageRoutes.route('/check-in', {
  name: 'manageCheckin',
  titlePrefix: "Check-in",

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      content: (
        <ManageCompetitionLayout {...params}>
          <ManageCheckin {...params}/>
        </ManageCompetitionLayout>
      )
    });
  }
});

manageRoutes.route('/advance-participants/:eventCode?/:nthRound?', {
  name: 'advanceParticipants',
  titlePrefix: "Advance competitors",

  subscriptions(params, queryParams) {
    this.register(Meteor.subscribe('roundResults', params.competitionUrlId, params.eventCode, parseInt(params.nthRound)));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      content: (
        <ManageCompetitionLayout {...params}>
          <AdvanceCompetitors {...params}/>)
        </ManageCompetitionLayout>
      )
    });
  }
});

manageRoutes.route('/data-entry/:eventCode?/:nthRound?', {
  name: 'dataEntry',
  titlePrefix: "Data entry",

  subscriptions(params, queryParams) {
    this.register('roundResults', Meteor.subscribe('roundResults', params.competitionUrlId, params.eventCode, parseInt(params.nthRound)));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      content: (
        <ManageCompetitionLayout {...params}>
          <OpenRoundPicker {...params} manage={true}/>
          <EventPicker {...params} manage={true}/>
          <RoundPicker {...params} manage={true}/>
          <DataEntry {...params}/>
        </ManageCompetitionLayout>
      )
    });
  }
});

/* User View */

const competitionRoutes = FlowRouter.group({
  name: 'competition',
  prefix: '/:competitionUrlId',

  subscriptions(params) {
    this.register('competitions', Meteor.subscribe('competitions'));
  },
});

competitionRoutes.notFound = {
  subscriptions(params) {
    this.register('competition', Meteor.subscribe('competition', params.competitionUrlId));
  },

  action() {
    ReactLayout.render(Layout, {
      content: (
        <CompetitionLayout {...params}>
          <ErrorPage error='404' message='Page Not Found'/>
        </CompetitionLayout>
      )
    });
  }
};

competitionRoutes.route('/', {
  name: 'competition',

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      activeTab: this.name,
      content: (
        <CompetitionLayout {...params}>
          <Competition {...params}/>
        </CompetitionLayout>
      )
    });
  }
});

competitionRoutes.route('/events', {
  name: 'competitionEvents',
  titlePrefix: 'Events',

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      activeTab: this.name,
      content: (
        <CompetitionLayout {...params}>
          <CompetitionEvents {...params}/>
        </CompetitionLayout>
      )
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
      activeTab: this.name,
      content: <CompetitionLayout {...params}/>
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
      activeTab: this.name,
      content: [
        <CompetitionLayout {...params}>
          <EventPicker {...params}/>
          <RoundPicker {...params}/>
          <CompetitionResults {...params} {...queryParams}/>
        </CompetitionLayout>
      ]
    });
  }
});

competitionRoutes.route('/manage/:competitionUrlId/exportResults', {
  name: 'exportResults',

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      content: (<Export {...params}/>)
    });
  }
});
