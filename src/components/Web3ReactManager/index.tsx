import React, { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'

import { mainnet } from '../../connectors'
import { useEagerConnect, useInactiveListener } from '../../hooks'
import { MainNetworkContextName } from '../../constants'
import Loader from '../Loader'
import { ButtonLight } from '../Button'
import { useWalletModalToggle } from '../../state/application/hooks'

const MessageWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20rem;
`

const Message = styled.h2`
  color: ${({ theme }) => theme.secondary1};
`

export default function Web3ReactManager({ children }: { children: JSX.Element }) {
  const { t } = useTranslation()
  const { active } = useWeb3React()
  const { active: mainnetworkActive, error: mainnetworkError, activate: mainactivateNetwork } = useWeb3React(
    MainNetworkContextName
  )
  // try to eagerly connect to an injected provider, if it exists and has granted access already
  const triedEager = useEagerConnect()
  const toggleWalletModal = useWalletModalToggle() // toggle wallet when disconnected

  // after eagerly trying injected, if the network connect ever isn't active or in an error state, activate itd
  useEffect(() => {
    if (!mainnetworkActive && !mainnetworkError) {
      mainactivateNetwork(mainnet)
    }
  }, [triedEager, mainnetworkActive, mainnetworkError, mainactivateNetwork, active])
  // when there's no account connected, react to logins (broadly speaking) on the injected provider, if it exists
  useInactiveListener(!triedEager)

  // handle delayed loader state
  const [showLoader, setShowLoader] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowLoader(true)
    }, 600)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  // on page load, do nothing until we've tried to connect to the injected connector
  if (!triedEager) {
    return null
  }

  // if the account context isn't active, and there's an error on the network context, it's an irrecoverable error
  if (!active && mainnetworkError) {
    return (
      <MessageWrapper>
        <Message>{t('unknownError')}</Message>
        <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
      </MessageWrapper>
    )
  }

  // if neither context is active, spin
  if (!active && !mainnetworkActive) {
    return showLoader ? (
      <MessageWrapper>
        <Loader />
        <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
      </MessageWrapper>
    ) : null
  }

  return children
}
