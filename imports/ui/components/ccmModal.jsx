import React from 'react';
import {Modal, ModalBody, ModalHeader, ModalTitle, ModalFooter, Button} from 'react-bootstrap';

const CCMModal = React.createClass({
  getInitialState() {
    return {
      show: false
    };
  },

  show() {
    this.setState({ show: true });
  },

  close() {
    this.setState({ show: false });
  },

  render() {
    return (
      <Modal show={this.state.show} onHide={this.hide}>
        <ModalHeader>
          <button type="button" className="close" data-dismiss="modal" onClick={this.close}>
            <span aria-hidden="true">&times;</span>
            <span className="sr-only">Cancel</span>
          </button>

          <ModalTitle>{this.props.header}</ModalTitle>
        </ModalHeader>

        <ModalBody>
          {this.props.children}
        </ModalBody>

        {this.props.footer ?
          <ModalFooter>{this.props.footer}</ModalFooter> :
          <ModalFooter>
            <Button onClick={this.props.close || this.close}>Close</Button>
            <Button bsStyle="success" onClick={this.props.save || this.props.close}>Save</Button>
          </ModalFooter>
        }
      </Modal>
    );
  }
});

export default CCMModal;
