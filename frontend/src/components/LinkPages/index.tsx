/* eslint-disable no-unused-expressions */
/* eslint-disable consistent-return */
/* eslint-disable array-callback-return */
import react, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiXCircle } from 'react-icons/fi';
import { Container } from './styles';
import Dropdown from './Dropdown';

interface iconProps {
  active: boolean;
  id: string;
  link: string;
  label: string;
  isAdmin: boolean;
  iconName?:
    | 'action'
    | 'comedy'
    | 'documentary'
    | 'drama'
    | 'horror'
    | 'family'
    | 'comida';
}

interface PropsDropdown {
  id: string;
  label: string;
  link: string;
}

export interface LikPagesProps {
  isAdmin?: boolean;
  list: iconProps[];
  dropdown?: PropsDropdown[];
}

interface teste {
  testess: iconProps[];
}

const LinkPages: React.FC<LikPagesProps> = ({ list }) => {
  const [newArray, setNewArray] = useState<LikPagesProps[]>([]);

  const itensDrop = [
    { id: '1', link: 'page/1', label: 'drop1' },
    { id: '2', link: 'page/2', label: 'drop2' },
    { id: '3', link: 'page3', label: 'drop3' },
  ];

  const drop: LikPagesProps[] = [];

  return (
    <Container>
      {list.map((item) => {
        if (item.isAdmin === true) {
          return (
            <react.Fragment key={item.id}>
              <li>
                <Link to={item.link}>
                  <FiXCircle size={30} />
                  <span className="links_name">{item.label}</span>
                </Link>
                <span className="tooltip">{item.label}</span>
              </li>
              <div className="dropdown">
                <Dropdown idDrop={item.label} itensDropProps={itensDrop} />
              </div>
            </react.Fragment>
          );
        }
      })}
    </Container>
  );
};

export default LinkPages;
