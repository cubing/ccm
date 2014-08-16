Router.map(function () {
  this.route('home', {path:'/'});
  this.route('compTemplate', {
    path: "/:wcaCompetitionId",
    data: function() {
      var wcaCompetitionId = this.params.wcaCompetitionId;
      return Competitions.findOne(
        { wcaCompetitionId: wcaCompetitionId },
        { fields: { wcaCompetitionId: 1 } }
      );
    }
  });
  this.route('roundTemplate', {
    path: "/:wcaCompetitionId/:eventCode/:roundCode",
  });
});

Router.configure({
  notFoundTemplate: 'notFound'
});
