var log = logging.handle("manageCheckin");

Template.manageCheckin.rendered = function() {
  var template = this;

  template.autorun(function() {
    var data = Template.currentData();

    React.render(
      <CheckinList competitionId={data.competitionId} />,
      template.$(".reactRenderArea")[0]
    );
  });
};

Template.manageCheckin.destroyed = function() {
  var template = this;
  React.unmountComponentAtNode(
    template.$(".reactRenderArea")[0]
  );
};

var CheckinList = React.createClass({
  mixins: [ReactMeteor.Mixin],

  getMeteorState: function() {
    var competitionId = this.props.competitionId;;
    var registrations = Registrations.find({
      competitionId: competitionId,
    }, {
      sort: {
        uniqueName: 1,
      },
      fields: {
        competitionId: 1,
        uniqueName: 1,
        events: 1,
        registeredEvents: 1,
        checkedInEvents: 1,

        wcaId: 1,
        gender: 1,
        dob: 1,
      },
    });

    var competitionEvents = getCompetitionEvents(this.props.competitionId);

    return {
      registrations: registrations,
      competitionEvents,
    };
  },
  componentWillMount: function() {
    log.l1("component will mount");
  },
  componentDidMount: function() {
    log.l1("component did mount");

    var $checkinTable = $(this.refs.checkinTable.getDOMNode());
    $checkinTable.stickyTableHeaders();

    // React freaks out if it finds dom nodes that share a data-reactid.
    // Since $.stickyTableHeaders copies the <thead> we generated with react,
    // that copy has a data-reactid. Explicitly removing this attribute seems to
    // be enough to make react happy.
    var $floatingHead = $checkinTable.find("thead.tableFloatingHeader");
    $floatingHead.removeAttr('data-reactid');
  },
  componentWillUpdate(nextProps, nextState) {
    log.l1("component will update");
  },
  componentDidUpdate(prevProps, prevState) {
    log.l1("component did update");
  },
  componentWillUnmount: function() {
    log.l1("component will unmount");

    var $resultsTable = $(this.refs.resultsTable.getDOMNode());
    $resultsTable.stickyTableHeaders('destroy');
  },
  registeredCheckboxToggled: function(registration, event, e) {
    var registeredForEvent = _.contains(registration.registeredEvents, event.eventCode);
    var update;
    if(registeredForEvent) {
      // if registered, then unregister
      update = {
        $pull: {
          registeredEvents: event.eventCode
        }
      };
    } else {
      // if not registered, then register
      update = {
        $addToSet: {
          registeredEvents: event.eventCode
        }
      };
    }
    Registrations.update({
      _id: registration._id,
    }, update);
  },
  checkInClicked: function(registration, e) {
    var eventsToUncheckinFor = _.difference(registration.checkedInEvents, registration.registeredEvents);
    if(eventsToUncheckinFor.length) {
      var eventsStr = eventsToUncheckinFor.join(",");
      var confirmStr = "";
      confirmStr += "You are about to uncheck-in " + registration.uniqueName +
                    " from " + eventsStr + ", which may involve deleting " +
                    " results if they have already competed. Are you sure" +
                    " you want to procede?";
      bootbox.confirm(confirmStr, function(confirm) {
        if(confirm) {
          Meteor.call('checkInRegistration', registration._id);
        }
      });
    } else {
      // no need for a prompt, just check 'em in!
      Meteor.call('checkInRegistration', registration._id);
    }
  },
  render: function() {
    var that = this;

    return (
      <table id="checkinTable" className="table table-striped" ref="checkinTable">
        <thead>
          <tr>
            <th>Name</th>
            <th className="text-nowrap">WCA Id</th>
            <th>Gender</th>
            <th>Birthday</th>
            {that.state.competitionEvents.map(function(event) {
              return (
                <th key={event.eventCode} className="text-center">
                  <img src={getEventIcon(event.eventCode)} /><br />
                  <span>{event.eventCode}</span>
                </th>
              );
            })}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {that.state.registrations.map(function(registration) {
            var needsCheckinButton = false;
            var eventTds = [];
            that.state.competitionEvents.forEach(function(event) {
              var registeredForEvent = _.contains(registration.registeredEvents, event.eventCode);
              var checkedInForEvent = _.contains(registration.checkedInEvents, event.eventCode);
              if(registeredForEvent != checkedInForEvent) {
                needsCheckinButton = true;
              }

              var classes = React.addons.classSet({
                'text-center': true,
                'registered-for-event': registeredForEvent,
                'checkedin-for-event': checkedInForEvent,
              });
              var onChange = that.registeredCheckboxToggled.bind(null, registration, event);
              eventTds.push(
                <td key={event.eventCode} className={classes} onClick={onChange}>
                  <input type="checkbox" checked={registeredForEvent} onChange={onChange} />
                </td>
              );
            });
            var checkinButton = null;
            if(needsCheckinButton) {
              var checkinButtonText = registration.checkedInEvents.length ? "Update check-in" : "Check-in";
              var onClick = that.checkInClicked.bind(null, registration);
              checkinButton = (
                <button type="button"
                        className="btn btn-default btn-xs"
                        onClick={onClick}>
                  {checkinButtonText}
                </button>
              );
            }
            var gender = registration.gender ? wca.genderByValue[registration.gender].label : '';
            return (
              <tr key={registration._id}>
                <td>{registration.uniqueName}</td>
                <td>{registration.wcaId}</td>
                <td>{gender}</td>
                <td className="text-nowrap">
                  {formatMomentDate(moment(registration.dob))}
                </td>
                {eventTds}
                <td className="text-nowrap">
                  {checkinButton}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
});
