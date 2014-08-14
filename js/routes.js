Router.map(function () {
  this.route('home', {path:'/'});
  this.route('compTemplate', {
    path: "/:competitionId",
    data: function() {
      console.log(this.params.competitionId);//<<<
      return {
        competitionId: this.params.competitionId
      };
    }
  });
  this.route('roundTemplate', {
    path: "/:competitionId/:eventId/:roundId",
  });
});

Router.configure({
  notFoundTemplate: 'notFound'
});
