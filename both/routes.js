subs = new SubsManager({
  cacheLimit: 10,
  expireIn: 5, // minutes
});

Router.configure({
  layoutTemplate: "layout",
  loadingTemplate: "loading",
  notFoundTemplate: "notFound",
  progressSpinner: false,
  waitOn: function() {
    return Meteor.subscribe('userData');
  },
});

if(Meteor.isClient) {
  Router.onBeforeAction('dataNotFound');

  Template.registerHelper("isActiveOrAncestorRoute", function(routeName) {
    var currentParams = Router.current().params;
    var route = Router.routes[routeName];
    var routePath = route.path(currentParams);
    // Check if our current path begins with the given route
    var currentPath = Iron.Location.get().path;
    return currentPath.indexOf(routePath) === 0;
  });
  Template.registerHelper("isActiveRoute", function(routeName) {
    return Router.current().route.getName() == routeName;
  });

  Template.registerHelper("setDocumentTitle", function() {
    var titleParts = ["live.cubing.net"];

    var data = Router.current().data && Router.current().data();
    if(data) {
      if(data.competitionId) {
        titleParts.push(Competitions.findOne(data.competitionId).competitionName);
      }
      if(data.roundId) {
        var round = Rounds.findOne(data.roundId);
        titleParts.push(round.eventName() + " " + round.properties().name);
      }
      if(data.user) {
        titleParts.push(data.user.profile.name);
      }
    }

    var titlePrefix = Router.current().lookupOption('titlePrefix');
    if(titlePrefix) {
      titleParts.push(titlePrefix);
    }

    // Immediately updating the page title here was causing the title of the
    // current (new) page to get put in the history as the title of the
    // previous (old) page. Waiting for a little bit before setting the title
    // lets the browser history look sane.
    Meteor.defer(function() {
      document.title = titleParts.reverse().join(' - ');
    });
  });
}

// It appears that iron-router does nothing useful when a subscription throws
// an error. We explicitly catch that error, log it, and then render 'notFound'
var subscriptionError = function(that) {
  return {
    onError: function(err) {
      console.error(err);
      that.render('notFound');
    }
  };
};

BaseCompetitionController = RouteController.extend({
  fastRender: true,
  waitOn: function() {
    var subscriptions = [subs.subscribe('competition', this.params.competitionUrlId, subscriptionError(this))];
    if(this.ccmManage) {
      subscriptions.push(subs.subscribe('competitionRegistrations', this.params.competitionUrlId, subscriptionError(this)));
    }
    if(this.extraSubscriptions) {
      subscriptions = subscriptions.concat(this.extraSubscriptions());
    }
    return subscriptions;
  },
  data: function() {
    if(!this.ready()) {
      // We explicitly render *NotFound templates based on what's missing, and
      // that steps on the toes of iron-router's loading hook. If we're not
      // ready, just do nothing and let the loading hook render our
      // loadingTemplate.
      return;
    }
    var competitionId = api.competitionUrlIdToId(this.params.competitionUrlId);
    if(!competitionId) {
      this.render('competitionNotFound');
      return;
    }
    if(this.ccmManage && getCannotManageCompetitionReason(Meteor.userId(), competitionId)) {
      this.render('cannotManageCompetition');
      return;
    }

    var data = (this.buildData ? this.buildData(competitionId) : {});
    data.competitionUrlId = this.params.competitionUrlId;
    data.competitionId = competitionId;
    return data;
  },
});

ManageCompetitionController = BaseCompetitionController.extend({
  ccmManage: true,
});

ViewCompetitionController = BaseCompetitionController.extend({
  ccmManage: false,
});

ViewParticipantController = BaseCompetitionController.extend({
  ccmManage: false,
  extraSubscriptions: function() {
    return [subs.subscribe('participantResults',
                           this.params.competitionUrlId,
                           this.params.participantUniqueName,
                           subscriptionError(this))];
  },
  buildData: function(competitionId) {
    var data = {};

    data.registration = Registrations.findOne({
      competitionId: competitionId,
      uniqueName: this.params.participantUniqueName,
    });
    if(!data.registration) {
      this.render('participantNotFound');
      return data;
    }

    data.user = Meteor.users.findOne(data.registration.userId);
    return data;
  },
});

BaseRoundController = BaseCompetitionController.extend({
  extraSubscriptions: function() {
    if(!this.params.eventCode || !this.params.nthRound) {
      return [];
    }
    var nthRound = parseInt(this.params.nthRound);
    return [subs.subscribe('roundResults',
      this.params.competitionUrlId,
      this.params.eventCode,
      nthRound,
      subscriptionError(this))];
  },
  buildRoundData: function(competitionId) {
    var data = {};
    if(this.params.eventCode && !wca.eventByCode[this.params.eventCode]) {
      this.render('eventNotFound');
      return data;
    }
    data.eventCode = this.params.eventCode;
    if(!this.params.nthRound) {
      return data;
    }
    if(!String.isNonNegInt(this.params.nthRound)) {
      this.render('roundNotFound');
      return data;
    }
    var nthRound = parseInt(this.params.nthRound);
    var round = Rounds.findOne({
      competitionId: competitionId,
      eventCode: this.params.eventCode,
      nthRound: nthRound,
    }, {
      fields: { _id: 1 }
    });
    if(!round) {
      this.render('roundNotFound');
      return data;
    }
    data.roundId = round._id;
    return data;
  }
});

ViewRoundController = BaseRoundController.extend({
  ccmManage: false,
  buildData: function(competitionId) {
    if(!this.params.eventCode) {
      // TODO - https://github.com/cubing/ccm/issues/119
    } else if(!this.params.nthRound) {
      var newParams = _.extend({}, this.params);
      // If the user didn't specify a specific round for the given event,
      // try to be useful and redirect them a round they're likely to be interested in.
      // Lets go with an open round, or if none are open, the latest round for this event.

      var round;

      var openRound = Rounds.findOne({
        competitionId: competitionId,
        eventCode: this.params.eventCode,
        status: wca.roundStatuses.open,
      }, {
        fields: { nthRound: 1 }
      });
      if(openRound) {
        round = openRound;
      } else {
        var latestRound = Rounds.findOne({
          competitionId: competitionId,
          eventCode: this.params.eventCode,
        }, {
          fields: { nthRound: 1 },
          sort: { nthRound: -1 },
        });
        round = latestRound;
      }
      newParams.nthRound = round.nthRound;

      // { replaceState: true } to avoid breaking the back button
      //  http://stackoverflow.com/a/26490250
      Router.go('roundResults', newParams, { replaceState: true });
    }
    return this.buildRoundData(competitionId);
  },
});

ManageRoundResultsController = BaseRoundController.extend({
  ccmManage: true,
  buildData: function(competitionId) {
    return this.buildRoundData(competitionId);
  },
});

RegistrationController = ViewCompetitionController.extend({
  extraSubscriptions: function() {
    return [subs.subscribe('competitionRegistrations', this.params.competitionUrlId, subscriptionError(this))];
  },
});

Router.route('/', {
  name: 'home',
  waitOn: function() {
    return subs.subscribe('competitions', subscriptionError(this));
  },
  titlePrefix: '',
});

Router.route('/api', {
  name: 'apiDocumentation',
});

Router.route('/settings/profile', {
  name: 'editProfile',
  titlePrefix: 'Edit profile',
});

Router.route('/settings/administration', {
  name: 'administerSite',
  titlePrefix: 'Administer site',
  waitOn: function() {
    return [
      subs.subscribe('allSiteAdmins', subscriptionError(this)),
    ];
  },
});

Router.route('/new', {
  name: 'newCompetition',
  titlePrefix: 'Create competition',
});

Router.route('/new/import', {
  name: 'importCompetition',
  template: 'newCompetition',
  titlePrefix: 'Import competition',
});

Router.route('/manage/:competitionUrlId', {
  name: 'manageCompetition',
  template: 'editCompetition',
  controller: 'ManageCompetitionController',
  titlePrefix: "Manage",
});
Router.route('/manage/:competitionUrlId/events', {
  name: 'editEvents',
  controller: 'ManageCompetitionController',
  titlePrefix: "Edit events",
  waitOn: function() {
    return [subs.subscribe('roundProgresses', this.params.competitionUrlId, subscriptionError(this))];
  },
});
Router.route('/manage/:competitionUrlId/check-in', {
  name: 'manageCheckin',
  controller: 'ManageCompetitionController',
  titlePrefix: "Check-in",
});
Router.route('/manage/:competitionUrlId/uploadScrambles', {
  name: 'uploadScrambles',
  controller: 'ManageCompetitionController',
  titlePrefix: "Upload scrambles",
  waitOn: function() {
    var waitOn = this.constructor.prototype.waitOn.call(this);
    waitOn.push(subs.subscribe('competitionScrambles',
                               this.params.competitionUrlId,
                               subscriptionError(this)));
    return waitOn;
  },
});
Router.route('/manage/:competitionUrlId/exportResults', {
  name: 'exportResults',
  controller: 'ManageCompetitionController',
  titlePrefix: "Export results",
});
Router.route('/manage/:competitionUrlId/schedule', {
  name: 'editSchedule',
  controller: 'ManageCompetitionController',
  titlePrefix: "Edit schedule",
  waitOn: function() {
    return [subs.subscribe('scheduleEvents', this.params.competitionUrlId, subscriptionError(this))];
  },
});
Router.route('/manage/:competitionUrlId/advance-participants/:eventCode?/:nthRound?', {
  name: 'advanceParticipants',
  controller: 'ManageRoundResultsController',
  titlePrefix: "Advance competitors",
});
Router.route('/manage/:competitionUrlId/data-entry/:eventCode?/:nthRound?', {
  name: 'dataEntry',
  controller: 'ManageRoundResultsController',
  titlePrefix: "Data entry",
});

Router.route('/:competitionUrlId', {
  name: 'competition',
  controller: 'ViewCompetitionController',
  titlePrefix: null,
});
Router.route('/:competitionUrlId/registration', {
  name: 'competitionRegistration',
  controller: 'RegistrationController',
  titlePrefix: 'Registration',
});
Router.route('/:competitionUrlId/events', {
  name: 'competitionEvents',
  controller: 'ViewCompetitionController',
  titlePrefix: 'Events',
});
Router.route('/:competitionUrlId/schedule', {
  name: 'competitionSchedule',
  controller: 'ViewCompetitionController',
  titlePrefix: 'Schedule',
  waitOn: function() {
    return [subs.subscribe('scheduleEvents', this.params.competitionUrlId, subscriptionError(this))];
  },
});

Router.route('/:competitionUrlId/results/byname/:participantUniqueName', {
  name: 'participantResults',
  controller: 'ViewParticipantController',
});

Router.route('/:competitionUrlId/results/:eventCode?/:nthRound?', {
  name: 'roundResults',
  template: 'roundResults',
  controller: 'ViewRoundController',
});

Router.route('/api/v0/login', {
  name: 'standaloneLogin',
  layoutTemplate: "",
});
