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
        gender: 1,//<<<
        dob: 1,//<<<
        events: 1,
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
  render: function() {
    var that = this;

    var checkinText = "Check-in";
    return (
      <table id="checkinTable" className="table table-striped" ref="checkinTable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Gender</th>
            <th>Birthday</th>
            {that.state.competitionEvents.map(function(event) {
              return (
                <th key={event.eventCode} className="text-center">
                  <img src={getEventIcon(event.eventCode)} />
                  <span>{event.eventCode}</span>
                </th>
              );
            })}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {that.state.registrations.map(function(registration) {
            return (
              <tr key={registration._id}>
                <td>{registration.uniqueName}</td>
                <td>{registration.gender}</td>
                <td>{registration.dob}</td>
                {that.state.competitionEvents.map(function(event) {
                  var registeredForEvent = _.contains(registration.events, event.eventCode);

                  return (
                    <td key={event.eventCode} className="text-center">
                      <input type="checkbox" checked={registeredForEvent} readOnly="true" />
                    </td>
                  );
                })}
                <td className="text-nowrap">
                  {checkinText}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
});
