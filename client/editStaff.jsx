// <<< To create an OAuth account on someone's behalf:
//  Meteor.users.insert({services: {worldcubeassociation: {id: 6145}}, emails: [], createdAt: new Date(), siteAdmin: true})

Template.editStaff.rendered = function() {
  let template = this;
  template.autorun(() => {
    let data = Template.currentData();
    React.render(
      <StaffList competitionId={data.competitionId} />,
      template.$(".reactRenderArea")[0]
    );
  });
};
Template.editStaff.destroyed = function() {
  let template = this;
  let unmounted = React.unmountComponentAtNode(
    template.$(".reactRenderArea")[0]
  );
  assert(unmounted);
};

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
    return { staff };
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
            </tr>
          </thead>
          <tbody>
            {this.data.staff.map(staff => {
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
                        <input type="checkbox" disabled={role.isDescendentOfAny(staff.roles)} checked={role.isOrIsDescendentOfAny(staff.roles || {})} onChange={onChange} />
                      </td>
                    );
                  })}
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
// TODO - make it possible to add new staff
// TODO - make it possible to delete staff
