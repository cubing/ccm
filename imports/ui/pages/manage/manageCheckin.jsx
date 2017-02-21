import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import {Button, ControlLabel, Form, FormGroup, FormControl, Glyphicon} from 'react-bootstrap';
import DatePicker from 'react-bootstrap-date-picker'
import Select from 'react-select';
import CCModal from '../../components/ccmModal';

const Countries = countries.map(c => ({value: c.alpha2, label: `${c.name} (${c.alpha2})`})); // for react-select

const EditRegistrationModal = React.createClass({
  getInitialState() {
    return {
      _id: undefined,
      competitionId: '',
      userId: '',
      uniqueName: '',
      wcaId: '',
      countryId: '',
      gender: '',
      dob: ''
    };
  },

  reset() {
    this.setState(this.getInitialState());
  },

  show(selectedRegistration) {
    this.setState(selectedRegistration);
    this.modal.show();
  },

  save() {
    let modal = this.modal;

    Meteor.call('addEditRegistration', this.state, function (error) {
      modal.close();
    });
  },

  close() {
    this.reset();
    this.modal.close();
  },

  delete() {
    let { _id } = this.state;
    let modal = this.modal;

    let confirmStr = `Are you sure you want to delete the registration for ${this.state.uniqueName}?`;
    bootbox.confirm(confirmStr, confirm => {
      if(confirm) {
        Meteor.call('deleteRegistration', _id, function(error) {
          if(error) {
            bootbox.alert(`Error deleting registration: ${error.reason}`);
          } else {
            modal.close();
          }
        });
      }
    });
  },

  render() {
    let { _id, competitionId, userId, uniqueName, wcaId, countryId, gender, dob } = this.state;
    let header = _id ? `Edit registration for ${uniqueName}` : 'Add new competitor';

    let footer = [
      _id ? <Button key={0} className='pull-left' bsStyle='danger' onClick={this.delete}><Glyphicon glyph='trash'/> Delete registration</Button> : null,
      <Button key={1} onClick={this.close}>Cancel</Button>,
      <Button key={2} bsStyle='success' onClick={this.save}>{_id ? 'Save' : 'Add'}</Button>
    ];

    return (
      <CCModal ref={modal => this.modal = modal} close={this.close} header={header} footer={footer}>
        <Form>
          <FormGroup>
            <ControlLabel>Unique Name</ControlLabel>
            <FormControl type='text' placeholder='Feliks Zemdegs' value={uniqueName} onChange={event => this.setState({ uniqueName: event.target.value })}/>
          </FormGroup>
          <FormGroup>
            <ControlLabel>WCA Id</ControlLabel>
            <FormControl type='text' placeholder='2009ZEMD01' value={wcaId} onChange={event => this.setState({ wcaId: event.target.value })}/>
          </FormGroup>
          <FormGroup>
            <ControlLabel>Country</ControlLabel>
            <Select options={Countries} value={countryId} onChange={country => this.setState({ countryId: country.value })}/>
          </FormGroup>
          <FormGroup>
            <ControlLabel>Gender</ControlLabel>
            <Select options={wca.genders} value={gender} onChange={country => this.setState({ gender: country.value })}/>
          </FormGroup>
          <FormGroup>
            <ControlLabel>Birthdate</ControlLabel>
            <DatePicker id='dobPicker' value={dob ? dob.toISOString() : undefined} onChange={value => {this.setState({ dob: new Date(value) });}} style={{zIndex: 0}}/>
          </FormGroup>
        </Form>
      </CCModal>
    );
  }
});

const ImportRegistrationModal = React.createClass({
  getInitialState() {
    return {
      registrationJson: {},
      registrationJsonError: null,
    };
  },

  show() {
    this.setState(this.getInitialState());
    this.modal.show();
  },

  close() {
    this.modal.close();
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
    let { show } = this.state;

    let footer = [
      <Button key={0} onClick={this.close}>Cancel</Button>,
      <Button key={1} bsStyle='success' onClick={this.import}>Import</Button>
    ];

    return (
      <CCModal ref={modal => this.modal = modal} onHide={this.close} footer={footer} header='Import Registration'>
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
      </CCModal>
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
    this.modals.editRegistration.show(registration);
  },

  addCompetitor() {
    this.modals.editRegistration.show({ competitionId: this.props.competitionId });
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
  Subs.subscribe('competition', props.competitionUrlId);
  Subs.subscribe('competitionRegistrations', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let competition = Competitions.findOne(competitionId);

  let registrations = Registrations.find({ competitionId: competitionId }, { sort: { uniqueName: 1 } }).fetch();
  let competitionEvents = competition ? competition.getEventCodes() : [];

  return { competitionId, registrations, competitionEvents };
}, CheckinList);
