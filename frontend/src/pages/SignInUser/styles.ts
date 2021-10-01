import styled from 'styled-components';
import { shade } from 'polished';
import bikeimage from '../../assets/imgadm.jpg';

export const Container = styled.div`
  height: 100vh;
  display: flex;
`;

export const Content = styled.div`
  width: 100%;
  max-width: 500px;

  display: grid;
  grid-template-rows: 200px 400px;
  place-items: center;

  img {
    display: flex;
  }

  div {
    max-width: 85%;
    div {
      max-width: 100%;

      h1 {
        margin-bottom: 0.8rem;
        font-size: 3rem;
        font-weight: bold;
      }

      p {
        margin-bottom: 1.6rem;
        font-size: 1.6rem;
        color: #898080;
      }
    }
    p {
      margin-top: 0.8rem;
      font-size: 1.6rem;
      span {
        margin-left: 0.3rem;
        color: #240669;
        cursor: pointer;

        &:hover {
          color: ${shade(0.5, '#240669')};
        }
      }
    }
  }

  form {
    display: flex;
    flex-direction: column;
  }
`;

export const Background = styled.div`
  flex: 1;
  background: url(${bikeimage}) no-repeat center;
  background-size: cover;
`;
