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
    let close = this.props.close || this.close;
    let save = this.props.save || this.save;

    return (
      <Modal show={this.state.show} onHide={this.props.onHide || close}>
        <ModalHeader>
          <button type="button" className="close" data-dismiss="modal" onClick={close}>
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
            <Button onClick={close}>Close</Button>
            <Button bsStyle="success" onClick={save}>Save</Button>
          </ModalFooter>
        }
      </Modal>
    );
  }
});

export default CCMModal;
