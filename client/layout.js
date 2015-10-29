Template.layout.events({
  "mouseover [data-toggle='tooltip']": function(e) {
    // Bootstrap's tooltips are opt in. Here we lazily enable it on all
    // elements with a data-toggle="tooltip" attribute.
    let $target = $(e.currentTarget);
    if(!$target.data("tooltip-applied")) {
      $target.tooltip('show');
      $target.data("tooltip-applied", "true");

      // When this DOM element is removed, we must remove the corresponding
      // tooltip element.
      let observer = new MutationObserver(function(mutations) {
        mutations.forEach(mutation => {
          if(!document.body.contains($target[0])) {
            // $target has been removed from the DOM
            let tipId = $target.attr('aria-describedby');
            let $tip = $('#' + tipId).remove();
            observer.disconnect();
          }
        });
      });
      observer.observe($target.parent()[0], { childList: true });
    }
  },
  'mouseover [data-toggle="popover"]': function(e) {
    let $target = $(e.currentTarget);
    if(!$target.data("popover-applied")) {
      $target.popover();
      $target.data("popover-applied", "true");
      // NOTE: we're not currently handling the case where a popup is showing
      // as the DOM element that triggered it goes away, as we are handling
      // for tooltips above.
    }
  },
  'shown.bs.modal .modal': function(e, template) {
    template.$('input[autofocus]').select();
    template.$('input[autofocus]').focus();
  },
  'submit form': function(e) {
    // Prevent the browser from following the forms, as we handle them all in JS.
    e.preventDefault();
  }
});

Router.onBeforeAction(function() {
  // Workaround for https://github.com/EventedMind/iron-router/issues/96.
  $(window).scrollTop(0);

  // As the page changes, remove any leftover tooltips that might get
  // abandoned because they were set to data-container="body"
  $('.tooltip').remove();

  // Also remove any modal backdrops that didn't get cleared.
  // This is kind of gross, because as far as I can tell, Bootstrap doesn't
  // provide a way to clear modals that are now gone.
  $('body').css({ paddingRight: 0 });
  $('body').removeClass('modal-open');
  $('.modal-backdrop').remove();

  this.next();
});

let verificationSendSuccessReact = new ReactiveVar(null);

Template.layout.helpers({
  showManageCompetitionLink: function() {
    let competition = Competitions.findOne(this.competitionId);
    return competition.userIsStaffMember(Meteor.userId());
  },
  verificationSendSuccess: function() {
    return verificationSendSuccessReact.get();
  },
  managerTabs: function() {
    return [
      {
        route: 'manageCompetition',
        title: 'Change competition registration window, competition name, location, organizers, and staff',
        icon: 'fa fa-cog',
        text: 'Manage',
      }, {
        route: 'editStaff',
        title: 'Assign staff members',
        icon: 'fa fa-group',
        text: 'Staff',
      }, {
        route: 'editEvents',
        title: 'Add and remove rounds, change cutoffs, open and close rounds',
        icon: 'fa fa-cube',
        text: 'Events',
      }, {
        route: 'editSchedule',
        icon: 'glyphicon glyphicon-calendar',
        text: 'Schedule',
      }, {
        route: 'scrambles',
        title: 'Generate scrambles, manage groups, and view scrambles for open groups',
        icon: '/img/tnoodle_logo.svg',
        text: 'Scrambles',
        notLeaf: true,
      }, {
        route: 'manageCheckin',
        title: 'Edit the list of registered competitors and copy competitors to the first rounds they will compete in (check-in)',
        icon: 'fa fa-check-square-o',
        text: 'Check-in',
      }, {
        route: 'dataEntry',
        icon: 'glyphicon glyphicon-edit',
        text: 'Data entry',
        notLeaf: true,
      }, {
        route: 'podiums',
        icon: 'fa fa-trophy',
        text: 'Podiums',
        notLeaf: true,
      }, {
        route: 'exportResults',
        title: 'Export results to WCA JSON',
        icon: '/img/WCAlogo_notext.svg',
        text: 'Export',
      },
    ];
  },
  userTabs: function() {
    return [
      {
        route: 'competition',
        icon: 'glyphicon glyphicon-home',
        text: 'Home',
        otherClass: 'match-jumbotron',
      }, {
        route: 'competitionEvents',
        icon: 'fa fa-cube',
        text: 'Events',
      }, {
        route: 'competitionSchedule',
        icon: 'glyphicon glyphicon-calendar',
        text: 'Schedule',
      }, {
        route: 'competitionRegistration',
        icon: 'fa fa-list',
        text: 'Registration',
      }, {
        route: 'roundResults',
        icon: 'fa fa-trophy',
        text: 'Results',
        notLeaf: true,
      },
    ];
  },
  scrambleTabs: function() {
    return [
      {
        route: 'uploadScrambles',
        title: 'Generate scrambles with TNoodle and upload them',
        icon: 'fa fa-upload',
        text: 'Upload Scrambles',
      }, {
        route: 'manageScrambleGroups',
        title: 'Open and close scramble groups for ongoing rounds',
        icon: 'fa fa-group',
        text: 'Manage Scramble Groups',
        notLeaf: true,
      }, {
        route: 'viewScrambles',
        title: 'View scrambles for open groups',
        icon: 'fa fa-eye',
        text: 'View Scrambles',
      },
    ];
  },
  podiumTabs: function() {
    return [
      {
        route: 'podiums',
        title: 'Show everyone who podiumed, grouped by event',
        icon: 'fa fa-trophy',
        text: 'Podiums By Event',
      }, {
        route: 'podiumsByPerson',
        title: 'Show everyone who podiumed, grouped by person',
        icon: 'fa fa-group',
        text: 'Podiums By Person',
      },
    ];
  },
  newCompetitionTab: function() {
    return {
      route: 'newCompetition',
      title: 'New competition',
      icon: 'glyphicon glyphicon-plus',
    };
  },
});

Template.oneTab.helpers({
  img: function() {
    return this.icon.charAt(0) === '/';
  },
  leaf: function() {
    return this.notLeaf ? "" : "leaf";
  },
  parentData: function() {
    return Template.parentData();
  },
  active: function() {
    if(isActiveRoute(this.route)) {
      return "active";
    } else if(isActiveOrAncestorRoute(this.route)) {
      if(this.notLeaf) {
        // We only consider ancestors to be active if they're supposed to be
        // non leafs.
        // This deals with the competition and the manageCompetition routes.
        return "active";
      }
    }
    return "";
  },
});

Template._loginButtonsLoggedInDropdown.events({
  'click #login-buttons-resend-emailverification': function(e) {
    verificationSendSuccessReact.set(false);
    Meteor.call('requestVerificationEmail', function(err, value) {
      verificationSendSuccessReact.set(!err);
      $('#modal-verificationsent').modal('show');
      if(err) {
        console.error("Meteor.call() error: " + err);
      }
    });
  },
});

Template._loginButtonsLoggedInDropdown.helpers({
  user_profile_picture: function() {
    let user = Meteor.user();
    if(user && user.services.worldcubeassociation && user.services.worldcubeassociation.avatar) {
      return user.services.worldcubeassociation.avatar.thumb_url;
    } else {
      return null;
    }
  },
});

// Only show the password service behind a tiny caret.
// Make the WCA OAuth big and obvious.
Template._loginButtonsLoggedOutAllServices.helpers({
  hasOtherServices: function() {
    return false;
  },
  services: function() {
    return [ { name: "password" } ];
  },
});
Template._loginButtonsLoggedOut.helpers({
  dropdown: function() {
    return false;
  },
  singleService: function() {
    return { name: "worldcubeassociation" };
  },
});

// Adopted from http://stackoverflow.com/a/21778615
$.fn.scrollToCenter = function(speed) {
  speed = speed || 200;
  let el = this;
  let elOffset = el.offset().top;
  let windowHeight = $(window).height();
  let offset = elOffset - Math.max((windowHeight - el.height()) / 2, 0);

  $('html, body').animate({ scrollTop: offset }, speed);
};

// https://github.com/okgrow/analytics complains when
// Meteor.settings.public.analyticsSettings is unset. Velocity ensures that
// we see the message twice, which just drives me crazy. Here we just set
// Meteor.settings.public.analyticsSettings to an empty object to squelch this
// message.
Meteor.settings = Meteor.settings || {};
Meteor.settings.public = Meteor.settings.public || {};
Meteor.settings.public.analyticsSettings = {};
