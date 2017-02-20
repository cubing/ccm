import React from 'react';

export default function(props) {
  return (
    <nav className="navbar navbar-default navbar-plain-rectangle" role="navigation">
      <div className="container-fluid">
        <div className="navbar-collapse collapse-buttons">
          <ul className="nav navbar-nav navbar-left">
            {props.children}
          </ul>
        </div>
      </div>
    </nav>
  );
};
