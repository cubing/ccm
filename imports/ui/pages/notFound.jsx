import React from 'react';
import ReactDOM from 'react-dom';

export default React.createClass({
  render() {
    return (
      <div className='container'>
        <h1>{404}</h1>
        <p>{this.props.message}</p>
      </div>
    );
  }
});
