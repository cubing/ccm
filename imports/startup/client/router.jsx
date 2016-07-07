import React from 'react';
import {FlowRouter} from 'meteor/kadira:flow-router';
import {BlazeLayout} from 'meteor/kadira:blaze-layout';
import Tabs from './tabs';
import BlazeToReact from '/imports/ui/components/blazeToReact';
import {Layout, Competitions, EditProfile} from '/imports/ui/pages/index';
import {EventPicker, RoundPicker} from '/imports/ui/roundPicker.jsx';
import NewCompetition from '/imports/ui/pages/admin/newCompetition';
import {Competition, CompetitionEvents, CompetitionSchedule, CompetitionResults} from '/imports/ui/pages/competition/index';
import {EditCompetition} from '/imports/ui/pages/manage/index';

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
    // this.register('competitions', subs.subscribe('competitions', subscriptionError(this)));
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

FlowRouter.route('/manage/:competitionUrlId', {
  name: 'manageCompetition',
  titlePrefix: "Manage",
  subscriptions(params) {
    this.register('competition', Meteor.subscribe('competition', params.competitionUrlId));
    console.log(this)
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      tabs: Tabs.managerTabs,
      content: (<EditCompetition {...params}/>)
    });
  }
});

/* User View */

FlowRouter.route('/:competitionUrlId', {
  name: 'competition',
  subscriptions(params) {
    this.register('competition', Meteor.subscribe('competition', params.competitionUrlId));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      tabs: Tabs.userTabs,
      content: (<Competition {...params}/>)
    });
  }
});

FlowRouter.route('/:competitionUrlId/events', {
  name: 'competitionEvents',
  titlePrefix: 'Events',

  subscriptions(params) {
    this.register('competition', Meteor.subscribe('competition', params.competitionUrlId));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      tabs: Tabs.userTabs,
      content: (<CompetitionEvents {...params}/>)
    });
  }
});

FlowRouter.route('/:competitionUrlId/schedule', {
  name: 'competitionSchedule',
  titlePrefix: 'Schedule',

  subscriptions(params) {
    this.register('competition', Meteor.subscribe('competition', params.competitionUrlId));
    this.register('scheduleEvents', Meteor.subscribe('scheduleEvents', params.competitionUrlId));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      tabs: Tabs.userTabs,
      content: (<BlazeToReact/>)
    });
  }
});

FlowRouter.route('/:competitionUrlId/results/:eventCode?/:nthRound?', {
  name: 'roundResults',
  template: 'roundResults',

  subscriptions(params) {
    this.register('competition', Meteor.subscribe('competition', params.competitionUrlId));
    this.register('roundResults', Meteor.subscribe('roundResults', params.competitionUrlId, params.eventCode, parseInt(params.nthRound)));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      tabs: Tabs.userTabs,
      content: [
        <EventPicker key={0} {...params}/>,
        <RoundPicker key={1} {...params}/>,
        <CompetitionResults key={2} {...params} {...queryParams}/>
      ]
    });
  }
});
