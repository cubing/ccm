import React from 'react';
import ReactDOM from 'react-dom';
import {createContainer} from 'meteor/react-meteor-data';
import {Typeahead} from 'react-bootstrap-typeahead';
import {Table, Button, Form, FormControl, InputGroup, Glyphicon} from 'react-bootstrap';

const AdministerPage = React.createClass({
  getInitialState() {
    return {
      newAdminValue: undefined
    };
  },

  admins () {
    return Meteor.users.find({
      siteAdmin: true
    }).fetch();
  },

  addAdmin(userId) {
    Meteor.call('addSiteAdmin', userId);
    console.log(this.refs.typeahead)
    this.refs.typeahead.getInstance().clear();
    this.setState({
      newAdminValue: undefined
    });
  },

  removeAdmin(userId) {
    Meteor.call('removeSiteAdmin', userId);
    this.forceUpdate();
  },

  loadOptions(input, cb) {
    return Meteor.users.find({
      siteAdmin: false
    }).map(admin => ({id: admin._id, label: `${admin.profile.name} (${admin.emails[0].address})`}));
  },

  render() {
    const { ready, user } = this.props;
    const { newAdminValue } = this.state;

    let admins = this.admins();

    return (
      <div className='container'>
        <h4>Administer site</h4>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>WCA Id</th>
              <th>Mongo Id</th>
              <th/>
            </tr>
          </thead>

          <tbody>
            {admins.map((admin, index) => (
              <tr key={index}>
                <td>{admin.profile.name}</td>
                <td>{admin.emails[0].address}</td>
                <td>{'foo'}</td>
                <td>{admin._id}</td>
                <td width='1em'>{admin._id !== user._id ? <Button onClick={() => this.removeAdmin(admin._id)}><Glyphicon glyph='remove'/></Button> : null}</td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan='5'>
                <Form horizontal>
                  <div className='input-group' style={{width: '100%'}}>
                    <Typeahead dropup selected={this.state.newAdminValue} ref='typeahead' options={this.loadOptions()} onChange={value => this.setState({ newAdminValue: value })}/>
                    <span className='input-group-btn'>
                      <Button disabled={!this.state.newAdminValue} onClick={() => this.addAdmin(this.state.newAdminValue[0].id)} ><Glyphicon glyph='plus'/></Button>
                    </span>
                  </div>
                </Form>
              </td>
            </tr>
          </tfoot>
        </Table>
      </div>
    );
  },
});

export default createContainer((props) => {
  let sub = Subs.subscribe('allSiteAdmins')

  return {
    user: Meteor.user(),
    ready: sub.ready()
  };
}, AdministerPage);
