Router.configure({
  layoutTemplate: "layout",
  loadingTemplate: "loading",
  notFoundTemplate: "notFound",
});

if(Meteor.isClient){
  Router.onBeforeAction('dataNotFound');
  Template.registerHelper("title", function(){
    return Router.current().route.getName();
  });

  Template.registerHelper("isActiveRoute", function(routeName){
    return Router.current().route.getName() == routeName;
  });
}

// It appears that iron-router does nothing useful when a subscription throws
// an error. We explicitly catch that error, log it, and then render 'notFound'
var subscriptionError = function(that){
  return {
    onError: function(err){
      console.error(err);
      that.render('notFound');
    }
  };
};

ManageCompetitionController = RouteController.extend({
  notFoundTemplate: "competitionNotFound",
  waitOn: function(){
    return [
      Meteor.subscribe('competition', this.params.competitionUrlId, subscriptionError(this)),
      // TODO - we only need scrambles on the uploadScrambles route
      Meteor.subscribe('competitionScrambles', this.params.competitionUrlId, subscriptionError(this))
    ];
  },
  data: function(){
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
      return null;
    }
    return {
      competitionUrlId: competitionUrlId,
      competitionId: competition._id
    };
  }
});

ViewCompetitionController = RouteController.extend({
  waitOn: function(){
    return Meteor.subscribe('competition', this.params.competitionUrlId, subscriptionError(this));
  },
  data: function(){
    if(!this.ready()){
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
  waitOn: function(){
    return Meteor.subscribe('competitions', subscriptionError(this));
  }
});

Router.route('/settings/profile', {
  name: 'editProfile'
});

Router.route('/new', {
  name: 'newCompetition'
});

Router.route('/:competitionUrlId/manage', {
  name: 'manageCompetition',
  template: 'editCompetition',
  controller: 'ManageCompetitionController'
});
Router.route('/:competitionUrlId/manage/uploadScrambles', {
  name: 'uploadScrambles',
  controller: 'ManageCompetitionController',
});
Router.route('/:competitionUrlId/manage/exportResults', {
  name: 'exportResults',
  controller: 'ManageCompetitionController',
});
Router.route('/:competitionUrlId/manage/schedule', {
  name: 'editSchedule',
  controller: 'ManageCompetitionController',
});

Router.route('/:competitionUrlId', {
  name: 'competition',
  controller: 'ViewCompetitionController'
});

Router.route('/:competitionUrlId/:eventCode/:roundCode', {
  name: 'round',
  controller: 'ViewCompetitionController',
  data: function(){
    var roundCode = this.params.roundCode;
    var eventCode = this.params.eventCode;

    // Hack to call our controller's data function
    var data = this.constructor.prototype.data.call(this);
    if(!data){
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
  }
});
Router.route('/:competitionUrlId/:competitorName', {
  name: 'competitor',
  controller: 'ViewCompetitionController',
  data: function(){
    var userName = this.params.competitorName;

    // Hack to call our controller's data function
    var data = this.constructor.prototype.data.call(this);
    if(!data){
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
