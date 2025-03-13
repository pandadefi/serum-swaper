import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import { SWAPPER_CONTRACT_ADDRESS, SWAPPER_ABI } from '../constants';
import Link from 'next/link';

const Home: NextPage = () => {
  const [amount, setAmount] = useState('');
  const [isAllowed, setIsAllowed] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<'depositEth' | 'depositSteth' | 'withdrawEth' | 'withdrawSteth'>('depositEth');
  const { address, isConnected } = useAccount();
  
  // Read contract to check if connected wallet is owner
  const { data: ownerAddress } = useReadContract({
    address: SWAPPER_CONTRACT_ADDRESS,
    abi: SWAPPER_ABI,
    functionName: 'owner',
  });
  
  // Check if user is allowed
  const { data: isAllowedData } = useReadContract({
    address: SWAPPER_CONTRACT_ADDRESS,
    abi: SWAPPER_ABI,
    functionName: 'allowed',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!address,
    },
  });
  
  // Set user state based on contract data
  useEffect(() => {
    if (address && ownerAddress) {
      setIsOwner(address.toLowerCase() === ownerAddress.toLowerCase());
    } else {
      setIsOwner(false);
    }
    
    if (isAllowedData !== undefined) {
      setIsAllowed(isAllowedData);
    }
  }, [address, ownerAddress, isAllowedData]);
  
  // Write to contract
  const { data: hash, isPending, error, writeContract } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // Handle deposit ETH
  const handleDepositEth = async () => {
    if (!amount || !isAllowed) return;
    
    try {
      writeContract({
        address: SWAPPER_CONTRACT_ADDRESS,
        abi: SWAPPER_ABI,
        functionName: 'depositEth',
        value: parseEther(amount),
      });
    } catch (err) {
      console.error('Error depositing ETH:', err);
    }
  };

  // Handle deposit stETH
  const handleDepositSteth = async () => {
    if (!amount || !isAllowed) return;
    
    try {
      // Note: This would require ERC20 approve first
      writeContract({
        address: SWAPPER_CONTRACT_ADDRESS,
        abi: SWAPPER_ABI,
        functionName: 'depositSteth',
        args: [parseEther(amount)],
      });
    } catch (err) {
      console.error('Error depositing stETH:', err);
    }
  };

  // Handle withdraw ETH
  const handleWithdrawEth = async () => {
    if (!amount || !isAllowed) return;
    
    try {
      writeContract({
        address: SWAPPER_CONTRACT_ADDRESS,
        abi: SWAPPER_ABI,
        functionName: 'withdrawEth',
        args: [parseEther(amount)],
      });
    } catch (err) {
      console.error('Error withdrawing ETH:', err);
    }
  };

  // Handle withdraw stETH
  const handleWithdrawSteth = async () => {
    if (!amount || !isAllowed) return;
    
    try {
      writeContract({
        address: SWAPPER_CONTRACT_ADDRESS,
        abi: SWAPPER_ABI,
        functionName: 'withdrawSteth',
        args: [parseEther(amount)],
      });
    } catch (err) {
      console.error('Error withdrawing stETH:', err);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Serum Swapper</title>
        <meta content="Serum Swapper - Deposit and withdraw assets" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <ConnectButton />
        </div>

        <h1 className={styles.title}>
          Serum Swapper
        </h1>

        <p className={styles.description}>
          Deposit and withdraw assets from the Swapper contract
        </p>

        {isOwner && (
          <div className={styles.grid} style={{ marginBottom: '2rem' }}>
            <Link href="/admin" className={styles.card}>
              <h2>Admin Panel &rarr;</h2>
              <p>Access admin functions like contract withdrawal and NFT transfers.</p>
            </Link>
          </div>
        )}

        {!isConnected ? (
          <div className={styles.card} style={{ textAlign: 'center' }}>
            <p>Please connect your wallet to use the swapper.</p>
          </div>
        ) : !isAllowed ? (
          <div className={styles.card} style={{ textAlign: 'center', borderColor: '#dc3545' }}>
            <p style={{ color: '#dc3545', marginBottom: '1rem' }}>
              Your address is not allowed to use this contract.
            </p>
            <p>
              If you believe this is an error, please contact the contract owner or check your address in the{' '}
              {isOwner ? (
                <Link href="/admin" style={{ fontWeight: 500 }}>
                  Admin Panel
                </Link>
              ) : (
                'Admin Panel'
              )}.
            </p>
            <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6c757d' }}>
              Connected address: {address}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.tabContainer}>
              <button 
                onClick={() => setActiveTab('depositEth')} 
                className={`${styles.tabButton} ${activeTab === 'depositEth' ? styles.tabButtonActive : ''}`}
              >
                Deposit ETH
              </button>
              <button 
                onClick={() => setActiveTab('depositSteth')} 
                className={`${styles.tabButton} ${activeTab === 'depositSteth' ? styles.tabButtonActive : ''}`}
              >
                Deposit stETH
              </button>
              <button 
                onClick={() => setActiveTab('withdrawEth')} 
                className={`${styles.tabButton} ${activeTab === 'withdrawEth' ? styles.tabButtonActive : ''}`}
              >
                Withdraw ETH
              </button>
              <button 
                onClick={() => setActiveTab('withdrawSteth')} 
                className={`${styles.tabButton} ${activeTab === 'withdrawSteth' ? styles.tabButtonActive : ''}`}
              >
                Withdraw stETH
              </button>
            </div>

            <div className={styles.card} style={{ width: '100%', maxWidth: '500px' }}>
              <h2>
                {activeTab === 'depositEth' ? 'Deposit ETH' : 
                 activeTab === 'depositSteth' ? 'Deposit stETH' :
                 activeTab === 'withdrawEth' ? 'Withdraw ETH' : 'Withdraw stETH'}
              </h2>
              
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="amount" className={styles.formLabel}>
                    Amount ({activeTab.includes('Eth') ? 'ETH' : 'stETH'}):
                  </label>
                  <input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className={styles.formInput}
                  />
                </div>
                
                <button
                  onClick={
                    activeTab === 'depositEth' ? handleDepositEth : 
                    activeTab === 'depositSteth' ? handleDepositSteth :
                    activeTab === 'withdrawEth' ? handleWithdrawEth : handleWithdrawSteth
                  }
                  disabled={!amount || isPending || isConfirming}
                  className={styles.actionButton}
                >
                  {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 
                   activeTab.startsWith('deposit') ? 'Deposit' : 'Withdraw'}
                </button>
                
                {error && (
                  <div className={styles.errorMessage}>
                    Error: {error.message}
                  </div>
                )}
                
                {isConfirmed && (
                  <div className={styles.successMessage}>
                    {activeTab.startsWith('deposit') ? 'Deposit' : 'Withdrawal'} successful!
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <Link href="https://github.com/your-username/serum-swapper" target="_blank" rel="noopener noreferrer">
          Serum Swapper
        </Link>
      </footer>
    </div>
  );
};

export default Home;
