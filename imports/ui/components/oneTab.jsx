import React from 'react';
import {createContainer} from 'meteor/react-meteor-data';

export default React.createClass({
  getDefaultProps() {
    return {
      active: false,
      otherClass: '',
      leaf: true,
      title: '',
      route: null,
      img: false,
      icon: '',
      text: '',
    };
  },

  render() {
    let {active, otherClass, leaf, title, route, competitionUrlId, img, icon, text} = this.props;

    return (
      <li className={`${active ? 'active ' : ''}${otherClass ? otherClass : ''} ${leaf ? 'leaf' : ''}`}>
        <a href={FlowRouter.path(route, {competitionUrlId: competitionUrlId})}
          data-toggle="tooltip" data-placement="bottom" data-container="body" title={title}>
          {img ? <img src={icon}/> : <span className={icon}/>}
          <span className="hidden-xs"> {text}</span>
        </a>
      </li>
    );
  }
});