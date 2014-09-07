if(Meteor.isClient) {
  Router.onBeforeAction('dataNotFound');
}

Router.map(function() {
  this.route('home', {
    path: '/',
    waitOn: function() {
      return Meteor.subscribe('competitions');
    }
  });
  this.route('organizerTemplate', {
    path: "/organizer",
    waitOn: function() {
      return Meteor.subscribe('competitions');
    }
  });
  this.route('editCompetitionTemplate', {
    path: "/organizer/:competitionId",
    waitOn: function() {
      return Meteor.subscribe('competition', this.params.competitionId);
    },
    data: function() {
      var competitionId = this.params.competitionId;
      return Competitions.findOne(
        { _id: competitionId }
      );
    }
  });
  this.route('compTemplate', {
    path: "/:wcaCompetitionId",
    waitOn: function() {
      return Meteor.subscribe('competition', this.params.wcaCompetitionId);
    },
    data: function() {
      var wcaCompetitionId = this.params.wcaCompetitionId;
      return Competitions.findOne(
        { wcaCompetitionId: wcaCompetitionId },
        { fields: { wcaCompetitionId: 1, competitionName: 1 } }
      );
    }
  });
  this.route('roundTemplate', {
    path: "/:wcaCompetitionId/:eventCode/:roundCode",
    template: 'roundTemplate',
    waitOn: function() {
      return Meteor.subscribe('competition', this.params.wcaCompetitionId);
    },
    data: function() {
      var wcaCompetitionId = this.params.wcaCompetitionId;
      var roundCode = this.params.roundCode;
      var eventCode = this.params.eventCode;

      var competition = Competitions.findOne(
        { wcaCompetitionId: wcaCompetitionId },
        { fields: { wcaCompetitionId: 1 } }
      );
      if(!competition) {
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
  this.route('competitorTemplate', {
    path: "/:wcaCompetitionId/:competitorName",
    template: 'competitorTemplate',
    waitOn: function() {
      return [Meteor.subscribe('competition', this.params.wcaCompetitionId)];
    },
    data: function() {
      var wcaCompetitionId = this.params.wcaCompetitionId;
      var userName = this.params.competitorName;


      var competition = Competitions.findOne(
        { wcaCompetitionId: wcaCompetitionId },
        { fields: { wcaCompetitionId: 1 } }
      );
      if(!competition) {
        return null;
      }

      var user = Meteor.users.findOne(
        { "profile.name": userName }
      );

      if(!user) {
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
  notFoundTemplate: "notFound",
  layoutTemplate: "layout"
});
