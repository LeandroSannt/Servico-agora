import React from "react";
import {Container }from './styles'
import {Link} from 'react-router-dom'
import {IconBaseProps} from 'react-icons'
import { Icon } from '../Icon';



import {
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiXCircle,
} from 'react-icons/fi';

interface LikPagesProps{
  isAdmin?:boolean;
  list:Array<{
    active:boolean;
    link:string;
    label:string;
    c:'1'|'2'|'3';
   // iconName: 'action' | 'comedy' | 'documentary';
  }
  >
}

const LinkPages: React.FC<LikPagesProps> = ({list}) => {

  return(
    <Container>
      {list.map((item) => (
      <li>
        <Link to={item.link}>
{/*         <Icon name={item.iconName}/>
 */}          <span className="links_name">{item.label}</span>
        </Link>
        <span className="tooltip">{item.label}</span>  
      </li>
      ))}
    </Container>
  )
}

export default LinkPages;
