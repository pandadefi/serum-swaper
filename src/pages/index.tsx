import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { SWAPPER_CONTRACT_ADDRESSES, SWAPPER_ABI, STETH_ADDRESS, ERC20_ABI } from '../constants';
import Link from 'next/link';

const Home: NextPage = () => {
  const [amount, setAmount] = useState('');
  const [isAllowed, setIsAllowed] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<'depositEth' | 'depositSteth' | 'withdrawEth' | 'withdrawSteth'>('depositEth');
  const [isMounted, setIsMounted] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [activeContract, setActiveContract] = useState<`0x${string}`>(SWAPPER_CONTRACT_ADDRESSES[0]);
  const [isCheckingContracts, setIsCheckingContracts] = useState(false);
  const { address, isConnected } = useAccount();
  
  // Set mounted state for client-side rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Find the first contract that the user is allowed to use
  useEffect(() => {
    const findUsableContract = async () => {
      if (!address || !isConnected) return;
      
      setIsCheckingContracts(true);
      
      for (const contractAddress of SWAPPER_CONTRACT_ADDRESSES) {
        try {
          // Check if the user is allowed to use this contract
          const isAllowedResponse = await fetch('/api/checkAllowance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              address,
              contractAddress,
            }),
          });
          
          const { isAllowed } = await isAllowedResponse.json();
          
          if (isAllowed) {
            setActiveContract(contractAddress);
            setIsAllowed(true);
            setIsCheckingContracts(false);
            return;
          }
        } catch (error) {
          console.error(`Error checking contract ${contractAddress}:`, error);
        }
      }
      
      // If no contract is found where the user is allowed, keep the first one as default
      setIsAllowed(false);
      setIsCheckingContracts(false);
    };
    
    findUsableContract();
  }, [address, isConnected]);
  
  // Fetch user's ETH balance in wallet
  const { data: ethBalanceData, refetch: refetchEthBalance } = useBalance({
    address,
    query: {
      enabled: !!address && isMounted,
    },
  });
  
  // Fetch user's stETH balance in wallet
  const { data: stethBalanceData, refetch: refetchStethBalance } = useReadContract({
    address: STETH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!address,
    },
  });
  
  // Fetch user's stETH allowance for the contract
  const { data: stethAllowanceData, refetch: refetchStethAllowance } = useReadContract({
    address: STETH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address || '0x0000000000000000000000000000000000000000', activeContract],
    query: {
      enabled: !!address && !!activeContract,
    },
  });
  
  // Fetch user's balances in contract directly using the balances mapping
  const { data: contractBalanceData, refetch: refetchContractBalance } = useReadContract({
    address: activeContract,
    abi: SWAPPER_ABI,
    functionName: 'balances',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!address && !!activeContract,
    },
  });
  
  // Format the wallet stETH balance
  const formattedStethBalance = stethBalanceData ? 
    parseFloat(formatEther(stethBalanceData)).toFixed(4) : 
    '0.0000';
    
  // Format the contract balance
  const formattedContractBalance = contractBalanceData ? 
    parseFloat(formatEther(contractBalanceData)).toFixed(4) : 
    '0.0000';
  
  // Read contract to check if connected wallet is owner
  const { data: ownerAddress } = useReadContract({
    address: activeContract,
    abi: SWAPPER_ABI,
    functionName: 'owner',
    query: {
      enabled: !!activeContract,
    },
  });
  
  // Set user state based on contract data
  useEffect(() => {
    if (address && ownerAddress) {
      setIsOwner(address.toLowerCase() === ownerAddress.toLowerCase());
    } else {
      setIsOwner(false);
    }
  }, [address, ownerAddress]);
  
  // Write to contract
  const { data: hash, isPending, error, writeContract } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // Reset form and refetch balances after successful transaction
  useEffect(() => {
    if (isConfirmed) {
      setAmount('');
      setIsApproving(false);
      // Refetch all balances
      refetchEthBalance();
      refetchStethBalance();
      refetchContractBalance();
      refetchStethAllowance();
    }
  }, [isConfirmed, refetchEthBalance, refetchStethBalance, refetchContractBalance, refetchStethAllowance]);

  // Function to check if stETH allowance is sufficient
  const checkAndApproveSteth = async () => {
    if (!amount || !address || stethAllowanceData === undefined) return false;
    
    const amountBigInt = parseEther(amount);
    
    // If current allowance is less than the amount, approve first
    if (stethAllowanceData < amountBigInt) {
      setIsApproving(true);
      try {
        // Approve max uint256 to avoid frequent approvals
        writeContract({
          address: STETH_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [activeContract, parseEther('1000000000')], // Very large allowance
        });
        return false; // Return false to indicate approval is in progress
      } catch (err) {
        console.error('Error approving stETH:', err);
        setIsApproving(false);
        return false;
      }
    }
    
    return true; // Sufficient allowance
  };

  // Handle deposit ETH
  const handleDepositEth = async () => {
    if (!amount || !isAllowed) return;
    
    try {
      writeContract({
        address: activeContract,
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
    
    // Set amount in BigInt for comparison
    const amountBigInt = parseEther(amount);
    
    try {
      // Check if we need approval first
      if (stethAllowanceData === undefined || stethAllowanceData < amountBigInt) {
        // If we need approval and not already approving, start approval
        if (!isApproving) {
          await checkAndApproveSteth();
        }
        // Don't proceed with deposit if we're still in approval phase
        return;
      }
      
      // If we have allowance, proceed with deposit
      writeContract({
        address: activeContract,
        abi: SWAPPER_ABI,
        functionName: 'depositSteth',
        args: [amountBigInt],
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
        address: activeContract,
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
        address: activeContract,
        abi: SWAPPER_ABI,
        functionName: 'withdrawSteth',
        args: [parseEther(amount)],
      });
    } catch (err) {
      console.error('Error withdrawing stETH:', err);
    }
  };

  // Handle setting max amount
  const handleSetMaxAmount = () => {
    if (activeTab === 'depositEth' && ethBalanceData) {
      // Leave a little ETH for gas
      const maxAmount = parseFloat(formatEther(ethBalanceData.value)) - 0.01;
      setAmount(maxAmount > 0 ? maxAmount.toString() : '0');
    } else if (activeTab === 'depositSteth' && stethBalanceData) {
      setAmount(formatEther(stethBalanceData));
    } else if ((activeTab === 'withdrawEth' || activeTab === 'withdrawSteth') && contractBalanceData) {
      setAmount(formatEther(contractBalanceData));
    }
  };

  // Get action button text based on current state
  const getActionButtonText = () => {
    if (isPending) return 'Confirming...';
    if (isConfirming) return 'Processing...';
    
    if (activeTab === 'depositSteth' && isApproving) {
      return 'Approving stETH...';
    }
    
    return activeTab.startsWith('deposit') ? 'Deposit' : 'Withdraw';
  };

  // Check if button should be disabled
  const isButtonDisabled = () => {
    return !amount || isPending || isConfirming || 
      (activeTab === 'depositSteth' && isApproving);
  };
  
  // Check if stETH requires approval for deposit
  const needsStethApproval = () => {
    if (activeTab !== 'depositSteth' || !amount || stethAllowanceData === undefined) return false;
    return stethAllowanceData < parseEther(amount || '0');
  };

  // Format transaction hash for display
  const formatTxHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Staked stETH</title>
        <meta content="Staked stETH - Deposit and withdraw assets" name="description" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
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

        {isMounted && (
          <>
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
                {isCheckingContracts ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Checking available contracts...</p>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
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
                        <button 
                          className={styles.maxButton}
                          onClick={handleSetMaxAmount}
                          type="button"
                        >
                          MAX
                        </button>
                        <div className={styles.currencyBadge}>
                          {activeTab.includes('Eth') ? 'ETH' : 'stETH'}
                        </div>
                      </div>
                      <div className={styles.balanceHint}>
                        {activeTab.startsWith('deposit') ? 'Wallet Balance: ' : 'Contract Balance: '}
                        <span>
                        {activeTab === 'depositEth' ? 
                          `${ethBalanceData ? parseFloat(formatEther(ethBalanceData.value)).toFixed(4) : '0.0000'} ETH` : 
                        activeTab === 'depositSteth' ? 
                          `${formattedStethBalance} stETH` :
                          `${formattedContractBalance} ${activeTab.includes('Eth') ? 'ETH' : 'stETH'}`
                        }
                        </span>
                      </div>
                      
                      {activeTab === 'depositSteth' && needsStethApproval() && (
                        <div className={styles.infoMessage}>
                          You need to approve stETH spending first. This will happen automatically when you click Deposit.
                        </div>
                      )}
                      
                      {activeTab === 'depositSteth' && isApproving && hash && (
                        <div className={styles.infoMessage}>
                          Approving stETH... 
                          <a 
                            href={`https://etherscan.io/tx/${hash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.txLink}
                          >
                            View transaction: {formatTxHash(hash)}
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={
                        activeTab === 'depositEth' ? handleDepositEth : 
                        activeTab === 'depositSteth' ? handleDepositSteth :
                        activeTab === 'withdrawEth' ? handleWithdrawEth : handleWithdrawSteth
                      }
                      disabled={isButtonDisabled()}
                      className={styles.actionButton}
                    >
                      {getActionButtonText()}
                    </button>
                    
                    {error && (
                      <div className={styles.errorMessage}>
                        Error: {error.message}
                      </div>
                    )}
                    
                    {isConfirmed && (
                      <div className={styles.successMessage}>
                        {isApproving ? 'stETH approval' : activeTab.startsWith('deposit') ? 'Deposit' : 'Withdrawal'} successful!
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
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
