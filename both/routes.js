if(false) {// to look at it without commenting out the file
  const log = logging.handle("routes");

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

    isActiveOrAncestorRoute = function(routeName) {
      let currentParams = Router.current().params;
      let route = Router.routes[routeName];
      let routePath = route.path(currentParams);
      // Check if our current path begins with the given route
      let currentPath = Iron.Location.get().path;
      return currentPath.indexOf(routePath) === 0;
    };
    Template.registerHelper("isActiveOrAncestorRoute", isActiveOrAncestorRoute);

    isActiveRoute = function(routeName) {
      return Router.current().route.getName() == routeName;
    };
    Template.registerHelper("isActiveRoute", isActiveRoute);

    Template.registerHelper("setDocumentTitle", function() {
      let titleParts = ["live.cubing.net"];

      let data = Router.current().data && Router.current().data();
      if(data) {
        if(data.competitionId) {
          titleParts.push(Competitions.findOne(data.competitionId).competitionName);
        }
        if(data.roundId) {
          let round = Rounds.findOne(data.roundId);
          titleParts.push(round.eventName() + " " + round.properties().name);
        }
        if(data.registration) {
          titleParts.push(data.registration.uniqueName);
        }
      }

      let titlePrefix = Router.current().lookupOption('titlePrefix');
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
  let subscriptionError = function(that) {
    return {
      onError: function(err) {
        console.error(err);
        that.render('notFound');
      }
    };
  };

  SiteAdminController = RouteController.extend({
    fastRender: true,
    data: function() {
      if(!this.ready()) {
        // We explicitly render *NotFound templates based on what's missing, and
        // that steps on the toes of iron-router's loading hook. If we're not
        // ready, just do nothing and let the loading hook render our
        // loadingTemplate.
        return;
      }
      if(!isSiteAdmin(Meteor.userId())) {
        this.render('notSiteAdmin');
        return;
      }

      let data = (this.buildData ? this.buildData(competitionId) : {});
      return data;
    },
  });

  BaseCompetitionController = RouteController.extend({
    fastRender: true,
    waitOn: function() {
      let subscriptions = [subs.subscribe('competition', this.params.competitionUrlId, subscriptionError(this))];
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

      let competitionId = api.competitionUrlIdToId(this.params.competitionUrlId);
      let oldCompetitionId = this.oldCompetitionId;
      this.oldCompetitionId = competitionId;
      if(!competitionId) {
        // We cannot find a competition for the given competitionUrlId. There may simply
        // be no such competition, or the wcaCompetitionId for the competition we were
        // viewing may have just changed. Determine if we had a competition previously,
        // and if so, redirect to this same route with competitionUrlId set to the new
        // wcaCompetitionId.
        if(oldCompetitionId) {
          let newWcaCompetitionId = Competitions.findOne(oldCompetitionId).wcaCompetitionId;
          log.l0("It looks like the WCA competition id for", oldCompetitionId, "has changed to", newWcaCompetitionId, "... redirecting");
          Router.go(Router.current().route.getName(), _.extend({}, this.params, { competitionUrlId: newWcaCompetitionId }), { replaceState: true });
          return;
        }
        this.render('competitionNotFound');
        return;
      }
      let competition = Competitions.findOne(competitionId);
      if(this.ccmManage && !competition.userIsStaffMember(Meteor.userId())) {
        this.render('cannotManageCompetition');
        return;
      }

      let data = (this.buildData ? this.buildData(competitionId) : {});
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
      let data = {};

      data.registration = Registrations.findOne({
        competitionId: competitionId,
        uniqueName: this.params.participantUniqueName,
      });
      if(!data.registration) {
        this.render('participantNotFound');
        return data;
      }
      return data;
    },
  });

  BaseRoundController = BaseCompetitionController.extend({
    extraSubscriptions: function() {
      if(!this.params.eventCode || !this.params.nthRound) {
        return [];
      }
      let nthRound = parseInt(this.params.nthRound);
      return [subs.subscribe('roundResults',
        this.params.competitionUrlId,
        this.params.eventCode,
        nthRound,
        subscriptionError(this))];
    },
    buildRoundData: function(competitionId) {
      let data = {};
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
      let nthRound = parseInt(this.params.nthRound);
      let round = Rounds.findOne({
        competitionId: competitionId,
        eventCode: this.params.eventCode,
        nthRound: nthRound,
      }, {
        fields: {
          _id: 1,
          nthRound: 1,
        }
      });
      if(!round) {
        this.render('roundNotFound');
        return data;
      }
      data.roundId = round._id;
      data.nthRound = round.nthRound;
      return data;
    }
  });

  ViewRoundController = BaseRoundController.extend({
    ccmManage: false,
    buildData: function(competitionId) {
      if(!this.params.eventCode) {
        // TODO - https://github.com/cubing/ccm/issues/119
      } else if(!this.params.nthRound) {
        let newParams = _.extend({}, this.params);
        // If the user didn't specify a specific round for the given event,
        // try to be useful and redirect them a round they're likely to be interested in.
        // Lets go with an open round, or if none are open, the latest round for this event.

        let round;

        let openRound = Rounds.findOne({
          competitionId: competitionId,
          eventCode: this.params.eventCode,
          status: wca.roundStatuses.open,
        }, {
          fields: { nthRound: 1 }
        });
        if(openRound) {
          round = openRound;
        } else {
          let latestRound = Rounds.findOne({
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

  PodiumsController = BaseCompetitionController.extend({
    ccmManage: true,
    extraSubscriptions: function() {
      return [
        subs.subscribe('competitionPodiumResults',
                       this.params.competitionUrlId,
                       subscriptionError(this)),
      ];
    },
    buildData: function(competitionId) {
      let data = {};
      let nthRound = parseInt(this.params.nthRound);
      let allRounds = Rounds.find({
        competitionId: competitionId,
      }).fetch();
      let finalRounds = _.filter(allRounds, round => round.nthRound === round.totalRounds);
      finalRounds = _.sortBy(finalRounds, round => wca.eventByCode[round.eventCode].index);
      data.finalRounds = finalRounds;

      let finalResults = Results.find({
        position: { $in: [1, 2, 3] },
        roundId: { $in: _.pluck(finalRounds, '_id') },
      }).fetch();
      finalResults.forEach(result => {
        result.round = Rounds.findOne(result.roundId);
        result.registration = Registrations.findOne(result.registrationId);
      });
      data.finalResults = finalResults;
      return data;
    },
  });

  ManageCompetitionScramblesController = BaseRoundController.extend({
    ccmManage: true,
    extraSubscriptions: function() {
      return [
        subs.subscribe('competitionScrambles',
                       this.params.competitionUrlId,
                       subscriptionError(this)),
      ];
    },
    buildData: function(competitionId) {
      return this.buildRoundData(competitionId);
    },
  });

  ManageCompetitionScorecardsController = ManageCompetitionController.extend({

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
    titlePrefix: 'Your profile',
  });

  Router.route('/settings/administration', {
    name: 'administerSite',
    controller: 'SiteAdminController',
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
  Router.route('/manage/:competitionUrlId/staff', {
    name: 'editStaff',
    template: 'editStaff',
    controller: 'ManageCompetitionController',
    titlePrefix: "Staff",
  });
  ManageCompetitionEventsController = ManageCompetitionController.extend({
    extraSubscriptions: function() {
      return [subs.subscribe('roundProgresses', this.params.competitionUrlId, subscriptionError(this))];
    },
  });
  Router.route('/manage/:competitionUrlId/events', {
    name: 'editEvents',
    controller: 'ManageCompetitionEventsController',
    titlePrefix: "Edit events",
  });
  Router.route('/manage/:competitionUrlId/check-in', {
    name: 'manageCheckin',
    controller: 'ManageCompetitionController',
    titlePrefix: "Check-in",
  });

  Router.route('/manage/:competitionUrlId/scrambles', {
    name: 'scrambles',
    controller: 'ManageCompetitionScramblesController',
    onBeforeAction: function() {
      Router.go('uploadScrambles', this.params);
    },
  });
  Router.route('/manage/:competitionUrlId/scrambles/upload', {
    name: 'uploadScrambles',
    controller: 'ManageCompetitionScramblesController',
    titlePrefix: "Upload Scrambles",
  });
  Router.route('/manage/:competitionUrlId/scrambles/groups/:eventCode?/:nthRound?', {
    name: 'manageScrambleGroups',
    controller: 'ManageCompetitionScramblesController',
    titlePrefix: "Scramble Groups",
  });
  Router.route('/manage/:competitionUrlId/scrambles/view', {
    name: 'viewScrambles',
    controller: 'ManageCompetitionScramblesController',
    titlePrefix: "View Scrambles",
  });
  Router.route('/manage/:competitionUrlId/scorecards', {
    name: 'scorecards',
    controller: 'ManageCompetitionScorecardsController',
    titlePrefix: "Scorecards",
  });

  Router.route('/manage/:competitionUrlId/exportResults', {
    name: 'exportResults',
    controller: 'ManageCompetitionController',
    titlePrefix: "Export results",
  });

  ManageScheduleController = ManageCompetitionController.extend({
    extraSubscriptions: function() {
      return [subs.subscribe('scheduleEvents', this.params.competitionUrlId, subscriptionError(this))];
    },
  });
  Router.route('/manage/:competitionUrlId/schedule', {
    name: 'editSchedule',
    controller: 'ManageScheduleController',
    titlePrefix: "Edit schedule",
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
  Router.route('/manage/:competitionUrlId/podiums', {
    name: 'podiums',
    controller: 'PodiumsController',
    titlePrefix: "Podiums",
  });
  Router.route('/manage/:competitionUrlId/podiums/by-person', {
    name: 'podiumsByPerson',
    controller: 'PodiumsController',
    titlePrefix: "Podiums By Person",
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
}
