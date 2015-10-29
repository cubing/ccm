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
    let staff = Registrations.find({ competitionId: this.props.competitionId, roles: { $exists: 1 } }).fetch();
    return { staff };
  },

  roleInputClicked(staff, role, e) {
    let input = e.currentTarget;
    Meteor.call('setStaffRole', staff._id, role.name, input.checked);
  },

  render() {
    return (
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Name</th>
            {RoleHeirarchy.allRoles.map(role => <th key={role.name}>{role.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {this.data.staff.map(staff => {
            return (
              <tr key={staff._id}>
                <td>{staff.user().profile.name}</td>
                {RoleHeirarchy.allRoles.map(role => {
                  return (
                    <td key={role.name}>
                      <input type="checkbox" checked={staff.roles && staff.roles[role.name]} onChange={this.roleInputClicked.bind(null, staff, role)} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  },
});
// TODO - sort staff by name
// TODO - autoset/disable descendent roles
// TODO - make it possible to add new staff
// TODO - make it possible to delete staff
