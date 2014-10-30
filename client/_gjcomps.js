Accounts.ui.config({
  passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
});

Meteor.startup(function(){
  Session.set("visibleModal", null);
});

// For each button that triggers a modal, add listeners that will update
// the url hash to reflect that the modal is open. Also react to the url hash
// changing and open/close the modal accordingly.
updateUrlHashForModals = function($modalButtons){
  $modalButtons.each(function(){
    var $modalButton = $(this);
    // .substring(1) to remove the leading hash
    var modalName = $modalButton.data("target").substring(1);
    var $modal = $("#" + modalName);
    var url_component = $modalButton.data("url-component");

    $modal.on('show.bs.modal', function(e){
      Session.set("visibleModal", modalName);
    });
    $modal.on('hide.bs.modal', function(e){
      Session.set("visibleModal", null);
    });
    $modal.on('shown.bs.modal', function(e){
      history.replaceState("", document.title,
        window.location.pathname + window.location.search + "#" + url_component);
    });
    $modal.on('hidden.bs.modal', function(e){
      history.replaceState("", document.title,
        window.location.pathname + window.location.search);
    });
    $(window).on('hashchange', function(){
      if(window.location.hash.indexOf(url_component) >= 0){
        $modal.modal('show');
      } else {
        $modal.modal('hide');
      }
    });
  });
  $(window).trigger("hashchange");
};

Template.registerHelper("modalVisible", function(modalName){
  return Session.equals("visibleModal", modalName);
});
