import styled, { css } from 'styled-components';
import Tooltip from '../Tooltip';

interface ContainerProps {
  isFocused: boolean;
  isFilled: boolean;
  isErrorRed: boolean;
}

export const Container = styled.div<ContainerProps>`
  border-radius: 4px;
  border: 1px solid #898080;
  padding: 18px;
  width: 100%;
  font-size: 1.8rem;

  display: flex;
  align-items: center;

  flex: 1;
  background: transparent !important;

  & + div {
    margin-top: 10px;
  }

  ${(props) =>
    props.isFocused &&
    css`
      border: solid 2px #240669;
      color: #240669;
    `}

  ${(props) =>
    props.isFilled &&
    css`
      color: #240669;
    `}

      ${(props) =>
    props.isErrorRed &&
    css`
      border: solid 2px red;
    `}

      input {
    width: 300px;
    border: 0;
  }

  input:-webkit-autofill {
    -webkit-text-fill-color: black !important;
  }

  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 30px #fff inset;
  }

  svg {
    margin-right: 15px;
  }
`;

export const Error = styled(Tooltip)`
  display: flex;
  align-items: center;

  svg {
    margin-left: 15px;
    color: red;
  }
`;
