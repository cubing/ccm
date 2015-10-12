var log = logging.handle("editCompetition");

setCompetitionAttribute = function(competitionId, attribute, value) {
  var update;
  if(value === null || typeof value === "undefined") {
    var toUnset = {};
    toUnset[attribute] = 1;
    update = { $unset: toUnset };
  } else {
    var toSet = {};
    toSet[attribute] = value;
    update = { $set: toSet };
  }
  Competitions.update(competitionId, update);
};

var setCompetitionLocationMap = function() {
  var data = Template.currentData();
  data.location = data.location || { lat: 0, lng: 0, addressText: '' };
  var coords = data.location;

  // Dirty hacks to deal with reactivity. We wouldn't have to do this
  // if we let blaze update these fields, but we write to them ourselves
  // (with calls to .val(...)) below.
  var $addressInput = $('input[name="location.addressText"]');
  $addressInput.val(data.location.addressText);
  var $latInput = $('input[name="location.lat"]');
  $latInput.val(data.location.lat);
  var $lngInput = $('input[name="location.lng"]');
  $lngInput.val(data.location.lng);

  GoogleMaps.init({
    'libraries': 'places',
    'sensor': true,
  }, function() {
    // google maps components
    var $mapDiv = $('#competitionLocationMap');
    var $locationInput = $('<input type="text" id="competitionLocationMapInput">');
    $locationInput.keypress(function(e) {
      // don't submit meteor form; we want the google maps behavior here.
      if(e.which === 13) {
        e.preventDefault();
      }
    });
    // autoform inputs
    $locationInput.val($addressInput.val());


    var mapOptions = {
      scrollwheel: false,
      zoom: $addressInput.val() ? 12 : 2,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map($mapDiv[0], mapOptions);
    map.setCenter(new google.maps.LatLng(coords.lat, coords.lng));

    // Create the search box and link it to the UI element.
    map.controls[google.maps.ControlPosition.TOP_LEFT].push($locationInput[0]);
    var searchBox = new google.maps.places.SearchBox($locationInput[0]);

    var geocoder = new google.maps.Geocoder();
    var marker = new google.maps.Marker({
      map: map,
      draggable: true,
      position: coords
    });
    var defaultBounds;
    if(coords.lat && coords.lng) {
      defaultBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(coords.lat - 0.1, coords.lng - 0.1),
        new google.maps.LatLng(coords.lat + 0.1, coords.lng + 0.1)
      );
    } else {
      // default to a view of the whole world
      defaultBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(-60, -90),
        new google.maps.LatLng(60, 90)
      );
    }
    map.fitBounds(defaultBounds);

    google.maps.event.addListener(marker, 'dragend', function() {
      $latInput.val(this.getPosition().lat());
      $lngInput.val(this.getPosition().lng());
      var latLng = new google.maps.LatLng(this.getPosition().lat(), this.getPosition().lng());
      geocoder.geocode({
        'latLng': latLng
      }, function(results, status) {
        if(status == google.maps.GeocoderStatus.OK) {
          var competitionLocation = results[0];
          $addressInput.val(competitionLocation.formatted_address);
          $locationInput.val(competitionLocation.formatted_address);
        } else {
          alert('Geocode was not successful for the following reason: ' + status);
        }
      });

    });

    google.maps.event.addListener(searchBox, 'places_changed', function() {
      // Only use the first place - get the icon, place name, and location.
      var places = searchBox.getPlaces();
      var place = places[0];

      marker.setPosition(place.geometry.location);
      map.panTo(place.geometry.location);
      map.setZoom(12);
      $latInput.val(place.geometry.location.lat());
      $lngInput.val(place.geometry.location.lng());
      $addressInput.val(place.formatted_address);
    });

  });
};


function getExpandableListSettings(competitionId, registrationAttribute) {
  var criteria = {};
  criteria[registrationAttribute] = true;
  return {
    collectionName: 'Registrations',
    field: 'uniqueName',
    pillTemplateName: 'registrationPill',
    filter: {
      competitionId: competitionId,
      userId: {
        $exists: true,
      },
    },
    addDoc: function(registrationId) {
      var $toSet = {};
      $toSet[registrationAttribute] = true;
      Registrations.update(registrationId, { $set: $toSet });
    },
    removeDoc: function(registrationId) {
      var $toSet = {};
      $toSet[registrationAttribute] = false;
      Registrations.update(registrationId, { $set: $toSet });
    },
    docCriteria: criteria,
    isDeletable: function(registration) {
      return registration.userId != Meteor.userId();
    },
  };
}

Template.editCompetition.helpers({
  defaultCompetitionDataDocument: function() {
    var competitionId = this.competitionId;
    var competition = Competitions.findOne(competitionId);

    if(competition) {
      return competition;
    } else {
      return {
        // any default values
      };
    }
  },

  staffPickerSettings: function() {
    return getExpandableListSettings(this.competitionId, 'staff');
  },
  organizersPickerSettings: function() {
    return getExpandableListSettings(this.competitionId, 'organizer');
  },
});

Template.editCompetition.events({
  'change #competitionAttributes input[name="wcaCompetitionId"]': function(e) {
    var newWcaCompetitionId = e.currentTarget.value;
    setCompetitionAttribute(this.competitionId, 'wcaCompetitionId', newWcaCompetitionId);
  },
  'change #competitionAttributes input[type="checkbox"]': function(e) {
    var attribute = e.currentTarget.name;
    var value = e.currentTarget.checked;
    setCompetitionAttribute(this.competitionId, attribute, value);
  },
  'click #competitionAttributes #toggleCompetitionListed': function(e) {
    var competition = Competitions.findOne(this.competitionId);
    setCompetitionAttribute(this.competitionId, 'listed', !competition.listed);
  },
  'click button[name="buttonDeleteCompetition"]': function(e) {
    // When deleting a competition, we want to delete any cached subscriptions
    // from that competition.
    // For some reason, just calling subs.reset() doesn't seem to be sufficient.
    // This feels like a bug in subs-manager, but I don't really understand how
    // subs-manager works. If we can characterize this problem, we should at
    // least file an issue with them.
    _.each(subs._cacheList, function(sub) {
      delete subs._cacheMap[sub.hash];
    });
    subs.reset();

    // Note that we navigate away from the competition page first, and wait for the
    // navigation to complete before we actually delete the competition. This
    // avoids a bunch of spurious error messages in the console due to looking
    // up attributes of a competition that no longer exists.
    Router.go('home');
    var that = this;
    Meteor.defer(function() {
      Meteor.call("deleteCompetition", that.competitionId);
    });
  },
});

Template.competitionLocationMap.rendered = function() {
  var template = this;
  template.autorun(function() {
    setCompetitionLocationMap();
  });
};
