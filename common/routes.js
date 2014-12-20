var subs = new SubsManager({
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
      subs.subscribe('competitionUsers', this.params.competitionUrlId, subscriptionError(this)),
      subs.subscribe('competitionResults', this.params.competitionUrlId, subscriptionError(this)),
      // TODO - we only need scrambles on the uploadScrambles route
      subs.subscribe('competitionScrambles', this.params.competitionUrlId, subscriptionError(this)),
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
      return;
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

ViewRoundController = ViewCompetitionController.extend({
  waitOn: function() {
    var waitOn = this.constructor.__super__.waitOn.call(this);
    var nthRound = parseInt(this.params.nthRound);
    waitOn.push(subs.subscribe('roundResults',
                               this.params.competitionUrlId,
                               this.params.eventCode,
                               nthRound,
                               subscriptionError(this)));
    // TODO - ideally we'd denormalize our data so that we wouldn't
    // need to publish the Users collection as well.
    waitOn.push(subs.subscribe('competitionUsers',
                               this.params.competitionUrlId,
                               subscriptionError(this)));
    return waitOn;
  },
  data: function() {
    var parentData = this.constructor.__super__.data.call(this);
    return getRoundData.call(this, parentData);
  },
});

function getRoundData(data) {
  if(!data) {
    return null;
  }

  if(!this.params.nthRound) {
    data.eventCode = this.params.eventCode;
    return data;
  }
  if(!String.isNonNegInt(this.params.nthRound)) {
    this.render('roundNotFound');
    return;
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
    return;
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

Router.route('/new', {
  name: 'newCompetition',
  titlePrefix: 'New competition',
});

Router.route('/:competitionUrlId/manage', {
  name: 'manageCompetition',
  template: 'editCompetition',
  controller: 'ManageCompetitionController',
  titlePrefix: "Manage",
});
Router.route('/:competitionUrlId/manage/check-in', {
  name: 'manageCheckin',
  controller: 'ManageCompetitionController',
  titlePrefix: "Check-in",
});
Router.route('/:competitionUrlId/manage/uploadScrambles', {
  name: 'uploadScrambles',
  controller: 'ManageCompetitionController',
  titlePrefix: "Upload scrambles",
});
Router.route('/:competitionUrlId/manage/exportResults', {
  name: 'exportResults',
  controller: 'ManageCompetitionController',
  titlePrefix: "Export results",
});
Router.route('/:competitionUrlId/manage/schedule', {
  name: 'editSchedule',
  controller: 'ManageCompetitionController',
  titlePrefix: "Edit schedule",
});
Router.route('/:competitionUrlId/manage/data-entry/:eventCode?/:nthRound?', {
  name: 'dataEntry',
  controller: 'ManageCompetitionController',
  titlePrefix: "Data entry",
  data: function() {
    var data = this.constructor.prototype.data.call(this);
    return getRoundData.call(this, data);
  },
});

Router.route('/:competitionUrlId', {
  name: 'competition',
  controller: 'ViewCompetitionController',
  titlePrefix: null,
});
Router.route('/:competitionUrlId/registration', {
  name: 'competitionRegistration',
  controller: 'ViewCompetitionController',
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
Router.route('/:competitionUrlId/results', {
  name: 'competitionResults',
  controller: 'ViewCompetitionController',
  titlePrefix: 'Results',
});
Router.route('/:competitionUrlId/results/:eventCode/:nthRound', {
  name: 'roundResultsBlaze',//<<<
  template: 'roundResults',//<<<
  controller: 'ViewRoundController',
});
Router.route('/:competitionUrlId/results-reactjs/:eventCode/:nthRound', {
  name: 'roundResults',//<<<
  template: 'roundResultsReactjs',//<<<
  controller: 'ViewRoundController',
});
Router.route('/:competitionUrlId/results/:competitorName', {
  name: 'competitorResults',
  controller: 'ViewCompetitionController',
  data: function() {
    var userName = this.params.competitorName;

    // Hack to call our controller's data function
    var data = this.constructor.prototype.data.call(this);
    if(!data) {
      return null;
    }

    var user = Meteor.users.findOne({
      "profile.name": userName
    });
    if(!user) {
      this.render('competitorNotFound');
      return;
    }
    data.user = user;
    return data;
  }
});
