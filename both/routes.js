subs = new SubsManager({
  cacheLimit: 10,
  expireIn: 5, // minutes
});

Router.configure({
  layoutTemplate: "layout",
  loadingTemplate: "loading",
  notFoundTemplate: "notFound",
  progressSpinner: false,
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

  Template.registerHelper("refreshTitle", function() {
    var title = "live.cubing.net";

    var data = Router.current().data && Router.current().data();
    if(data) {
      if(data.competitionId) {
        var competitionName = getCompetitionAttribute(data.competitionId, 'competitionName');
        title = competitionName + " - " + title;
      }
      if(data.roundId) {
        var eventCode = getRoundAttribute(data.roundId, 'eventCode');
        var eventName = wca.eventByCode[eventCode].name;

        var roundCode = getRoundAttribute(data.roundId, 'roundCode');
        var roundName = wca.roundByCode[roundCode].name;

        title = wca.eventByCode[eventCode].name + " " + roundName + " - " + title;
      }
      if(data.user) {
        title = data.user.profile.name + " - " + title;
      }
    }

    var titlePrefix = Router.current().lookupOption('titlePrefix');
    if(titlePrefix) {
      title = titlePrefix + " - " + title;
    }

    // Immediately updating the page title here was causing the title of the
    // current (new) page to get put in the history as the title of the
    // previous (old) page. Waiting for a little bit before setting the title
    // lets the browser history look sane.
    setTimeout(function() {
      document.title = title;
    }, 0);
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

ManageCompetitionController = RouteController.extend({
  notFoundTemplate: "competitionNotFound",
  waitOn: function() {
    return [
      subs.subscribe('competition', this.params.competitionUrlId, subscriptionError(this)),
      subs.subscribe('competitionRegistrations', this.params.competitionUrlId, subscriptionError(this)),
    ];
  },
  data: function() {
    if(!this.ready()) {
      // We explicitly render *NotFound templates based on what's missing, and
      // that steps on the toes of iron-router's loading hook. If we're not
      // ready, just do nothing and let the loading hook render our
      // loadingTemplate.
      return;
    }
    var competitionUrlId = this.params.competitionUrlId;
    var competition = Competitions.findOne({
      $or: [
        { _id: competitionUrlId },
        { wcaCompetitionId: competitionUrlId },
      ]
    }, {
      fields: {
        _id: 1,
      }
    });
    if(!competition) {
      this.render('competitionNotFound');
      return null;
    }
    if(getCannotManageCompetitionReason(Meteor.userId(), competition._id)) {
      this.render('cannotManageCompetition');
      return null;
    }
    return {
      competitionUrlId: competitionUrlId,
      competitionId: competition._id,
    };
  },
});

ViewCompetitionController = RouteController.extend({
  fastRender: true,
  waitOn: function() {
    return [
      subs.subscribe('competition', this.params.competitionUrlId, subscriptionError(this)),
    ];
  },
  data: function() {
    if(!this.ready()) {
      // We explicitly render *NotFound templates based on what's missing, and
      // that steps on the toes of iron-router's loading hook. If we're not
      // ready, just do nothing and let the loading hook render our
      // loadingTemplate.
      return;
    }
    var competitionUrlId = this.params.competitionUrlId;
    var competition = Competitions.findOne({
      $or: [
        { _id: competitionUrlId },
        { wcaCompetitionId: competitionUrlId }
      ]
    }, {
      fields: {
        _id: 1
      }
    });
    if(!competition) {
      this.render('competitionNotFound');
      return;
    }
    return {
      competitionUrlId: competitionUrlId,
      competitionId: competition._id,
    };
  }
});

ViewCompetitorController = ViewCompetitionController.extend({
  waitOn: function() {
    var waitOn = this.constructor.__super__.waitOn.call(this);
    waitOn.push(subs.subscribe('competitorResults',
                               this.params.competitionUrlId,
                               this.params.competitorUniqueName,
                               subscriptionError(this)));
    return waitOn;
  },
  data: function() {
    var parentData = this.constructor.__super__.data.call(this);
    if(!parentData) {
      return null;
    }

    var uniqueName = this.params.competitorUniqueName;
    var registration = Registrations.findOne({
      competitionId: parentData.competitionId,
      uniqueName: uniqueName,
    });
    parentData.registration = registration;
    if(!registration) {
      this.render('competitorNotFound');
      return parentData;
    }

    var user = Meteor.users.findOne({
      _id: registration.userId,
    });
    parentData.user = user;
    return parentData;
  },
});

ViewRoundController = ViewCompetitionController.extend({
  waitOn: function() {
    var waitOn = this.constructor.__super__.waitOn.call(this);
    if(!this.params.eventCode || !this.params.nthRound) {
      return waitOn;
    }
    var nthRound = parseInt(this.params.nthRound);
    waitOn.push(subs.subscribe('roundResults',
                               this.params.competitionUrlId,
                               this.params.eventCode,
                               nthRound,
                               subscriptionError(this)));
    return waitOn;
  },
  data: function() {
    var parentData = this.constructor.__super__.data.call(this);
    if(!parentData) {
      return null;
    }

    if(!this.params.eventCode) {
      // TODO - https://github.com/jfly/ccm/issues/119
    } else if(!this.params.nthRound) {
      var newParams = _.extend({}, this.params);
      // If the user didn't specify a specific round for the given event,
      // try to be useful and redirect them a round they're likely to be interested in.
      // Lets go with an open round, or if none are open, the latest round for this event.

      var round;

      var openRound = Rounds.findOne({
        competitionId: parentData.competitionId,
        eventCode: this.params.eventCode,
        status: wca.roundStatuses.open,
      }, {
        fields: {
          nthRound: 1,
        },
      });
      if(openRound) {
        round = openRound;
      } else {
        var latestRound = Rounds.findOne({
          competitionId: parentData.competitionId,
          eventCode: this.params.eventCode,
        }, {
          fields: {
            nthRound: 1,
          },
          sort: {
            nthRound: -1,
          },
        });
        round = latestRound;
      }
      newParams.nthRound = round.nthRound;

      // { replaceState: true } to avoid breaking the back button
      //  http://stackoverflow.com/a/26490250
      Router.go('roundResults', newParams, { replaceState: true });
    }
    return getRoundData.call(this, parentData);
  },
});

ManageRoundResultsController = ManageCompetitionController.extend({
  waitOn: function() {
    var waitOn = this.constructor.__super__.waitOn.call(this);
    if(!this.params.eventCode || !this.params.nthRound) {
      return waitOn;
    }
    var nthRound = parseInt(this.params.nthRound);
    waitOn.push(subs.subscribe('roundResults',
                               this.params.competitionUrlId,
                               this.params.eventCode,
                               nthRound,
                               subscriptionError(this)));
    return waitOn;
  },
  data: function() {
    var parentData = this.constructor.__super__.data.call(this);
    if(!parentData) {
      return null;
    }
    return getRoundData.call(this, parentData);
  },
});

function getRoundData(data) {
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
  var eventCode = this.params.eventCode;

  var round = Rounds.findOne({
    competitionId: data.competitionId,
    eventCode: eventCode,
    nthRound: nthRound,
  }, {
    fields: {
      _id: 1,
    }
  });
  if(!round) {
    this.render('roundNotFound');
    return data;
  }
  data.roundId = round._id;
  return data;
}

Router.route('/', {
  name: 'home',
  waitOn: function() {
    return subs.subscribe('competitions', subscriptionError(this));
  },
  titlePrefix: '',
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
});
Router.route('/manage/:competitionUrlId/advance-competitors/:eventCode?/:nthRound?', {
  name: 'advanceCompetitors',
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

// TODO - fast-render breaks if we don't define a controller for this route.
// It's seems to call waitOn with the wrong "this".
RegistrationController = ViewCompetitionController.extend({
  waitOn: function() {
    var waitOn = this.constructor.__super__.waitOn.call(this);
    // We need information about guests and # competitors to tell
    // if registration is full.
    // We also need all the registrations to know if a uniqueName is required.
    waitOn.push(subs.subscribe('competitionRegistrations',
                               this.params.competitionUrlId,
                               subscriptionError(this)));
    return waitOn;
  },
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
});

Router.route('/:competitionUrlId/results/byname/:competitorUniqueName', {
  name: 'competitorResults',
  controller: 'ViewCompetitorController',
});
Router.route('/:competitionUrlId/results/:eventCode?/:nthRound?', {
  name: 'roundResults',
  template: 'roundResults',
  controller: 'ViewRoundController',
});
