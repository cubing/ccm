Template.editStaff.rendered = function() {
  let template = this;
  template.autorun(() => {
    let data = Template.currentData();
    ReactDOM.render(
      <StaffList competitionId={data.competitionId} />,
      template.$(".reactRenderArea")[0]
    );
  });
};
Template.editStaff.destroyed = function() {
  let template = this;
  let unmounted = ReactDOM.unmountComponentAtNode(
    template.$(".reactRenderArea")[0]
  );
  assert(unmounted);
};

Template.modalAddStaff.created = function() {
  let template = this;
  template.isSaveableReact = new ReactiveVar(false);
};
Template.modalAddStaff.rendered = function() {
  let template = this;
  enableWcaUserSelect(template.$('.select-user'));
};
Template.modalAddStaff.helpers({
  saveable() {
    let template = Template.instance();
    return template.isSaveableReact.get();
  },
});
function selectUserChanged($input, template) {
  let selectize = $input[0].selectize;
  let value = selectize.getValue();
  // If selectize.$control_input has text in it, then we are in the middle of
  // selecting a user.
  template.isSaveableReact.set(value.length > 0 && selectize.$control_input.val().length === 0);
}
Template.modalAddStaff.events({
  'input .select-user': function(e, template) {
    selectUserChanged(template.$('input.select-user'), template);
  },
  'change .select-user': function(e, template) {
    selectUserChanged(template.$('input.select-user'), template);
  },
  'click button[type="submit"]': function(e, template) {
    let $input = template.$('input.select-user');
    let selectize = $input[0].selectize;
    
    let wcaUserIds = selectize.getValue().split(",");
    let data = Template.parentData(1);
    Meteor.call('addStaffMembers', data.competitionId, wcaUserIds, function(error) {
      if(error) {
        bootbox.alert(`Error adding staff members: ${error.reason}`);
      } else {
        selectize.clear();
        $("#modalAddStaff").modal('hide');
      }
    });
  },
});

let StaffList = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    let staff = Registrations.find({
      competitionId: this.props.competitionId,
      roles: {
        $exists: 1
      },
    }, {
      sort: {
        uniqueName: 1
      }
    }).fetch();
    return {
      staff: staff,
      currentUserId: Meteor.userId(),
    };
  },

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
    classesForRole = (role, staff=null) => {
      let classes = {
        'staff-role': true,
      };
      if(this.state.hoveredRoleName && (staff === null || staff._id === this.state.staffId)) {
        classes['staff-role-hovered'] = this.state.hoveredRoleName === role.name;
        classes['staff-role-granted-by-hovered'] = role.isDescendentOfAny({ [this.state.hoveredRoleName]: true });
      }
      return classNames(classes);
    };
    return (
      <div>
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
            {this.data.staff.map(staff => {
              let removeStaffButtonClasses = classNames({
                'btn': true,
                'btn-xs': true,
                'btn-danger': staff.actuallyHasStaffRoles(),
              });
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
                        <input type="checkbox" disabled={role.isDescendentOfAny(staff.roles) || staff.userId === this.data.currentUserId} checked={role.isOrIsDescendentOfAny(staff.roles || {})} onChange={onChange} />
                      </td>
                    );
                  })}
                  <td>
                    <button type="button" className={removeStaffButtonClasses} onClick={this.removeStaffMember.bind(null, staff)}>
                      <span className="fa fa-remove"></span> Remove from staff
                    </button>
                  </td>
                  <td></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  },
});
