Template.layout.events({
  "mouseover [data-toggle='tooltip']": function(e){
    // Bootstrap's tooltips are opt in. Here we lazily enable it on all
    // elements with a data-toggle="tooltip" attribute.
    var $target = $(e.currentTarget);
    if(!$target.data("tooltip-applied")){
      $(e.currentTarget).tooltip('show');
      $target.data("tooltip-applied", "true");
    }
  }
});

Template._loginButtonsLoggedInDropdown.events({
  'click #login-buttons-edit-profile': function(event){
    Router.go('editProfile');
  }
});
