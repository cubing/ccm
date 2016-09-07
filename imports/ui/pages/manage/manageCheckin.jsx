import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import BlazeToReact from '/imports/ui/components/blazeToReact';
import {Modal, ModalBody, ModalHeader, ModalTitle, ModalFooter, Button} from 'react-bootstrap';

const log = logging.handle("manageCheckin");

let selectedRegistrationReact = new ReactiveVar(null);

Template.editRegistrationForm.events({
  'click .js-delete-registration': function() {
    let confirmStr = `Are you sure you want to delete the registration for ${this.uniqueName}?`;
    bootbox.confirm(confirmStr, confirm => {
      if(confirm) {
        Meteor.call('deleteRegistration', this.selectedRegistration._id, function(error) {
          if(error) {
            bootbox.alert(`Error deleting registration: ${error.reason}`);
          } else {
          }
        });
      }
    });
  },
});

Template.afSelectize.destroyed = function() {                                                               // 182
  if(this.$('select')[0].selectize) {
    this.$('select')[0].selectize.destroy();                                                                   // 183
  }
};

const EditRegistrationModal = React.createClass({
  componentDidMount() {
    let modal = this;
    AutoForm.addHooks('editRegistrationForm', {
      onSuccess: function(operation, result, template) {
        modal.hide();
      },
    });
  },

  getInitialState() {
    return {
      show: this.props.show,
      selectedRegistration: null
    };
  },

  show(selectedRegistration) {
    this.setState({ show: true, selectedRegistration: selectedRegistration });
  },

  hide() {
    AutoForm.resetForm('editRegistrationForm');
    this.setState({ show: false, selectedRegistration: null });
  },

  render() {
    let { selectedRegistration } = this.state;

    return (
      <Modal show={this.state.show} onHide={this.hide}>
        <ModalHeader>
          <ModalTitle>Edit Registration</ModalTitle>
        </ModalHeader>
        <BlazeToReact wrapperTag='div' blazeTemplate='editRegistrationForm' selectedRegistration={selectedRegistration} modal={this}/>
      </Modal>
    );
  }
});


const ImportRegistrationModal = React.createClass({
  getInitialState() {
    return {
      show: this.props.show,
      registrationJson: {},
      registrationJsonError: null,
    };
  },

  show() {
    this.setState({ show: true, val: '' });
  },

  hide() {
    this.setState({ show: false, val: '' });
  },

  importRegistrationJsonInput(e) {
    try {
      this.state.registrationJson = JSON.parse(e.target.value);
      this.state.registrationJsonError = null;
    } catch(error) {
      this.state.registrationJson = null;
      this.state.registrationJsonError = e.target.value.length > 0 ? error.toString() : "";
    }
    this.forceUpdate();
  },

  import() {
    let registrationJson = this.state.registrationJson;
    assert(registrationJson);

    Meteor.call('importRegistrations', this.props.competitionId, registrationJson, function(error) {
      if(error) {
        bootbox.alert(`Error importing registrations: ${error.reason}`);
      } else {
        $('#modalImportRegistrations').modal('hide');
      }
    });

    this.hide();
  },

  render() {
    return (
      <Modal show={this.state.show} onHide={this.hide}>
        <ModalHeader>
          <ModalTitle>Import Registration</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p>
            Import registration data conforming to the <a href="https://github.com/cubing/worldcubeassociation.org/wiki/WCA-Competition-JSON-Format" rel="external" target="_blank">WCA Competition JSON Format</a>.
          </p>
          <p>
            Importing data when you already have people registered will be very careful to not
            delete data: we update everyone's registration information (say if
            their birthday changed), but we won't unregister people for events if
            they're already checked in, and we certainly won't delete their results
            if they already have results.
          </p>
          <textarea name="registrationJson" className="form-control" ref="registrationJson" rows="10" placeholder="Registration JSON here" onChange={this.importRegistrationJsonInput}/>
          {this.state.registrationJsonError ?
            <div className="alert alert-danger">
              {this.state.registrationJsonError}
            </div> : null
          }
        </ModalBody>
        <ModalFooter>
          <Button onClick={this.hide}>Cancel</Button>
          <Button bsStyle='success' onClick={this.import}>import</Button>
        </ModalFooter>
      </Modal>
    );
  },
});

const CheckinList = React.createClass({
  modals: {},

  getDefaultProps() {
    return {
      competitionEvents: [],
      registrations: [],
    };
  },

  getInitialState() {
    return {
      selectedRegistration: null,
    };
  },

  componentDidMount() {
    let checkinTable = ReactDOM.findDOMNode(this.refs.checkinTable);
    let $checkinTable = $(checkinTable);
    makeTableSticky($checkinTable);
  },

  componentWillUpdate(nextProps, nextState) {
    let checkinTable = ReactDOM.findDOMNode(this.refs.checkinTable);
    let $checkinTable = $(checkinTable);
    $checkinTable.find('thead tr th').css({ minWidth: "", maxWidth: "" });
    makeTableNotSticky($checkinTable);
  },

  componentDidUpdate(prevProps, prevState) {
    let checkinTable = ReactDOM.findDOMNode(this.refs.checkinTable);
    let $checkinTable = $(checkinTable);
    makeTableSticky($checkinTable);
  },

  componentWillUnmount() {
    let checkinTable = ReactDOM.findDOMNode(this.refs.checkinTable);
    let $checkinTable = $(checkinTable);
    makeTableNotSticky($checkinTable);
  },

  registeredCheckboxToggled(registration, eventCode) {
    Meteor.call('toggleEventRegistration', registration._id, eventCode, function(error) {
      if(error) {
        bootbox.alert(`Error changing registration: ${error.reason}`);
      }
    });
  },

  checkInClicked(registration, e) {
    Meteor.call('checkInRegistration', registration._id, !registration.checkedIn, function(error) {
      if(error) {
        bootbox.alert(`Error checking in: ${error.reason}`);
      }
    });
  },

  handleEditRegistration(registration) {
    AutoForm.resetForm('editRegistrationForm');
    this.modals.editRegistration.show(registration);
    // this.setState({ selectedRegistration: registration });
    // $("#modalEditRegistration").modal('show');
  },

  addCompetitor() {
    AutoForm.resetForm('editRegistrationForm');
    // this.setState({ selectedRegistration: { competitionId: this.props.competitionId } });
    this.modals.editRegistration.show({ competitionId: this.props.competitionId });
    // $("#modalEditRegistration").modal('show');
  },

  render() {
    let {competitionId, competitionEvents, registrations} = this.props;

    return (
      <div className="container-fluid">
        <table id="checkinTable" className="table table-striped table-hover" ref="checkinTable">
          <thead>
            <tr>
              <th>Name</th>
              <th className="text-nowrap">WCA ID</th>
              <th>Gender</th>
              <th>Birthday</th>
              {competitionEvents.map(eventCode => {
                return (
                  <th key={eventCode} className="text-center">
                    <span className={"cubing-icon icon-" + eventCode} alt={eventCode}></span><br />
                    <span>{eventCode}</span>
                  </th>
                );
              })}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {registrations.map(registration => {
              let eventTds = [];
              competitionEvents.forEach(eventCode => {
                let registeredForEvent = _.contains(registration.registeredEvents, eventCode);

                let classes = classNames({
                  'text-center': true,
                });
                let onChange = this.registeredCheckboxToggled.bind(null, registration, eventCode);
                eventTds.push(
                  <td key={eventCode} className={classes}>
                    <input type="checkbox" checked={registeredForEvent} onChange={onChange} />
                  </td>
                );
              });

              let checkinButtonText = registration.checkedIn ? "Un-check-in" : "Check-in";
              let onClick = this.checkInClicked.bind(null, registration);
              let style = {};
              let checkinButton = (
                <button type="button"
                        className="btn btn-default btn-xs"
                        style={style}
                        onClick={onClick}>
                  {checkinButtonText}
                </button>
              );

              let handleEditRegistration = this.handleEditRegistration.bind(null, registration);
              let gender = registration.gender ? wca.genderByValue[registration.gender].label : '';
              return (
                <tr key={registration._id}>
                  <td className="uniqueName">{registration.uniqueName}</td>
                  <td className="wcaId">{registration.wcaId}</td>
                  <td className="gender">{gender}</td>
                  <td className="dob text-nowrap">
                    {formatMomentDateIso8601(moment(registration.dob))}
                  </td>
                  {eventTds}
                  <td className="text-nowrap">
                    <button type="button"
                            name="buttonEditRegistration"
                            className="btn btn-default btn-xs"
                            onClick={handleEditRegistration}>
                      <span className="glyphicon glyphicon-wrench"></span>
                    </button>
                    {checkinButton}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <ImportRegistrationModal competitionId={competitionId} ref={(ref) => this.modals.importRegistration = ref}/>
        <EditRegistrationModal competitionId={competitionId} ref={ref => this.modals.editRegistration = ref}/>

        <span className="extraButtons">
          <span data-toggle="modal" data-target="#modalImportRegistrations">
            <span className="extraButton import" data-toggle="tooltip" data-placement="top" title="Import registrations" onClick={() => this.modals.importRegistration.show()}/>
          </span>
          <span className="extraButton add" data-toggle="tooltip" data-placement="top" title="Add new competitor" onClick={() => this.addCompetitor()}/>
        </span>
      </div>
    );
  }
});

export default createContainer((props) => {
  Meteor.subscribe('competition', props.competitionUrlId);
  Meteor.subscribe('competitionRegistrations', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  let registrations = Registrations.find({ competitionId: competitionId }, { sort: { uniqueName: 1 } }).fetch();
  let competitionEvents = competition ? competition.getEventCodes() : [];

  return { competitionId, registrations, competitionEvents };
}, CheckinList);
