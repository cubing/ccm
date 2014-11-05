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
    });
    if(!competition) {
      return null;
    }
    return {
      competitionUrlId: competitionUrlId,
      competition: competition
    };
  }
});

ViewCompetitionController = RouteController.extend({
  notFoundTemplate: "competitionNotFound",
  waitOn: function(){
    return Meteor.subscribe('competition', this.params.competitionUrlId, subscriptionError(this));
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
        wcaCompetitionId: 1,
        competitionName: 1,
        organizers: 1,
        staff: 1
      }
    });
    if(!competition) {
      return null;
    }
    return {
      competition: competition,
      competitionUrlId: competitionUrlId
    };
  }
});

Router.route('/', {
  name: 'home',
  waitOn: function(){
    return Meteor.subscribe('competitions', subscriptionError(this));
  }
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
      competitionId: data.competition._id,
      eventCode: eventCode,
      roundCode: roundCode
    });
    if(!round) {
      return null;
    }
    data.round = round;
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
      return null;
    }
    data.user = user;
    return data;
  }
});
