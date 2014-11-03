if(Meteor.isClient){
  Router.onBeforeAction('dataNotFound');
  Template.registerHelper("title", function(){
    return Router.current().route.getName();
  });

  Template.registerHelper("isActiveRoute", function(routeName){
    return Router.current().route.name == routeName ? "active" : "";
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
  this.route('organizer', {
    path: "/organizer",
    waitOn: function(){
      return Meteor.subscribe('competitions', subscriptionError(this));
    }
  });

  var editCompetitionRouteInfo = {
    notFoundTemplate: "competitionNotFound",
    waitOn: function(){
      return [
        Meteor.subscribe('competition', this.params.competitionId, subscriptionError(this)),
        Meteor.subscribe('competitionScrambles', this.params.competitionId, subscriptionError(this))
      ];
    },
    data: function(){
      var competitionId = this.params.competitionId;
      var competition = Competitions.findOne({
        _id: competitionId
      });
      return competition;
    }
  };
  this.route('editCompetition', _.extend({
    path: "/organizer/:competitionId"
  }, editCompetitionRouteInfo));
  this.route('uploadScrambles', _.extend({
    path: "/organizer/:competitionId/uploadScrambles"
  }, editCompetitionRouteInfo));
  this.route('exportResults', _.extend({
    path: "/organizer/:competitionId/exportResults"
  }, editCompetitionRouteInfo));

  this.route('competition', {
    path: "/:wcaCompetitionId",
    waitOn: function(){
      return Meteor.subscribe('competition', this.params.wcaCompetitionId, subscriptionError(this));
    },
    data: function(){
      var wcaCompetitionId = this.params.wcaCompetitionId;
      var competition = Competitions.findOne({
        $or: [
          { _id: wcaCompetitionId },
          { wcaCompetitionId: wcaCompetitionId }
        ]
      }, {
        fields: {
          wcaCompetitionId: 1,
          competitionName: 1
        }
      });
      return competition;
    }
  });
  this.route('round', {
    path: "/:wcaCompetitionId/:eventCode/:roundCode",
    template: 'round',
    waitOn: function(){
      return Meteor.subscribe('competition', this.params.wcaCompetitionId, subscriptionError(this));
    },
    data: function(){
      var wcaCompetitionId = this.params.wcaCompetitionId;
      var roundCode = this.params.roundCode;
      var eventCode = this.params.eventCode;

      var competition = Competitions.findOne(
        { wcaCompetitionId: wcaCompetitionId },
        { fields: { wcaCompetitionId: 1 } }
      );
      if(!competition){
        return null;
      }

      var round = Rounds.findOne(
        {
          competitionId: competition._id,
          eventCode: eventCode,
          roundCode: roundCode
        }
      );
      return {
        competition: competition,
        round: round
      };
    }
  });
  this.route('competitor', {
    path: "/:wcaCompetitionId/:competitorName",
    template: 'competitor',
    waitOn: function(){
      return [
        Meteor.subscribe('competition', this.params.wcaCompetitionId, subscriptionError(this))
      ];
    },
    data: function(){
      var wcaCompetitionId = this.params.wcaCompetitionId;
      var userName = this.params.competitorName;


      var competition = Competitions.findOne({
        wcaCompetitionId: wcaCompetitionId
      }, {
        fields: {
          wcaCompetitionId: 1
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
