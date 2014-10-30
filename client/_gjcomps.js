Accounts.ui.config({
  passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
});

// For each button that triggers a modal, add listeners that will update
// the url hash to reflect that the modal is open. Also react to the url hash
// changing and open/close the modal accordingly.
updateUrlHashForModals = function(){
  var $modalButtons = this.$('[data-toggle="modal"]');
  $modalButtons.each(function(){
    var $modalButton = $(this);
    var $modal = $($modalButton.data("target"));
    var url_component = $modalButton.data("url-component");

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
