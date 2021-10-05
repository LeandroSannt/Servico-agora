/* eslint-disable array-callback-return */
import react from 'react';
import { Drop } from '../styles';
import LikPagesProps from '../index';

interface DropdownProps {
  idDrop: string;
  itensDropProps: Array<{
    id?: string;
    link?: string;
    label?: string;
  }>;
}

const Dropdown: React.FC<DropdownProps> = ({ itensDropProps }, { idDrop }) => {
  return (
    <Drop>
      {itensDropProps.map((item) => {
        <react.Fragment key={item.id}>
          <h1>df</h1>;
        </react.Fragment>;
      })}
    </Drop>
  );
};

export default Dropdown;
