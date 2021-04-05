import { createWeb3ReactRoot, Web3ReactProvider } from '@web3-react/core'
import 'inter-ui'
import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { ChainId } from 'uniswap-xdai-sdk'
import { getNetworkLibrary } from './connectors'
import { MainNetworkContextName, NetworkContextName } from './constants'
import { useMainWeb3React } from './hooks'
import './i18n'
import App from './pages/App'
import store from './state'
import ApplicationUpdater from './state/application/updater'
import ListsUpdater from './state/lists/updater'
import MulticallUpdater from './state/multicall/updater'
import TransactionUpdater from './state/transactions/updater'
import UserUpdater from './state/user/updater'
import ThemeProvider, { FixedGlobalStyle, ThemedGlobalStyle } from './theme'
import getLibrary from './utils/getLibrary'

const Web3ProviderNetwork = createWeb3ReactRoot(NetworkContextName)
const Web3ProviderMainNetwork = createWeb3ReactRoot(MainNetworkContextName)

if ('ethereum' in window) {
  ;(window.ethereum as any).autoRefreshOnNetworkChange = false
}

function Updaters() {
  const activeAppUpdater = ApplicationUpdater()
  const activeTxnUpdater = TransactionUpdater()
  const mainnetAppUpdater = ApplicationUpdater(useMainWeb3React())
  const mainnetTxnUpdater = TransactionUpdater(useMainWeb3React())
  return (
    <>
      <ListsUpdater />
      <UserUpdater />
      {activeAppUpdater}
      {mainnetAppUpdater}
      {activeTxnUpdater}
      {mainnetTxnUpdater}
      <MulticallUpdater chainId={ChainId.XDAI} />
      <MulticallUpdater chainId={ChainId.MAINNET} />
    </>
  )
}

ReactDOM.render(
  <StrictMode>
    <FixedGlobalStyle />
    <Web3ReactProvider getLibrary={getLibrary}>
      <Web3ProviderNetwork getLibrary={getLibrary}>
        <Web3ProviderMainNetwork getLibrary={getNetworkLibrary}>
          <Provider store={store}>
            <Updaters />
            <ThemeProvider>
              <ThemedGlobalStyle />
              <App />
            </ThemeProvider>
          </Provider>
        </Web3ProviderMainNetwork>
      </Web3ProviderNetwork>
    </Web3ReactProvider>
  </StrictMode>,
  document.getElementById('root')
)
