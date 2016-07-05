import React from 'react';
import {FlowRouter} from 'meteor/kadira:flow-router';
import {BlazeLayout} from 'meteor/kadira:blaze-layout';
import Layout from '/imports/ui/pages/layout';
import Competitions from '/imports/ui/pages/competitions';

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

// let subscriptions = [subs.subscribe('competition', params.competitionUrlId, subscriptionError(this))];
// if(this.ccmManage) {
//   subscriptions.push(subs.subscribe('competitionRegistrations', params.competitionUrlId, subscriptionError(this)));
// }
// if(this.extraSubscriptions) {
//   subscriptions = subscriptions.concat(this.extraSubscriptions());
// }
// return subscriptions;

global.Router = FlowRouter;

FlowRouter.route('/', {
  name: 'home',
  subscriptions(params) {
    this.register('competitions', subs.subscribe('competitions', subscriptionError(this)));
  },

  action(params, queryParams) {
    ReactLayout.render(Layout, {
      content: (<Competitions/>)
    });
  }
});