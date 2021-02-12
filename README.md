# Honeyswap Interface

[![Tests](https://github.com/Uniswap/uniswap-interface/workflows/Tests/badge.svg)](https://github.com/Uniswap/uniswap-interface/actions?query=workflow%3ATests)
[![Styled With Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)

An open source interface for Honeyswap -- a protocol for decentralized exchange of xDai tokens.

- Website: [about.1hive.org](https://about.1hive.org/)
- Interface: [honeyswap.org](https://app.honeyswap.org/)
- Docs: [about.1hive.org/docs/](https://about.1hive.org/docs/honeyswap)
- Twitter: [@1HiveOrg](https://twitter.com/1HiveOrg)
- Discord: [1Hive](https://discord.gg/GfqnEGF)

## Accessing the Uniswap Interface

To access the Uniswap Interface, use an IPFS gateway link from the
[latest release](https://github.com/1Hive/uniswap-interface/releases/latest),
or visit [honeyswap.org](https://honeyswap.org).

## Listing a token

Please see the
[@1Hive/default-token-list](https://github.com/1Hive/default-token-list)
repository.

## Development

### Install Dependencies

```bash
yarn
```

### Run

```bash
yarn start
```

### Configuring the environment (optional)

To have the interface default to a different network when a wallet is not connected:

1. Make a copy of `.env` named `.env.local`
2. Change `REACT_APP_NETWORK_ID` to `"{YOUR_NETWORK_ID}"`
3. Change `REACT_APP_NETWORK_URL` to e.g. `"https://{YOUR_NETWORK_ID}.infura.io/v3/{YOUR_INFURA_KEY}"`

Note that the interface only works on testnets where both
[Uniswap V2](https://uniswap.org/docs/v2/smart-contracts/factory/) and
[multicall](https://github.com/makerdao/multicall) are deployed.
The interface will not work on other networks.

## Contributions

**Please open all pull requests against the `master` branch.**
CI checks will run against all PRs.

## Accessing Honeyswap Interface V1

The Honeyswap Interface supports swapping against, and migrating or removing liquidity from Honeyswap V1.
