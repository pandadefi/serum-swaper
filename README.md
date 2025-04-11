# Staked steth Frontend

This is a frontend application for interacting with the Staked steth contract. It allows the contract owner to withdraw ETH from the contract.

## Features

- Connect with Rabby Wallet or any other Ethereum wallet
- Check if the connected wallet is the contract owner
- Withdraw ETH from the Swapper contract

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- An Ethereum wallet (like Rabby Wallet)
- A WalletConnect Project ID (get one at https://cloud.walletconnect.com)

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```
3. Create a `.env.local` file with the following content:
   ```
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here
   NEXT_PUBLIC_SWAPPER_CONTRACT_ADDRESS=0xc32B5d94C1f27E1f02a262a75e10169e71ca7d5D
   ```
4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Connect your wallet using the "Connect Wallet" button
2. If you're the contract owner, you'll see a form to enter the amount to withdraw
3. Enter the amount in ETH and click "Withdraw"
4. Confirm the transaction in your wallet

## Deployment

To build the application for production:

```bash
npm run build
# or
yarn build
```

Then, you can deploy the `out` directory to any static hosting service like Vercel, Netlify, or GitHub Pages.

## License

MIT
