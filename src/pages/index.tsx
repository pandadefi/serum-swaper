import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import { SWAPPER_CONTRACT_ADDRESS, SWAPPER_ABI } from '../constants';

const Home: NextPage = () => {
  const [amount, setAmount] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const { address, isConnected } = useAccount();
  
  // Read contract to check if connected wallet is owner
  const { data: ownerAddress } = useReadContract({
    address: SWAPPER_CONTRACT_ADDRESS,
    abi: SWAPPER_ABI,
    functionName: 'owner',
  });
  
  // Write to contract
  const { data: hash, isPending, error, writeContract } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // Check if connected wallet is owner
  useEffect(() => {
    if (address && ownerAddress) {
      setIsOwner(address.toLowerCase() === ownerAddress.toLowerCase());
    } else {
      setIsOwner(false);
    }
  }, [address, ownerAddress]);

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!amount || !isOwner) return;
    
    try {
      writeContract({
        address: SWAPPER_CONTRACT_ADDRESS,
        abi: SWAPPER_ABI,
        functionName: 'withdraw',
        args: [parseEther(amount)],
      });
    } catch (err) {
      console.error('Error withdrawing:', err);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Serum Swapper</title>
        <meta content="Withdraw ETH from the Swapper contract" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <ConnectButton />

        <h1 className={styles.title}>
          Serum Swapper
        </h1>

        <p className={styles.description}>
          Withdraw ETH from the Swapper contract
        </p>

        <div className={styles.card} style={{ width: '100%', maxWidth: '500px', margin: '2rem 0' }}>
          <h2>Withdraw from Swapper Contract</h2>
          
          {!isConnected ? (
            <p>Please connect your wallet to withdraw ETH.</p>
          ) : !isOwner ? (
            <p style={{ color: 'red', marginTop: '1rem' }}>
              Only the contract owner can withdraw funds.
            </p>
          ) : (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="amount" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Amount (ETH):
                </label>
                <input
                  id="amount"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </div>
              
              <button
                onClick={handleWithdraw}
                disabled={!amount || isPending || isConfirming}
                style={{
                  backgroundColor: '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.5rem 1rem',
                  cursor: isPending || isConfirming ? 'not-allowed' : 'pointer',
                  opacity: isPending || isConfirming ? 0.7 : 1,
                }}
              >
                {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Withdraw'}
              </button>
              
              {error && (
                <p style={{ color: 'red', marginTop: '1rem' }}>
                  Error: {error.message}
                </p>
              )}
              
              {isConfirmed && (
                <p style={{ color: 'green', marginTop: '1rem' }}>
                  Withdrawal successful!
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <a href="#" rel="noopener noreferrer" target="_blank">
          Serum Swapper
        </a>
      </footer>
    </div>
  );
};

export default Home;
