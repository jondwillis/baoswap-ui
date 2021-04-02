import React, { useCallback, useRef, useState } from 'react'
import { Code, Gift, GitBranch, GitPullRequest, MessageCircle } from 'react-feather'
import styled from 'styled-components'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { Text } from 'rebass'
import { ExternalLink } from '../../theme'
import QuestionHelper from '../QuestionHelper'
import { getEtherscanLink } from '../../utils'
import { useActiveWeb3React } from '../../hooks'

const StyledMenuIcon = styled(GitBranch)`
  color: ${({ theme }) => theme.primary1};
`

const StyledMenuButton = styled.button`
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
  margin: 0;
  padding: 0;
  height: 30px;
  border: 1pt solid ${({ theme }) => theme.grd1};

  padding: 0.15rem 0.5rem;
  border-radius: 0.5rem;

  :hover,
  :focus {
    cursor: pointer;
    outline: none;
    border-color: ${({ theme }) => theme.primary5};
    background-color: ${({ theme }) => theme.bg2};
    path {
      stroke: ${({ theme }) => theme.primary3};
    }
  }
`

const StyledMenu = styled.div`
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
  top: 2rem;
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

export default function DevMenu() {
  const node = useRef<HTMLDivElement>()
  const { chainId } = useActiveWeb3React()
  
  const [open, setState] = useState<boolean>(false)

  const toggle = useCallback(() => setState(state => !state), [setState])
  const openMenu = useCallback(() => setState(true), [setState])
  const closeMenu = useCallback(() => setState(false), [setState])

  useOnClickOutside(node, open ? toggle : undefined)

  return (
    // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/30451
    <StyledMenu ref={node as any} onMouseOver={openMenu} onMouseLeave={closeMenu}>
      <StyledMenuButton onClick={toggle}>
        <StyledMenuIcon />
      </StyledMenuButton>
      <QuestionHelper text="xdai.farm is a UI fork of BaoSwap, with an emphasis on Quality of Life for users that harvest and/or compound frequently. Please see the menu to the left to view the source code. There is no connection w/ bao.finance, nor shall there be any liability in losses incurred due to using this tool. The author shall not be held liable for decisions made using this tool. No offer of financial advice shall be implied." />
      {open && (
        <MenuFlyout style={{ marginBottom: 0 }}>
          <Text style={{ paddingLeft: 14, marginBottom: 8, fontWeight: 600 }}>xDai.farm Developer</Text>
          <MenuItem id="link" href="https://github.com/jondwillis/baoswap-ui">
            <Code size={14} />
            View Forked Code
          </MenuItem>
          <MenuItem id="link" href="https://gitcoin.co/grants/2377/baoswapchef-quality-of-life-updates">
            <Gift size={14} />
            Gitcoin Grant
          </MenuItem>
          {chainId && (
            <MenuItem
              id="link"
              href={getEtherscanLink(chainId, '0x2CBb111028393710BFaFe51B2426D0AE496010B9', 'address')}
            >
              <Gift size={14} />
              Donation Address
            </MenuItem>
          )}
          <MenuItem id="link" href="https://discordapp.com/users/jon.almostfree#7990">
            <MessageCircle size={14} />
            <span>
              Discord <span style={{ fontSize: 10, margin: 2 }}>jon.almostfree#7990</span>
            </span>
          </MenuItem>
          <MenuItem id="link" href="https://github.com/jondwillis/baoswap-ui/issues/new">
            <GitPullRequest size={14} />
            Submit Feature or Bug?
          </MenuItem>
        </MenuFlyout>
      )}
    </StyledMenu>
  )
}
