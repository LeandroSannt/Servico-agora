import React from "react";
import {Container }from './styles'
import {Link} from 'react-router-dom'
import {IconBaseProps} from 'react-icons'
import {Icon}  from '../Icon';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiXCircle,
} from 'react-icons/fi';

interface iconProps{
  active:boolean;
  id:string;
  link:string;
  label:string;
  isAdmin:boolean;
  iconName?:'action' | 'comedy' | 'documentary' | 'drama' | 'horror' | 'family' | 'comida';

}

interface LikPagesProps{
  isAdmin?:boolean;
  list:iconProps[]
}

const LinkPages: React.FC<LikPagesProps> = ({list}) => {

  return(
    <Container>
      {list.map((item) => {
        if(item.isAdmin === true){
          return(
            <li key={item.id} >
              <Link to={item.link}>
                <FiXCircle size={30}/>
                 <span className="links_name">{item.label}</span>
              </Link>
              <span className="tooltip">{item.label}</span>  
            </li>
          )
        } 
      })}
    </Container>
  )
}

export default LinkPages;
