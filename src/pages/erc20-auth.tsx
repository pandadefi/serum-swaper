import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';
import { ERC20_ABI, STETH_ADDRESS } from '../constants';

const ERC20Auth: NextPage = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [tokenAddress, setTokenAddress] = useState<string>(STETH_ADDRESS);
  const [spenderAddress, setSpenderAddress] = useState<string>('');
  const [approvalAmount, setApprovalAmount] = useState<string>('');
  const [fromAddress, setFromAddress] = useState<string>('');
  const [toAddress, setToAddress] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'approve' | 'transfer'>('approve');
  
  const { address, isConnected } = useAccount();
  
  // Set mounted state for client-side rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get token balance for the connected user
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: [...ERC20_ABI, {
      inputs: [
        { internalType: 'address', name: 'from', type: 'address' },
        { internalType: 'address', name: 'to', type: 'address' },
        { internalType: 'uint256', name: 'amount', type: 'uint256' }
      ],
      name: 'transferFrom',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
      type: 'function',
    }],
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!address && !!tokenAddress && isAddress(tokenAddress),
    },
  });

  // Get current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [
      address || '0x0000000000000000000000000000000000000000',
      spenderAddress as `0x${string}` || '0x0000000000000000000000000000000000000000'
    ],
    query: {
      enabled: !!address && !!spenderAddress && isAddress(tokenAddress) && isAddress(spenderAddress),
    },
  });

  // Get token balance for the from address (for transferFrom)
  const { data: fromAddressBalance, refetch: refetchFromBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [fromAddress as `0x${string}` || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!fromAddress && !!tokenAddress && isAddress(tokenAddress) && isAddress(fromAddress),
    },
  });

  // Get allowance for transferFrom (from fromAddress to connected address)
  const { data: transferAllowance, refetch: refetchTransferAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [
      fromAddress as `0x${string}` || '0x0000000000000000000000000000000000000000',
      address || '0x0000000000000000000000000000000000000000'
    ],
    query: {
      enabled: !!address && !!fromAddress && !!tokenAddress && isAddress(tokenAddress) && isAddress(fromAddress),
    },
  });

  // Write to contract
  const { data: hash, isPending, error, writeContract } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // Reset form and refetch balances after successful transaction
  useEffect(() => {
    if (isConfirmed) {
      if (activeTab === 'approve') {
        setApprovalAmount('');
        refetchAllowance();
      } else {
        setTransferAmount('');
        refetchTokenBalance();
        refetchFromBalance();
        refetchTransferAllowance();
      }
    }
  }, [isConfirmed, activeTab, refetchAllowance, refetchTokenBalance, refetchFromBalance, refetchTransferAllowance]);

  // Handle approve
  const handleApprove = async () => {
    if (!approvalAmount || !spenderAddress || !isAddress(tokenAddress) || !isAddress(spenderAddress)) return;
    
    try {
      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, parseEther(approvalAmount)],
      });
    } catch (err) {
      console.error('Error approving tokens:', err);
    }
  };

  // Handle transfer from
  const handleTransferFrom = async () => {
    if (!transferAmount || !fromAddress || !toAddress || !isAddress(tokenAddress) || !isAddress(fromAddress) || !isAddress(toAddress)) return;
    
    try {
      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: [...ERC20_ABI, {
          inputs: [
            { internalType: 'address', name: 'from', type: 'address' },
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' }
          ],
          name: 'transferFrom',
          outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function',
        }],
        functionName: 'transferFrom',
        args: [fromAddress as `0x${string}`, toAddress as `0x${string}`, parseEther(transferAmount)],
      });
    } catch (err) {
      console.error('Error transferring tokens:', err);
    }
  };

  // Format token balance
  const formatTokenBalance = (balance: bigint | undefined) => {
    return balance ? parseFloat(formatEther(balance)).toFixed(4) : '0.0000';
  };

  // Format transaction hash for display
  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Validation helpers
  const isValidApproval = () => {
    return approvalAmount && 
           spenderAddress && 
           isAddress(tokenAddress) && 
           isAddress(spenderAddress) &&
           parseFloat(approvalAmount) > 0;
  };

  const isValidTransfer = () => {
    return transferAmount && 
           fromAddress && 
           toAddress && 
           isAddress(tokenAddress) && 
           isAddress(fromAddress) && 
           isAddress(toAddress) &&
           parseFloat(transferAmount) > 0;
  };

  if (!isMounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>ERC20 Authorization - Staked stETH</title>
        <meta content="ERC20 token authorization and transfer interface" name="description" />
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
            <h1 className={styles.title}>ERC20 Authorization</h1>
          </div>
          <p className={styles.description}>
            Manage ERC20 token approvals and transfers
          </p>
        </div>

        {!isConnected ? (
          <div className={styles.connectPrompt}>
            <p>Please connect your wallet to continue</p>
          </div>
        ) : (
          <div className={styles.card}>
            {/* Tab Navigation */}
            <div className={styles.tabContainer}>
              <button
                className={`${styles.tab} ${activeTab === 'approve' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('approve')}
              >
                Approve Tokens
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'transfer' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('transfer')}
              >
                Transfer From
              </button>
            </div>

            {/* Token Address Input (Common) */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Token Contract Address:</label>
              <input
                className={styles.input}
                type="text"
                placeholder="0x..."
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
              />
              {tokenAddress && !isAddress(tokenAddress) && (
                <div className={styles.error}>Invalid token address</div>
              )}
            </div>

            {/* Approval Tab */}
            {activeTab === 'approve' && (
              <>
                <div className={styles.balanceDisplay}>
                  <span>Your Token Balance: {formatTokenBalance(tokenBalance)}</span>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Spender Address (Address to approve):</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="0x..."
                    value={spenderAddress}
                    onChange={(e) => setSpenderAddress(e.target.value)}
                  />
                  {spenderAddress && !isAddress(spenderAddress) && (
                    <div className={styles.error}>Invalid spender address</div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Approval Amount:</label>
                  <input
                    className={styles.input}
                    type="number"
                    placeholder="0.0"
                    value={approvalAmount}
                    onChange={(e) => setApprovalAmount(e.target.value)}
                    step="0.0001"
                    min="0"
                  />
                </div>

                {currentAllowance !== undefined && spenderAddress && isAddress(spenderAddress) && (
                  <div className={styles.balanceDisplay}>
                    <span>Current Allowance: {formatTokenBalance(currentAllowance)}</span>
                  </div>
                )}

                <button
                  className={`${styles.button} ${!isValidApproval() ? styles.buttonDisabled : ''}`}
                  onClick={handleApprove}
                  disabled={!isValidApproval() || isPending || isConfirming}
                >
                  {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Approve Tokens'}
                </button>
              </>
            )}

            {/* Transfer Tab */}
            {activeTab === 'transfer' && (
              <>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>From Address (Token owner):</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="0x..."
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                  />
                  {fromAddress && !isAddress(fromAddress) && (
                    <div className={styles.error}>Invalid from address</div>
                  )}
                </div>

                {fromAddressBalance !== undefined && fromAddress && isAddress(fromAddress) && (
                  <div className={styles.balanceDisplay}>
                    <span>From Address Balance: {formatTokenBalance(fromAddressBalance)}</span>
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <label className={styles.label}>To Address (Recipient):</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="0x..."
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                  />
                  {toAddress && !isAddress(toAddress) && (
                    <div className={styles.error}>Invalid to address</div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Transfer Amount:</label>
                  <input
                    className={styles.input}
                    type="number"
                    placeholder="0.0"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    step="0.0001"
                    min="0"
                  />
                </div>

                {transferAllowance !== undefined && fromAddress && isAddress(fromAddress) && (
                  <div className={styles.balanceDisplay}>
                    <span>Your Allowance: {formatTokenBalance(transferAllowance)}</span>
                  </div>
                )}

                <button
                  className={`${styles.button} ${!isValidTransfer() ? styles.buttonDisabled : ''}`}
                  onClick={handleTransferFrom}
                  disabled={!isValidTransfer() || isPending || isConfirming}
                >
                  {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Transfer From'}
                </button>
              </>
            )}

            {/* Transaction Status */}
            {hash && (
              <div className={styles.transactionStatus}>
                <p>Transaction Hash: 
                  <a 
                    href={`https://etherscan.io/tx/${hash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    {formatTxHash(hash)}
                  </a>
                </p>
                {isConfirming && <p>Waiting for confirmation...</p>}
                {isConfirmed && <p style={{ color: 'green' }}>Transaction confirmed!</p>}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className={styles.error}>
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

export default ERC20Auth; 