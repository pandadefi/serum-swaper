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
        <title>Staked stETH</title>
        <meta content="Staked stETH - Deposit and withdraw assets" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <ConnectButton />
        </div>

        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="#00A3FF" />
              <path d="M32 10L14 32L32 40L50 32L32 10Z" fill="white" />
              <path d="M32 47L14 32L32 40L50 32L32 47Z" fill="#B5E8FF" />
              <path d="M32 28L24 24L32 12L40 24L32 28Z" fill="#00A3FF" />
              <path d="M32 54L50 32V39L32 54Z" fill="#80D9FF" />
              <path d="M32 54L14 32V39L32 54Z" fill="#80D9FF" />
              <circle cx="32" cy="32" r="4" fill="white" />
            </svg>
            <h1 className={styles.title}>Staked stETH</h1>
          </div>
          <p className={styles.description}>
            Deposit and withdraw assets from the Lido staking contract
          </p>
        </div>

        {isOwner && (
          <div className={styles.adminCard}>
            <Link href="/admin" className={styles.adminLink}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4L4 8L12 12L20 8L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 16L12 20L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 12L12 16L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Admin Panel</span>
            </Link>
          </div>
        )}

        {!isConnected ? (
          <div className={styles.connectCard}>
            <div className={styles.connectIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 16.5L14 12.5L10 8.5" stroke="#0D76FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 12.5H3" stroke="#0D76FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 7V5C7 4.46957 7.21071 3.96086 7.58579 3.58579C7.96086 3.21071 8.46957 3 9 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H9C8.46957 22 7.96086 21.7893 7.58579 21.4142C7.21071 21.0391 7 20.5304 7 20V18" stroke="#0D76FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
                  marginRight: '8px', 
                  color: activeTab === 'depositEth' ? '#00A3FF' : '#666666',
                  transition: 'color 0.2s ease'
                }}>
                  <path d="M12 4V20M12 20L6 14M12 20L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Deposit ETH
              </button>
              <button 
                onClick={() => setActiveTab('depositSteth')} 
                className={`${styles.tabButton} ${activeTab === 'depositSteth' ? styles.tabButtonActive : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
                  marginRight: '8px', 
                  color: activeTab === 'depositSteth' ? '#00A3FF' : '#666666',
                  transition: 'color 0.2s ease'
                }}>
                  <path d="M12 4V20M12 20L6 14M12 20L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Deposit stETH
              </button>
              <button 
                onClick={() => setActiveTab('withdrawEth')} 
                className={`${styles.tabButton} ${activeTab === 'withdrawEth' ? styles.tabButtonActive : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
                  marginRight: '8px', 
                  color: activeTab === 'withdrawEth' ? '#00A3FF' : '#666666',
                  transition: 'color 0.2s ease'
                }}>
                  <path d="M12 20V4M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Withdraw ETH
              </button>
              <button 
                onClick={() => setActiveTab('withdrawSteth')} 
                className={`${styles.tabButton} ${activeTab === 'withdrawSteth' ? styles.tabButtonActive : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
                  marginRight: '8px', 
                  color: activeTab === 'withdrawSteth' ? '#00A3FF' : '#666666',
                  transition: 'color 0.2s ease'
                }}>
                  <path d="M12 20V4M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Withdraw stETH
              </button>
            </div>

            <div className={styles.swapCard}>
              <div className={styles.swapHeader}>
                <h2>
                  {activeTab === 'depositEth' ? 'Deposit ETH' : 
                   activeTab === 'depositSteth' ? 'Deposit stETH' :
                   activeTab === 'withdrawEth' ? 'Withdraw ETH' : 'Withdraw stETH'}
                </h2>
                <div className={styles.tokenIcon}>
                  {activeTab.includes('Eth') ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L5 12L12 16L19 12L12 2Z" fill="#627EEA"/>
                      <path d="M12 16V22L19 12L12 16Z" fill="#627EEA"/>
                      <path d="M12 16V22L5 12L12 16Z" fill="#627EEA"/>
                      <path d="M12 2V10L19 12L12 2Z" fill="#C5CAF7"/>
                      <path d="M12 2V10L5 12L12 2Z" fill="#C5CAF7"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L5 12L12 16L19 12L12 2Z" fill="#00A3FF"/>
                      <path d="M12 16V22L19 12L12 16Z" fill="#00A3FF"/>
                      <path d="M12 16V22L5 12L12 16Z" fill="#00A3FF"/>
                      <path d="M12 2V10L19 12L12 2Z" fill="#8CD9FF"/>
                      <path d="M12 2V10L5 12L12 2Z" fill="#8CD9FF"/>
                    </svg>
                  )}
                </div>
              </div>
              
              <div className={styles.swapBody}>
                <div className={styles.inputGroup}>
                  <label htmlFor="amount" className={styles.formLabel}>
                    Amount:
                  </label>
                  <div className={styles.amountInputContainer}>
                    <input
                      id="amount"
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                      className={styles.formInput}
                    />
                    <div className={styles.currencyBadge}>
                      {activeTab.includes('Eth') ? 'ETH' : 'stETH'}
                    </div>
                  </div>
                  <div className={styles.balanceHint}>
                    Balance: {/*You would add actual balance here*/}
                  </div>
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
          <div className={styles.footerLogo}>
            <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="24" fill="#00A3FF" opacity="0.5" />
              <path d="M24 28L28 24L24 20L20 24L24 28Z" fill="#00A3FF" />
            </svg>
            <span>Staked stETH</span>
          </div>
        </Link>
      </footer>
    </div>
  );
};

export default Home;
