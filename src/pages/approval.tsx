import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther, isAddress, parseUnits, formatUnits } from 'viem';
import { ERC20_ABI } from '../constants';
import Link from 'next/link';

const Approval: NextPage = () => {
  const [tokenAddress, setTokenAddress] = useState<string>('');
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  const [spenderAddress, setSpenderAddress] = useState<string>('');
  const [approvalAmount, setApprovalAmount] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferToAddress, setTransferToAddress] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [activeTab, setActiveTab] = useState<'approve' | 'transfer'>('approve');
  
  const { address, isConnected } = useAccount();
  
  // Set mounted state for client-side rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get token decimals
  const { data: decimalsData } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress && isAddress(tokenAddress),
    },
  });

  // Update token decimals when data changes
  useEffect(() => {
    if (decimalsData !== undefined) {
      setTokenDecimals(Number(decimalsData));
    }
  }, [decimalsData]);

  // Get owner's token balance
  const { data: ownerBalance, refetch: refetchOwnerBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [ownerAddress as `0x${string}`],
    query: {
      enabled: !!tokenAddress && !!ownerAddress && isAddress(tokenAddress) && isAddress(ownerAddress),
    },
  });

  // Get spender's token balance
  const { data: spenderBalance, refetch: refetchSpenderBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [spenderAddress as `0x${string}`],
    query: {
      enabled: !!tokenAddress && !!spenderAddress && isAddress(tokenAddress) && isAddress(spenderAddress),
    },
  });

  // Get current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
    query: {
      enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress && 
               isAddress(tokenAddress) && isAddress(ownerAddress) && isAddress(spenderAddress),
    },
  });

  // Write to contract
  const { data: hash, isPending, error, writeContract } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // Reset form and refetch data after successful transaction
  useEffect(() => {
    if (isConfirmed) {
      refetchOwnerBalance();
      refetchSpenderBalance();
      refetchAllowance();
    }
  }, [isConfirmed, refetchOwnerBalance, refetchSpenderBalance, refetchAllowance]);

  // Handle approval transaction
  const handleApprove = async () => {
    if (!tokenAddress || !spenderAddress || !approvalAmount || !address) return;
    
    try {
      const amount = parseUnits(approvalAmount, tokenDecimals);
      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, amount],
      });
    } catch (err) {
      console.error('Error approving tokens:', err);
    }
  };

  // Handle transfer transaction (using transferFrom)
  const handleTransfer = async () => {
    if (!tokenAddress || !ownerAddress || !transferToAddress || !transferAmount || !address) return;
    
    try {
      const amount = parseUnits(transferAmount, tokenDecimals);
      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: 'address', name: 'from', type: 'address' },
              { internalType: 'address', name: 'to', type: 'address' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' }
            ],
            name: 'transferFrom',
            outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function',
          }
        ],
        functionName: 'transferFrom',
        args: [ownerAddress as `0x${string}`, transferToAddress as `0x${string}`, amount],
      });
    } catch (err) {
      console.error('Error transferring tokens:', err);
    }
  };

  // Format balance display
  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '0.0000';
    return parseFloat(formatUnits(balance, tokenDecimals)).toFixed(4);
  };

  // Format allowance display
  const formatAllowance = (allowance: bigint | undefined) => {
    if (!allowance) return '0.0000';
    return parseFloat(formatUnits(allowance, tokenDecimals)).toFixed(4);
  };

  const isApprovalDisabled = () => {
    return !isConnected || !tokenAddress || !spenderAddress || !approvalAmount || 
           !isAddress(tokenAddress) || !isAddress(spenderAddress) || isPending || isConfirming;
  };

  const isTransferDisabled = () => {
    return !isConnected || !tokenAddress || !ownerAddress || !transferToAddress || !transferAmount ||
           !isAddress(tokenAddress) || !isAddress(ownerAddress) || !isAddress(transferToAddress) || 
           isPending || isConfirming;
  };

  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>ERC-20 Token Approval - Staked stETH</title>
        <meta content="ERC-20 token approval and transfer interface" name="description" />
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
            <h1 className={styles.title}>ERC-20 Token Approval</h1>
          </div>
          <p className={styles.description}>
            Approve and transfer ERC-20 tokens between addresses
          </p>
        </div>

        {!isConnected ? (
          <div className={styles.card}>
            <h2>Connect Wallet</h2>
            <p>Please connect your wallet to use the token approval interface.</p>
          </div>
        ) : (
          <div className={styles.card}>
            {/* Token Contract Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="tokenAddress">Token Contract Address:</label>
              <input
                type="text"
                id="tokenAddress"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                className={styles.input}
              />
              {tokenAddress && !isAddress(tokenAddress) && (
                <p style={{ color: 'red', fontSize: '0.8rem' }}>Invalid address format</p>
              )}
              {tokenAddress && isAddress(tokenAddress) && decimalsData !== undefined && (
                <p style={{ color: 'green', fontSize: '0.8rem' }}>
                  Token decimals: {tokenDecimals}
                </p>
              )}
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', marginBottom: '1rem', borderBottom: '1px solid #333' }}>
              <button
                onClick={() => setActiveTab('approve')}
                style={{
                  padding: '0.5rem 1rem',
                  background: activeTab === 'approve' ? '#00A3FF' : 'transparent',
                  color: activeTab === 'approve' ? 'white' : '#ccc',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px 4px 0 0'
                }}
              >
                Approve
              </button>
              <button
                onClick={() => setActiveTab('transfer')}
                style={{
                  padding: '0.5rem 1rem',
                  background: activeTab === 'transfer' ? '#00A3FF' : 'transparent',
                  color: activeTab === 'transfer' ? 'white' : '#ccc',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px 4px 0 0'
                }}
              >
                Transfer
              </button>
            </div>

            {activeTab === 'approve' && (
              <div>
                <h3>Token Approval</h3>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="ownerAddress">Owner Address (Token Holder):</label>
                  <input
                    type="text"
                    id="ownerAddress"
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    placeholder="0x..."
                    className={styles.input}
                  />
                  {ownerAddress && !isAddress(ownerAddress) && (
                    <p style={{ color: 'red', fontSize: '0.8rem' }}>Invalid address format</p>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="spenderAddress">Spender Address (Approved Address):</label>
                  <input
                    type="text"
                    id="spenderAddress"
                    value={spenderAddress}
                    onChange={(e) => setSpenderAddress(e.target.value)}
                    placeholder="0x..."
                    className={styles.input}
                  />
                  {spenderAddress && !isAddress(spenderAddress) && (
                    <p style={{ color: 'red', fontSize: '0.8rem' }}>Invalid address format</p>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="approvalAmount">Approval Amount:</label>
                  <input
                    type="text"
                    id="approvalAmount"
                    value={approvalAmount}
                    onChange={(e) => setApprovalAmount(e.target.value)}
                    placeholder="0.0"
                    className={styles.input}
                  />
                </div>

                {/* Display balances and allowance */}
                {tokenAddress && isAddress(tokenAddress) && (
                  <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#ccc' }}>
                    {ownerAddress && isAddress(ownerAddress) && (
                      <p>Owner Balance: {formatBalance(ownerBalance)}</p>
                    )}
                    {spenderAddress && isAddress(spenderAddress) && (
                      <p>Spender Balance: {formatBalance(spenderBalance)}</p>
                    )}
                    {currentAllowance !== undefined && ownerAddress && spenderAddress && (
                      <p>Current Allowance: {formatAllowance(currentAllowance)}</p>
                    )}
                  </div>
                )}

                <button
                  className={styles.button}
                  onClick={handleApprove}
                  disabled={isApprovalDisabled()}
                >
                  {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Approve Tokens'}
                </button>
              </div>
            )}

            {activeTab === 'transfer' && (
              <div>
                <h3>Transfer Tokens (using transferFrom)</h3>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="ownerAddressTransfer">From Address (Token Owner):</label>
                  <input
                    type="text"
                    id="ownerAddressTransfer"
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    placeholder="0x..."
                    className={styles.input}
                  />
                  {ownerAddress && !isAddress(ownerAddress) && (
                    <p style={{ color: 'red', fontSize: '0.8rem' }}>Invalid address format</p>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="transferToAddress">To Address (Recipient):</label>
                  <input
                    type="text"
                    id="transferToAddress"
                    value={transferToAddress}
                    onChange={(e) => setTransferToAddress(e.target.value)}
                    placeholder="0x..."
                    className={styles.input}
                  />
                  {transferToAddress && !isAddress(transferToAddress) && (
                    <p style={{ color: 'red', fontSize: '0.8rem' }}>Invalid address format</p>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="transferAmount">Transfer Amount:</label>
                  <input
                    type="text"
                    id="transferAmount"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.0"
                    className={styles.input}
                  />
                </div>

                {/* Display balances and allowance for transfer */}
                {tokenAddress && isAddress(tokenAddress) && (
                  <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#ccc' }}>
                    {ownerAddress && isAddress(ownerAddress) && (
                      <p>From Balance: {formatBalance(ownerBalance)}</p>
                    )}
                    {currentAllowance !== undefined && ownerAddress && address && (
                      <p>Your Allowance: {formatAllowance(currentAllowance)}</p>
                    )}
                  </div>
                )}

                <button
                  className={styles.button}
                  onClick={handleTransfer}
                  disabled={isTransferDisabled()}
                >
                  {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Transfer Tokens'}
                </button>

                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
                  Note: You must be the approved spender to execute this transfer
                </p>
              </div>
            )}

            {/* Transaction Status */}
            {hash && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#1a1a1a', borderRadius: '8px' }}>
                <p>Transaction Hash: 
                  <a
                    href={`https://etherscan.io/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#00A3FF', marginLeft: '0.5rem' }}
                  >
                    {formatTxHash(hash)}
                  </a>
                </p>
                {isConfirming && <p style={{ color: '#FFA500' }}>Waiting for confirmation...</p>}
                {isConfirmed && <p style={{ color: '#00FF00' }}>Transaction confirmed!</p>}
              </div>
            )}

            {error && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#2a1a1a', borderRadius: '8px', color: '#FF6B6B' }}>
                <p>Error: {error.message}</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <Link href="/" style={{ marginRight: '1rem' }}>Home</Link>
        <Link href="/admin" style={{ marginRight: '1rem' }}>Admin</Link>
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

export default Approval; 