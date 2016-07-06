import React from 'react';
import {FlowRouter} from 'meteor/kadira:flow-router';
import {BlazeLayout} from 'meteor/kadira:blaze-layout';
import Layout from '/imports/ui/pages/layout';
import Competitions from '/imports/ui/pages/competitions';
import EditProfile from '/imports/ui/pages/editProfile';
import NewCompetition from '/imports/ui/pages/admin/newCompetition';
import Competition from '/imports/ui/pages/competition';
import EditCompetition from '/imports/ui/pages/manage/editCompetition.jsx';

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

Router.route('/new', {
  name: 'newCompetition',
  titlePrefix: 'Create competition',

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      content: (<NewCompetition/>)
    });
  }
});

Router.route('/new/import', {
  name: 'importCompetition',
  titlePrefix: 'Import competition',

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      content: (<NewCompetition tab='import'/>)
    });
  }
});

Router.route('/manage/:competitionUrlId', {
  name: 'manageCompetition',
  titlePrefix: "Manage",
  subscriptions(params) {
    this.register('competition', Meteor.subscribe('competition', params.competitionUrlId));
    console.log(this)
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      content: (<EditCompetition {...params}/>)
    });
  }
});

Router.route('/:competitionUrlId', {
  name: 'competition',
  subscriptions(params) {
    this.register('competition', Meteor.subscribe('competition', params.competitionUrlId));
    console.log(this)
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      competitionUrlId: params.competitionUrlId,
      content: (<Competition {...params}/>)
    });
  }
});