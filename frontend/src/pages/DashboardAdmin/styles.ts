import styled from 'styled-components'


export const Container = styled.div`

  height: 100%;
  width: 78px;
  position: fixed;
  top: 0;
  left: 0;
  background: #11101d;
  padding: 6px 14px;
  transition: all 0.5s ease;
  font-family: 'Roboto', sans-serif;




&.active {
  width: 240px;

}

& .logo_content .logo{
  color:#fff;
  display: flex;
  height: 50px;
  width: 100%;
  align-items: center;
  pointer-events: none;
  opacity: 0;
  pointer-events: none;
}



&.active .logo_content .logo{
  opacity: 1;
  pointer-events: none;

}


.logo_content .logo svg{
font-size:28px;
margin-right: 5px;

}

.logo_content .logo .logo_name{
  font-size:20px;
  font-weight: 400;
}

& #btn{
  position: absolute;
  color:#fff;
  top: 6px;
  left: 50%;
  font-size: 20px;
  height:50px;
  width:50px;
  text-align: center;
  line-height:50px;

  transform: translateX(-50%);

  cursor: pointer;

}


&.active #btn{
  left: 90%;

}


& ul{
  margin-top: 20px;
}

& ul li {
  position: relative;
  height:50px;
  width:100%;
  min-width: 150px;
  margin: 0 5px;
  list-style: none;
  line-height:50px ;
  font-size:16px

}

& ul li .tooltip{
  position: absolute;
  left:70px;
  top:0;
  transform:translateY(-50%);
  border-radius: 6px;
  height:35px;
  width: 122px;
  background: #fff;
  line-height:35px ;
  text-align: center;
  box-shadow: 0 5px 10px rgba(0,0,0,0.2);
  transition: 0s;
  opacity: 0;
  pointer-events: none;
  display: block;

}

&.active ul li .tooltip{
  display: none;

}

& ul li:hover .tooltip{
  top:50% ;
  opacity:1;
  transition: all 0.5s ease;

}

& ul li .bx-search {
  position: absolute;
  z-index: 99;
  color: #fff;
  font-size:22px ;
  transition:all 0.5 ease;
}

& ul li .bx-search:hover{
  background: #fff;
  color: #1d1b31;
}

& ul li a{
  color: #fff;
  display: flex;
  align-items: center;
  justify-content:space-between;
  text-decoration: none;
  transition: all 0.4s ease;
  border-radius:12px ;
  white-space: nowrap;
  width: 100%;
  flex: 1;

}

&.active ul li a {
  width:100%
}

& ul li a:hover{
  color:#11101d;
  background:#fff;

}

&.active ul li a:hover{

  color:#11101d;
  background:#fff;

}

& ul li svg {
 
  border-radius:12px;
  line-height:50px;
  text-align: center;
}

& .links_name{
  opacity:0;
  pointer-events: none;
}


&.active .links_name{
  opacity:1;
  pointer-events: auto;
  width:80%;
}


& ul input{
  position: absolute;
  height: 100%;
  width:100%;
  left: 0;
  top: 0;
  border-radius:12px ;
  outline: none;
  border: none;
  background: #1d1b31;
  padding-left: 50px;
  font-size:18px;
  color: #fff;
  display: none;

}

&.active ul input{
  display: block;
}

& .profile_content{
  position:absolute;
  color:#fff;
  bottom: 0;
  left: 0;
  width: 100%;

}

& .profile_content .profile{
  position: relative;
  padding:10px 6px;
  height:60px;
  transition:background 0.4s ease;
  background: none;
  cursor: pointer;

}

& .profile_content .profile:hover svg{
  color:rgb(173, 50, 50);
}





&.active .profile_content .profile{
  background: #1d1b31;

}

.profile_content .profile .profile_details{
  display:flex;
  align-items: center;
  pointer-events: none;
  opacity: 0;
  white-space: nowrap;


}

&.active .profile .profile_details{
  opacity:1;
  pointer-events: auto;

}

.profile .profile_details img{
  height:45px;
  width: 45px;
  object-fit: cover;
  border-radius:12px;
  margin-right: 10px;

}


.profile .profile_details .name_job{
  margin-right: 10px;

}

.profile .profile_details .name{
  font-size:15px;
  font-weight: 400;
}

.profile .profile_details .job{
  font-size:12px;
}

.profile #log_out{
  position: absolute;
  left:50%;
  bottom: 5px;
  transform: translateX(-50%);
  min-width: 50px;
  line-height:50px;
  font-size:20px;
  border-radius:12px;
  text-align: center;
  transition: all 0.4s ease;
  background: #1d1b31;


}

&.active .profile #log_out{
  left:88%;
}

&.active .profile #log_out{
  background: none;
}

.home_content{
  position: absolute;
  height:100%;
  width:calc(100% - 78px);
  left: 78px;
  transition:all 0.5s ease;
}

.home_content .text{
  font-size:25px;
  font-weight: 500;
  color: #1d1b31;
  margin: 12px;
}

&.active ~ .home_content{
  width: calc(100% - 240px);
  left:240px;
}































`
