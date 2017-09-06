import React from 'react';
import { Accounts } from 'meteor/std:accounts-ui';
import {createContainer} from 'meteor/react-meteor-data';
import ccmModal from '../components/ccmModal';
import OneTab from '../components/oneTab';
import Navbar from '../components/navbar';

isActiveRoute = (route) => FlowRouter.current().route.name === route;
isActiveGroup = (route) => FlowRouter.current().route.group && FlowRouter.current().route.group.name === route;
isActiveOrAncestorRoute = () => false;

const LoginButtonsLoggedOutAllServices = function(props) {
  let {user} = props;
  console.log(14, user);

  return (
    <div>
      <p className="text-center">
        <a href={FlowRouter.path('editProfile')}>Your profile</a>
      </p>

      {user && user.siteAdmin ?
        <p className="text-center">
          <a href={FlowRouter.path('administerSite')}>Administer site</a>
        </p> :
      null}

      {user && !user.emails[0].verified ?
        <button className="btn btn-danger btn-block" id="login-buttons-resend-emailverification"
                data-toggle="tooltip" data-placement="bottom" data-container="body"
                title="Your email address has not yet been verified">
          Resend verification email
        </button> :
    null}
    </div>
  );
};

const Layout = React.createClass({
  getDefaultProps() {
    return {
      competitionId: null,
      competitionUrlId: null,
      user: Meteor.user(),
    };
  },

  getInitialState() {
    return {
      verificationSendSuccessReact: false,
    };
  },

  showManageCompetitionLink() {
    let competition = Competitions.findOne(this.competitionId);
    return competition.userIsStaffMember(Meteor.userId());
  },

  verificationSendSuccess() {
    return verificationSendSuccessReact.get();
  },

  newCompetitionTab() {
    return {
      route: 'newCompetition',
      title: 'New competition',
      icon: 'glyphicon glyphicon-plus',
    };
  },

  render() {
    let {user, competitionUrlId={competitionUrlId}, competitionId, competitionName, tabs, content} = this.props;
    let showManageCompetitionLink = true;

    return (
      <div>
        <BlazeToReact wrapperTag='div' blazeTemplate='connectionBanner'/>

        <nav className="navbar navbar-default navbar-plain-rectangle" role="navigation">
          <div className="container-fluid">
            {/* Brand and toggle get grouped for better mobile display */}
            <div className="navbar-header">
              <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1">
                <span className="sr-only">Toggle navigation</span>
                <span className="icon-bar"></span>
                <span className="icon-bar"></span>
                <span className="icon-bar"></span>
              </button>

              <ul className="nav navbar-nav navbar-brand">
                <li key={3} className={`${isActiveRoute('home') ? 'active' : ''} leaf`}>
                  <a href="/">
                    <img alt="CCM" src="/img/ccm_logo.svg"/>
                  </a>
                </li>

                {competitionId ?
                  [<li key={0} className={isActiveGroup('competition') ? 'active' : ''} id="competition-name">
                    <a href={FlowRouter.path('competition', {competitionUrlId: competitionId})}>{competitionName}</a>
                  </li>,
                  user && showManageCompetitionLink ?
                    <li key={1} className={isActiveGroup('manage') ? 'active' : ''}>
                      <a href={FlowRouter.path('manageCompetition', {competitionUrlId: competitionId})}><i className="fa fa-cogs"/></a>
                    </li> :
                  null] :
                null}
              </ul>
            </div>

          {/* Collect the nav links, forms, and other content for toggling */}
            <div className="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
              <ul className="nav navbar-nav navbar-right">
                {user ?
                  <OneTab {...this.newCompetitionTab()}/> :
                null}
                {!user ? <li><a href='/login'>Login</a></li> :
                  <li className="dropdown">
                    <a className="dropdown-toggle" data-toggle="dropdown">{user.profile.name}
                    <span className="caret"></span></a>
                    <ul className="dropdown-menu">
                      <li className="text-center">
                        <a href={FlowRouter.path('editProfile')}>Your profile</a>
                      </li>
                      {user.siteAdmin ?
                        <li className="text-center">
                          <a href={FlowRouter.path('administerSite')}>Administer site</a>
                        </li> :
                      null}
                      <li><a href="/logout">Sign out</a></li>
                    </ul>
                  </li>
                }
                
              </ul>
            </div> {/* /.navbar-collapse */}
           </div>
        </nav>

        {tabs ?
          <Navbar>
            {tabs.map((tab, index) => <OneTab key={index} competitionUrlId={competitionUrlId} {...tab} active={isActiveRoute(tab.route)}/>)}
          </Navbar> :
        ''}


        {content}

        <footer className="footer">
          <div className="container">
            <p className="text-muted">Powered by <a target="_blank" href="https://github.com/cubing/ccm">CCM</a></p>
          </div>
        </footer>
      </div>
    );
  }
});

export default createContainer((props) => {
  if(props.competitionUrlId) {
    let subscription = Subs.subscribe('competition', props.competitionUrlId);
    let competitionId = api.competitionUrlIdToId(props.competitionUrlId);
    let competition = Competitions.findOne(competitionId);

    return {
      user: Meteor.user(),
      competitionId: competitionId,
      competitionUrlId: props.competitionUrlId,
      competitionName: competition ? competition.competitionName : null,
    };
  } else {
    return {
      user: Meteor.user()
    };
  }
}, Layout);

$(`[data-toggle='tooltip']`).mouseover(function(e) {
  // Bootstrap's tooltips are opt in. Here we lazily enable it on all
  // elements with a data-toggle="tooltip" attribute.
  let $target = $(e.currentTarget);
  if(!$target.data("tooltip-applied")) {
    $target.tooltip('show');
    $target.data("tooltip-applied", "true");

    // When this DOM element is removed, we must remove the corresponding
    // tooltip element.
    let observer = new MutationObserver(function(mutations) {
      mutations.forEach(mutation => {
        if(!document.body.contains($target[0])) {
          // $target has been removed from the DOM
          let tipId = $target.attr('aria-describedby');
          let $tip = $('#' + tipId).remove();
          observer.disconnect();
        }
      });
    });
    observer.observe($target.parent()[0], { childList: true });
  }
});

$(`[data-toggle='popover']`).popover(function(e) {
  let $target = $(e.currentTarget);
  if(!$target.data("popover-applied")) {
    $target.popover();
    $target.data("popover-applied", "true");
    // NOTE: we're not currently handling the case where a popup is showing
    // as the DOM element that triggered it goes away, as we are handling
    // for tooltips above.
  }
});
