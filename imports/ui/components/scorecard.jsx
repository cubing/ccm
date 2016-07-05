import React from 'react';

const Scorecard = React.createClass({
  getDefaultProps () {
    return {
      width: '49%',
      height: '49%'
    }
  },
  
  render () {
    const {competitionName, name, wcaid, event, round} = this.props;
 
    return (
      <div style={{border: '1px solid black', width: this.props.width, height: this.props.height, margin: '.5%', display: 'inline-block'}}>
        <div style={{padding: '.5%', height: '25%'}}>
          <h3 style={{textAlign: 'center'}}>{competitionName}</h3>
          <b><p>{name}  <span style={{margin: '.5in'}}>{wcaid}</span>  <span style={{float: 'right', paddingRight: '.25in'}}>{event} {round}</span></p></b>
        </div>
        <table style={{width: '100%', height: '75.5%', borderCollapse: 'collapse'}}>
          <tr>
            <th style={{width: '2em'}}></th>
            <th>Result</th>
            <th style={{width: '.5in'}}>Judge</th>
            <th style={{width: '.5in'}}>Comp</th>
          </tr>
          <tr><td>1</td><td/><td/><td/></tr>
          <tr><td>2</td><td/><td/><td/></tr>
          <tr><td>3</td><td/><td/><td/></tr>
          <tr><td>4</td><td/><td/><td/></tr>
          <tr><td>5</td><td/><td/><td/></tr>
          <tr><td>E</td><td/><td/><td/></tr>
        </table>
      </div>
    );
  }
});

export default Scorecard;