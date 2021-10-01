import styled from 'styled-components';

export const Content = styled.div`
  margin-left: 240px;

  width: calc(100% - 240px);
`;

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

  .logo_content {
    display: flex;
    align-items: center;
  }

  & .logo_content .logo {
    color: #fff;
    display: flex;
    height: 50px;
    width: 100%;
    align-items: center;
    pointer-events: none;
    opacity: 0;
    pointer-events: none;
  }

  &.active .logo_content .logo {
    opacity: 1;
    pointer-events: none;
  }

  .logo_content .logo svg {
    font-size: 28px;
    margin-right: 5px;
  }

  .logo_content .logo .logo_name {
    font-size: 20px;
    font-weight: 400;
    white-space: nowrap;
  }

  & #btn {
    position: absolute;
    color: #fff;
    top: 6px;
    left: 50%;
    font-size: 20px;
    height: 50px;
    width: 50px;
    text-align: center;
    line-height: 50px;

    transform: translateX(-50%);

    cursor: pointer;
  }

  &.active #btn {
    left: 90%;
  }

  &.active ul li .tooltip {
    display: none;
  }

  &.active ul li a {
    width: 100%;
  }

  &.active ul li a:hover {
    color: #11101d;
    background: #fff;
  }

  & .links_name {
    opacity: 0;
    pointer-events: none;
  }

  &.active .links_name {
    opacity: 1;
    pointer-events: auto;
    width: 80%;
  }

  & .profile_content {
    position: absolute;
    color: #fff;
    bottom: 0;
    left: 0;
    width: 100%;
  }

  & .profile_content .profile {
    display: flex;
    align-items: center;
    position: relative;
    padding: 10px 6px;
    height: 60px;
    transition: background 0.4s ease;
    background: none;
    cursor: pointer;
  }

  & .profile_content .profile:hover svg {
    color: rgb(173, 50, 50);
  }

  &.active .profile_content .profile {
    background: #1d1b31;
  }

  .profile_content .profile .profile_details {
    display: flex;
    align-items: center;
    pointer-events: none;
    opacity: 0;
    white-space: nowrap;
  }

  &.active .profile .profile_details {
    opacity: 1;
    pointer-events: auto;
  }

  .profile .profile_details img {
    height: 45px;
    width: 45px;
    object-fit: cover;
    border-radius: 12px;
    margin-right: 10px;
  }

  .profile .profile_details .name_job {
    margin-right: 10px;
  }

  .profile .profile_details .name {
    font-size: 15px;
    font-weight: 400;
  }

  .profile .profile_details .job {
    font-size: 12px;
  }

  .profile #log_out {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    min-width: 50px;
    line-height: 50px;
    font-size: 20px;
    border-radius: 12px;
    text-align: center;
    transition: all 0.4s ease;
    background: inherit;
  }

  &.active .profile #log_out {
    background: #1d1b31;

    left: 88%;
  }

  &.active .profile #log_out {
    background: none;
  }

  .home_content {
    position: absolute;
    height: 100%;
    width: calc(100% - 78px);
    left: 78px;
    transition: all 0.5s ease;
  }

  .home_content .text {
    font-size: 25px;
    font-weight: 500;
    color: #1d1b31;
    margin: 12px;
  }

  &.active ~ .home_content {
    width: calc(100% - 240px);
    left: 240px;
  }
`;
