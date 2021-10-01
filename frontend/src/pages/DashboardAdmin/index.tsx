import react from 'react';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiXCircle,
} from 'react-icons/fi';
import { MdExitToApp } from 'react-icons/md';
import { Container, Content } from './styles';
import Users from './Users';

import Sidebar from '../../components/Sidebar';

const DashboardAdmin: React.FC = () => {
  return (
    <>
      <Sidebar />
    </>
  );
};

export default DashboardAdmin;
