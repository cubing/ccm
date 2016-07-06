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

const Tabs = {
  managerTabs: [{
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
      notLeaf: true,
    }, {
      route: 'scorecards',
      title: 'Manage and Generate individual scorecards',
      icon: '',
      text: 'Scorecards',
      notLeaf: true,
    }, {
      route: 'manageCheckin',
      title: 'Edit the list of registered competitors and copy competitors to the first rounds they will compete in (check-in)',
      icon: 'fa fa-check-square-o',
      text: 'Check-in',
    }, {
      route: 'dataEntry',
      icon: 'glyphicon glyphicon-edit',
      text: 'Data entry',
      notLeaf: true,
    }, {
      route: 'podiums',
      icon: 'fa fa-trophy',
      text: 'Podiums',
      notLeaf: true,
    }, {
      route: 'exportResults',
      title: 'Export results to WCA JSON',
      icon: '/img/WCAlogo_notext.svg',
      text: 'Export',
    },
  ],
  userTabs: [{
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
      notLeaf: true,
    },
  ],
  scrambleTabs: [{
      route: 'uploadScrambles',
      title: 'Generate scrambles with TNoodle and upload them',
      icon: 'fa fa-upload',
      text: 'Upload Scrambles',
    }, {
      route: 'manageScrambleGroups',
      title: 'Open and close scramble groups for ongoing rounds',
      icon: 'fa fa-group',
      text: 'Manage Scramble Groups',
      notLeaf: true,
    }, {
      route: 'viewScrambles',
      title: 'View scrambles for open groups',
      icon: 'fa fa-eye',
      text: 'View Scrambles',
    },
  ],
  podiumTabs: [{
      route: 'podiums',
      title: 'Show everyone who podiumed, grouped by event',
      icon: 'fa fa-trophy',
      text: 'Podiums By Event',
    }, {
      route: 'podiumsByPerson',
      title: 'Show everyone who podiumed, grouped by person',
      icon: 'fa fa-group',
      text: 'Podiums By Person',
    },
  ],
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
      tabs: Tabs.managerTabs,
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
      tabs: Tabs.userTabs,
      content: (<Competition {...params}/>)
    });
  }
});