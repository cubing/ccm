Router.configure({
  layoutTemplate: "layout",
  loadingTemplate: "loading",
  notFoundTemplate: "notFound",
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
      Meteor.subscribe('competition', this.params.competitionUrlId, subscriptionError(this)),
      // TODO - we only need scrambles on the uploadScrambles route
      Meteor.subscribe('competitionScrambles', this.params.competitionUrlId, subscriptionError(this)),
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
  waitOn: function() {
    return Meteor.subscribe('competition', this.params.competitionUrlId, subscriptionError(this));
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

Router.route('/', {
  name: 'home',
  waitOn: function() {
    return Meteor.subscribe('competitions', subscriptionError(this));
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
Router.route('/:competitionUrlId/manage/registration', {
  name: 'manageRegistration',
  controller: 'ManageCompetitionController',
  titlePrefix: "Manage registration",
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

Router.route('/:competitionUrlId/results', {
  name: 'competitionResults',
  controller: 'ViewCompetitionController',
  titlePrefix: 'Results',
});

Router.route('/:competitionUrlId/results/:eventCode/:roundCode', {
  name: 'roundResults',
  controller: 'ViewCompetitionController',
  data: function() {
    var roundCode = this.params.roundCode;
    var eventCode = this.params.eventCode;

    // Hack to call our controller's data function
    var data = this.constructor.prototype.data.call(this);
    if(!data) {
      return null;
    }

    var round = Rounds.findOne({
      competitionId: data.competitionId,
      eventCode: eventCode,
      roundCode: roundCode
    }, {
      fields: {
        _id: 1
      }
    });
    if(!round) {
      this.render('roundNotFound');
      return;
    }
    data.roundId = round._id;
    return data;
  },
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
