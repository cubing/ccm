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

Router.map(function(){
  this.route('home', {
    path: '/',
    waitOn: function(){
      return Meteor.subscribe('competitions', subscriptionError(this));
    }
  });

  this.route('newCompetition', {
    path: '/new'
  });

  // TODO - use iron-router's route controllers
  var editCompetitionRouteInfo = {
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
  };
  this.route('manageCompetition', _.extend({
    template: 'editCompetition',
    path: "/:competitionUrlId/manage"
  }, editCompetitionRouteInfo));
  this.route('uploadScrambles', _.extend({
    path: "/:competitionUrlId/manage/uploadScrambles"
  }, editCompetitionRouteInfo));
  this.route('exportResults', _.extend({
    path: "/:competitionUrlId/manage/exportResults"
  }, editCompetitionRouteInfo));

  this.route('competition', {
    path: "/:competitionUrlId",
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
          competitionName: 1
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
  this.route('round', {
    path: "/:competitionUrlId/:eventCode/:roundCode",
    template: 'round',
    waitOn: function(){
      return Meteor.subscribe('competition', this.params.competitionUrlId, subscriptionError(this));
    },
    data: function(){
      var competitionUrlId = this.params.competitionUrlId;
      var roundCode = this.params.roundCode;
      var eventCode = this.params.eventCode;

      var competition = Competitions.findOne({
        $or: [
          { _id: competitionUrlId },
          { wcaCompetitionId: competitionUrlId }
        ]
      }, {
        fields: {
          wcaCompetitionId: 1,
          competitionName: 1
        }
      });
      if(!competition){
        return null;
      }

      var round = Rounds.findOne({
        competitionId: competition._id,
        eventCode: eventCode,
        roundCode: roundCode
      });
      return {
        competitionUrlId: competitionUrlId,
        competition: competition,
        round: round
      };
    }
  });
  this.route('competitor', {
    path: "/:competitionUrlId/:competitorName",
    template: 'competitor',
    waitOn: function(){
      return [
        Meteor.subscribe('competition', this.params.competitionUrlId, subscriptionError(this))
      ];
    },
    data: function(){
      var competitionUrlId = this.params.competitionUrlId;
      var userName = this.params.competitorName;


      var competition = Competitions.findOne({
        $or: [
          { _id: competitionUrlId },
          { wcaCompetitionId: competitionUrlId }
        ]
      }, {
        fields: {
          wcaCompetitionId: 1,
          competitionName: 1
        }
      });
      if(!competition){
        return null;
      }

      var user = Meteor.users.findOne({
        "profile.name": userName
      });

      if(!user){
        return null;
      }

      return {
        competitionUrlId: competitionUrlId,
        competition: competition,
        user: user
      };
    }
  });
});

Router.configure({
  layoutTemplate: "layout",
  loadingTemplate: "loading",
  notFoundTemplate: "notFound",
});
