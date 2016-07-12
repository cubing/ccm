import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import {Modal, ModalBody, ModalHeader, ModalTitle, ModalFooter, InputGroup, FormControl, Button} from 'react-bootstrap';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import getUsers from '/imports/lib/getWcaUsers';

const AddStaffModal = React.createClass({
  getInitialState() {
    return {
      show: this.props.show,
      val: '',
    };
  },

  show() {
    this.setState({ show: true, val: '' });
  },

  hide() {
    this.setState({ show: false, val: '' });
  },

  addStaff() {
    let wcaUserIds = this.state.val.map(i => i.profile);
    console.log(72, 'adding', wcaUserIds);

    // Meteor.call('addStaffMembers', this.props.competitionId, wcaUserIds, function(error) {
    //   if(error) {
    //     console.error(`Error adding staff members: ${error.reason}`);
    //   } else {
    //     this.hide();
    //   }
    // }, this);
  },

  loadOptions(input, callback) {
    if(!input || input.length < 2) {
      callback();
      return null;
    }

    getUsers(input, function(err, res) {
      let options = _.chain(res)
        .map(i => ({value: i.id, label: `${i.name}`, profile: i}))
        .value();

      if(!err && res) {
        callback(null, {
          options: options,
          complete: true,
        });
      }
    });
  },

  render() {
    return (
      <Modal show={this.state.show} onHide={this.hide}>
        <ModalHeader>
          <ModalTitle>Add Staff Members</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <InputGroup>
            <Select.Async name="selectStaff" ref='select' multi value={this.state.val} loadOptions={this.loadOptions} onChange={val => this.setState({ val })}/>
            <InputGroup.Button>
              <Button onClick={this.addStaff}>Add</Button>
            </InputGroup.Button>
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <Button onClick={this.hide}>Close</Button>
        </ModalFooter>
      </Modal>
    );
  }
});

const StaffList = React.createClass({
  modals: {},

  getInitialState() {
    return {
      hoveredRoleName: null,
      staffId: null,
    };
  },

  roleInputChanged(staff, role, e) {
    let input = e.currentTarget;
    Meteor.call('setStaffRole', staff._id, role.name, input.checked);
  },

  mouseEnterRole(role, staff) {
    this.setState({ hoveredRoleName: role.name, staffId: staff._id });
  },

  mouseLeaveRole(role, staff) {
    this.setState({ hoveredRoleName: null, staffId: null });
  },

  removeStaffMember(staff) {
    if(staff.actuallyHasStaffRoles()) {
      let confirmStr = `Are you sure you want to remove ${staff.uniqueName} from staff?`;
      bootbox.confirm(confirmStr, yes => {
        if(yes) {
          Meteor.call('removeStaffMember', staff._id);
        }
      });
    } else {
      Meteor.call('removeStaffMember', staff._id);
    }
  },

  render() {
    let classesForRole = (role, staff) => {
      let classes = {
        'staff-role': true,
      };
      if(this.state.hoveredRoleName && (staff && staff._id === this.state.staffId)) {
        classes['staff-role-hovered'] = this.state.hoveredRoleName === role.name;
        classes['staff-role-granted-by-hovered'] = role.isDescendentOfAny({ [this.state.hoveredRoleName]: true });
      }
      return classNames(classes);
    };

    return (
      <div className='container'>
        <table className="table staff-table">
          <thead>
            <tr>
              <th>Name</th>
              {RoleHeirarchy.allRoles.map(role => {
                return <th key={role.name}><div><span className={classesForRole(role)}>{role.name}</span></div></th>;
              })}
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {this.props.staff.map(staff => {
              let removeStaffButtonClasses = classNames({
                'btn': true,
                'btn-xs': true,
                'btn-danger': staff.actuallyHasStaffRoles(),
              });
              let removeFromStaffButton;
              if(staff.userId === Meteor.userId()) {
                removeFromStaffButton = null;
              } else {
                removeFromStaffButton = (
                  <button type="button" className={removeStaffButtonClasses} onClick={this.removeStaffMember.bind(null, staff)}>
                    <span className="fa fa-remove"></span> Remove from staff
                  </button>
                );
              }
              return (
                <tr key={staff._id}>
                  <td>{staff.uniqueName}</td>
                  {RoleHeirarchy.allRoles.map(role => {
                    let onChange = this.roleInputChanged.bind(null, staff, role);
                    let onClick = function(e) {
                      let input = $(e.currentTarget).find('input')[0];
                      if(input == e.target) {
                        // Ignore direct clicks on the checkbox, those are handled by the
                        // onChange event listener.
                        return;
                      }
                      input.checked = !input.checked;
                      onChange({ currentTarget: input });
                    };
                    return (
                      <td key={role.name} className={classesForRole(role, staff)} onMouseEnter={this.mouseEnterRole.bind(null, role, staff)} onMouseLeave={this.mouseLeaveRole.bind(null, role, staff)} onClick={onClick}>
                        <input type="checkbox" disabled={role.isDescendentOfAny(staff.roles) || staff.userId === this.props.currentUserId} checked={role.isOrIsDescendentOfAny(staff.roles || {})} onChange={onChange} />
                      </td>
                    );
                  })}
                  <td>
                    {removeFromStaffButton}
                  </td>
                  <td></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <AddStaffModal ref={(ref) => this.addStaffModal = ref}/>

        <span className="extraButtons">
          <span data-toggle="modal" data-target="#modalAddStaff">
            <span className="extraButton add" data-toggle="tooltip" data-placement="top" title="Add staff members" onClick={() => this.addStaffModal.show()}/>
          </span>
        </span>

      </div>
    );
  },
});

export default createContainer((props) => {
  let sub = Meteor.subscribe('competitionRegistrations', props.competitionUrlId);
  let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
  let staff = Registrations.find({
    competitionId: props.competitionUrlId,
    roles: {
      $exists: 1
    },
  }, {
    sort: {
      uniqueName: 1
    }
  }).fetch();

  return {
    competitionId: competitionId,
    staff: staff,
    currentUserId: Meteor.userId(),
  };
}, StaffList);
