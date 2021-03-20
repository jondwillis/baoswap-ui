import { useActiveWeb3React } from '../../hooks'
import React, { useRef } from 'react'
import { Info, BookOpen, Code, PieChart, MessageCircle } from 'react-feather'
import styled from 'styled-components'
import { ReactComponent as MenuIcon } from '../../assets/images/menu.svg'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import useToggle from '../../hooks/useToggle'
import { getEtherscanLink } from '../../utils'

import { ExternalLink } from '../../theme'
import { useMasterChefContract } from '../../hooks/useContract'
import { ChainId } from 'uniswap-xdai-sdk'

const StyledMenuIcon = styled(MenuIcon)`
  path {
    stroke: ${({ theme }) => theme.text1};
  }
`

const StyledMenuButton = styled.button`
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
  margin: 0;
  padding: 0;
  height: 35px;
  background-color: ${({ theme }) => theme.bg3};

  padding: 0.15rem 0.5rem;
  border-radius: 0.5rem;

  :hover,
  :focus {
    cursor: pointer;
    outline: none;
    background-color: ${({ theme }) => theme.bg4};
  }

  svg {
    margin-top: 2px;
  }
`

const StyledMenu = styled.div`
  margin-left: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border: none;
  text-align: left;
`

const MenuFlyout = styled.span`
  min-width: 13.25rem;
  background-color: ${({ theme }) => theme.bg3};
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  border-radius: 0.5rem;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  position: absolute;
  top: 3rem;
  right: 0rem;
  z-index: 100;
`

const MenuItem = styled(ExternalLink)`
  flex: 1;
  padding: 0.5rem 0.5rem;
  color: ${({ theme }) => theme.text2};
  :hover {
    color: ${({ theme }) => theme.text1};
    cursor: pointer;
    text-decoration: none;
  }
  > svg {
    margin-right: 8px;
  }
`

export default function Menu() {
  const node = useRef<HTMLDivElement>()
  const [open, toggle] = useToggle(false)
  const { account, chainId } = useActiveWeb3React()

  const masterChefContract = useMasterChefContract()

  useOnClickOutside(node, open ? toggle : undefined)

  return (
    // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/30451
    <StyledMenu ref={node as any}>
      <StyledMenuButton onClick={toggle}>
        <StyledMenuIcon />
      </StyledMenuButton>
      {open && (
        <MenuFlyout>
          <MenuItem id="link" href="">
            <Info size={14} />
            About
          </MenuItem>
          <MenuItem id="link" href={chainId === ChainId.XDAI ? 'https://xdai.bao.finance/' : 'https://bao.finance'}>
            <Info size={14} />
            Original Chef
          </MenuItem>
          <MenuItem id="link" href="https://docs.bao.finance">
            <BookOpen size={14} />
            Docs
          </MenuItem>
          {chainId && masterChefContract && (
            <MenuItem id="link" href={getEtherscanLink(chainId, masterChefContract.address, 'address')}>
              <Code size={14} />
              BaoMasterFarmer
            </MenuItem>
          )}
          <MenuItem id="link" href="https://github.com/baofinance/baoswap-ui">
            <Code size={14} />
            Original Code
          </MenuItem>
          <MenuItem id="link" href="https://github.com/jondwillis/baoswap-ui">
            <Code size={14} />
            Fork Code
          </MenuItem>
          <MenuItem id="link" href="https://discord.gg/BW3P62vJXT">
            <MessageCircle size={14} />
            Discord
          </MenuItem>
          <MenuItem id="link" href="https://baoboard.com">
            <PieChart size={14} />
            TVL/APY (Baoboard)
          </MenuItem>
          <MenuItem id="link" href="https://baostats.pythonanywhere.com">
            <PieChart size={14} />
            TVL/APY (baostats)
          </MenuItem>
          <MenuItem id="link" href="https://dailydefi.org/tools/bao-finance-xdai-farms-tvl/">
            <PieChart size={14} />
            Bao TVL (dailydefi)
          </MenuItem>
          <MenuItem id="link" href={`https://stakedvalue.com/#/bao-finance-xdai/${account}`}>
            <PieChart size={14} />
            StakedValue
          </MenuItem>
        </MenuFlyout>
      )}
    </StyledMenu>
  )
}
