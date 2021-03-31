import styled from 'styled-components'

const SearchInput = styled.input`
  background: ${({ theme }) => theme.bg1};
  font-size: 16px;
  outline: none;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
  color: ${({ theme, color }) => (color === 'red' ? theme.red1 : theme.text1)};
  text-align: center;
  width: 100%;
  height: 100%;
  border: 1px solid #40444F;
  border-radius: 2rem;
  padding: 5px;
`

export default SearchInput
