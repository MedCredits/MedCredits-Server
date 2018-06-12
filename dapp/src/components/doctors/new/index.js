import React, { Component } from 'react';
import RegisterDoctor from './RegisterDoctor';
import { MainLayout } from '~/layouts/MainLayout';

class AddDoctor extends Component {
  render() {
    return (
      <MainLayout>
        <RegisterDoctor />
      </MainLayout>
    );
  }
}

export default AddDoctor;
