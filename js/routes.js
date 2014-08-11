Router.map(function () {
  this.route('home',{path:'/'});
  this.route('competitions',{path:'/comps'});
  this.route('competition',{
  	path: "/:competitionId",
  	data: function() {
  		var comp = Competitions.findOne({
 				competitionId: this.params.competitionId
  		});

  		if(comp){
  			console.log(comp);
  			return comp;
  		}else{
  			return comp;
  			this.render("notFound");
  		}
  		 
  	}
  });
});

Router.configure({
  notFoundTemplate: 'notFound' // this will render
});