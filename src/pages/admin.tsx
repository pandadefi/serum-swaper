import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, encodeFunctionData, isAddress } from 'viem';
import { SWAPPER_CONTRACT_ADDRESS, SWAPPER_ABI, LIDO_WITHDRAWAL_NFT_ADDRESS, ERC721_ABI } from '../constants';
import Link from 'next/link';

const Admin: NextPage = () => {
  const [amount, setAmount] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [checkAddress, setCheckAddress] = useState('');
  const [allowAddress, setAllowAddress] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<'withdraw' | 'transferNft' | 'permissions'>('withdraw');
  const { address, isConnected } = useAccount();
  const [allowanceToSet, setAllowanceToSet] = useState<boolean>(true);
  const [checkedAllowance, setCheckedAllowance] = useState<boolean | null>(null);
  const [addressToCheck, setAddressToCheck] = useState<`0x${string}` | undefined>(undefined);

  // Read contract to check if connected wallet is owner
  const { data: ownerAddress } = useReadContract({
    address: SWAPPER_CONTRACT_ADDRESS,
    abi: SWAPPER_ABI,
    functionName: 'owner',
  });
  
  // Read allowance for an address when addressToCheck changes
  const { data: allowanceData, isError: allowanceError } = useReadContract({
    address: SWAPPER_CONTRACT_ADDRESS,
    abi: SWAPPER_ABI,
    functionName: 'allowed',
    args: addressToCheck ? [addressToCheck] : undefined,
    query: {
      enabled: !!addressToCheck,
    }
  });
  
  // Update checkedAllowance when allowanceData changes
  useEffect(() => {
    if (addressToCheck && !allowanceError) {
      setCheckedAllowance(!!allowanceData);
    }
  }, [allowanceData, addressToCheck, allowanceError]);
  
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

  // Handle transfer NFT
  const handleTransferNFT = async () => {
    if (!tokenId || !isOwner || !address) return;
    
    try {
      // Encode the transferFrom function call for the Lido NFT contract
      const transferData = encodeFunctionData({
        abi: ERC721_ABI,
        functionName: 'transferFrom',
        args: [
          SWAPPER_CONTRACT_ADDRESS, // from (the Swapper contract)
          address, // to (the current user/caller)
          BigInt(tokenId) // tokenId
        ]
      });

      writeContract({
        address: SWAPPER_CONTRACT_ADDRESS,
        abi: SWAPPER_ABI,
        functionName: 'execute',
        args: [
          LIDO_WITHDRAWAL_NFT_ADDRESS, // _to (Lido Withdrawal NFT contract)
          BigInt(0), // value (no ETH needed for transferFrom)
          transferData // _data (encoded transferFrom function call)
        ],
      });
    } catch (err) {
      console.error('Error transferring NFT:', err);
    }
  };

  // Handle check address allowance
  const handleCheckAllowance = () => {
    if (!checkAddress || !isAddress(checkAddress)) {
      alert('Please enter a valid Ethereum address');
      return;
    }

    // Set the address to check, which will trigger the useReadContract hook
    setAddressToCheck(checkAddress as `0x${string}`);
  };

  // Handle set address allowance
  const handleSetAllowance = async () => {
    if (!allowAddress || !isAddress(allowAddress) || !isOwner) return;
    
    try {
      writeContract({
        address: SWAPPER_CONTRACT_ADDRESS,
        abi: SWAPPER_ABI,
        functionName: 'allow',
        args: [allowAddress as `0x${string}`, allowanceToSet],
      });
    } catch (err) {
      console.error('Error setting allowance:', err);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Admin - Staked stETH</title>
        <meta content="Admin functions for the Staked stETH contract" name="description" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </Head>

      <main className={styles.main}>
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <ConnectButton />
        </div>

        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="24" fill="#00A3FF" />
              <path d="M36 24C36 30.6274 30.6274 36 24 36C17.3726 36 12 30.6274 12 24C12 17.3726 17.3726 12 24 12C30.6274 12 36 17.3726 36 24Z" fill="white" />
              <path d="M31 24C31 27.866 27.866 31 24 31C20.134 31 17 27.866 17 24C17 20.134 20.134 17 24 17C27.866 17 31 20.134 31 24Z" fill="#00A3FF" />
              <path d="M24 28L28 24L24 20L20 24L24 28Z" fill="white" />
            </svg>
            <h1 className={styles.title}>Staked stETH Admin</h1>
          </div>
          <p className={styles.description}>
            Perform administrative actions on the Staked stETH contract
          </p>
        </div>

        {!isConnected ? (
          <div className={styles.card} style={{ textAlign: 'center' }}>
            <p>Please connect your wallet to access admin functions.</p>
          </div>
        ) : !isOwner ? (
          <div className={styles.card} style={{ textAlign: 'center', borderColor: '#dc3545' }}>
            <p style={{ color: '#dc3545' }}>
              Only the contract owner can access this page.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.tabContainer}>
              <button 
                onClick={() => setActiveTab('withdraw')} 
                className={`${styles.tabButton} ${activeTab === 'withdraw' ? styles.tabButtonActive : ''}`}
              >
                Withdraw ETH
              </button>
              <button 
                onClick={() => setActiveTab('transferNft')} 
                className={`${styles.tabButton} ${activeTab === 'transferNft' ? styles.tabButtonActive : ''}`}
              >
                Transfer NFT
              </button>
              <button 
                onClick={() => setActiveTab('permissions')} 
                className={`${styles.tabButton} ${activeTab === 'permissions' ? styles.tabButtonActive : ''}`}
              >
                Permissions
              </button>
            </div>

            <div className={styles.card} style={{ width: '100%', maxWidth: '500px' }}>
              {activeTab === 'withdraw' ? (
                <>
                  <h2>Withdraw ETH</h2>
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label htmlFor="amount" className={styles.formLabel}>
                        Amount (ETH):
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
                      onClick={handleWithdraw}
                      disabled={!amount || isPending || isConfirming}
                      className={styles.actionButton}
                    >
                      {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Withdraw'}
                    </button>
                  </div>
                </>
              ) : activeTab === 'transferNft' ? (
                <>
                  <h2>Transfer NFT</h2>
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label htmlFor="tokenId" className={styles.formLabel}>
                        NFT Token ID:
                      </label>
                      <input
                        id="tokenId"
                        type="text"
                        value={tokenId}
                        onChange={(e) => setTokenId(e.target.value)}
                        placeholder="Enter token ID"
                        className={styles.formInput}
                      />
                    </div>
                    
                    <button
                      onClick={handleTransferNFT}
                      disabled={!tokenId || isPending || isConfirming}
                      className={styles.actionButton}
                    >
                      {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Transfer NFT'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2>Manage Permissions</h2>
                  <div style={{ marginTop: '1.5rem' }}>
                    {/* Check address allowance */}
                    <div style={{ marginBottom: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Check Address Allowance</h3>
                      <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="checkAddress" className={styles.formLabel}>
                          Ethereum Address:
                        </label>
                        <div style={{ display: 'flex' }}>
                          <input
                            id="checkAddress"
                            type="text"
                            value={checkAddress}
                            onChange={(e) => setCheckAddress(e.target.value)}
                            placeholder="0x..."
                            className={styles.formInput}
                            style={{ flexGrow: 1, marginRight: '0.5rem' }}
                          />
                          <button
                            onClick={handleCheckAllowance}
                            className={styles.actionButton}
                          >
                            Check
                          </button>
                        </div>
                      </div>
                      
                      {checkedAllowance !== null && (
                        <div className={checkedAllowance ? styles.successMessage : styles.errorMessage}>
                          Address {checkAddress.substring(0, 6)}...{checkAddress.substring(checkAddress.length - 4)} is 
                          {checkedAllowance ? ' allowed' : ' not allowed'} to use the contract.
                        </div>
                      )}
                    </div>
                    
                    {/* Set address allowance */}
                    <div>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Set Address Allowance</h3>
                      <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="allowAddress" className={styles.formLabel}>
                          Ethereum Address:
                        </label>
                        <input
                          id="allowAddress"
                          type="text"
                          value={allowAddress}
                          onChange={(e) => setAllowAddress(e.target.value)}
                          placeholder="0x..."
                          className={styles.formInput}
                        />
                      </div>
                      
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div className={styles.formLabel}>Permission:</div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="allowance"
                              checked={allowanceToSet === true}
                              onChange={() => setAllowanceToSet(true)}
                              style={{ marginRight: '0.5rem' }}
                            />
                            Allow
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="allowance"
                              checked={allowanceToSet === false}
                              onChange={() => setAllowanceToSet(false)}
                              style={{ marginRight: '0.5rem' }}
                            />
                            Disallow
                          </label>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleSetAllowance}
                        disabled={!allowAddress || !isAddress(allowAddress) || isPending || isConfirming}
                        className={styles.actionButton}
                      >
                        {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Set Permission'}
                      </button>
                    </div>
                  </div>
                </>
              )}
              
              {error && (
                <div className={styles.errorMessage}>
                  Error: {error.message}
                </div>
              )}
              
              {isConfirmed && (
                <div className={styles.successMessage}>
                  {activeTab === 'withdraw' ? 'Withdrawal' : 
                   activeTab === 'transferNft' ? 'NFT transfer' : 'Permission update'} successful!
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <Link href="/" style={{ marginRight: '1rem' }}>Home</Link>
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

export default Admin; 