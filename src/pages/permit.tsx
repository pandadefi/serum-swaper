import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSignTypedData, useChainId } from 'wagmi';
import { parseEther, formatEther, hexToBigInt, encodeFunctionData } from 'viem';
import { STETH_ADDRESS, ERC20_ABI } from '../constants';
import Link from 'next/link';

// Extended ERC20 ABI with transferWithAuthorization function (EIP-3009)
const ERC20_PERMIT_ABI = [
  ...ERC20_ABI,
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    name: 'transferWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'authorizer', type: 'address' }, { name: 'nonce', type: 'bytes32' }],
    name: 'authorizationState',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const;

// Preset token list
const PRESET_TOKENS = [
  {
    name: 'stETH',
    symbol: 'stETH', 
    address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    decimals: 18
  },
  {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6
  },
  {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    decimals: 18
  },
  {
    name: 'USDS',
    symbol: 'USDS',
    address: '0xdC035D45d973E3EC169d2276DDab16f1e407384F',
    decimals: 18
  }
];

const Permit: NextPage = () => {
  const [selectedToken, setSelectedToken] = useState<string>('stETH');
  const [customTokenAddress, setCustomTokenAddress] = useState<string>('');
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  const [spenderAddress, setSpenderAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'create' | 'use'>('create');
  const [authSignature, setAuthSignature] = useState<{
    v: number;
    r: `0x${string}`;
    s: `0x${string}`;
    validAfter: bigint;
    validBefore: bigint;
    nonce: `0x${string}`;
    amount: bigint;
    from: string;
    to: string;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [recipient, setRecipient] = useState<string>('');

  // Get current token address based on selection
  const tokenAddress = selectedToken === 'custom' 
    ? customTokenAddress 
    : PRESET_TOKENS.find(token => token.symbol === selectedToken)?.address || '';

  // Handle token selection change
  const handleTokenChange = (value: string) => {
    setSelectedToken(value);
    if (value !== 'custom') {
      setCustomTokenAddress('');
    }
  };

  // Get current token info
  const currentTokenInfo = PRESET_TOKENS.find(token => token.symbol === selectedToken);

  // Format balance based on token decimals
  const formatTokenBalance = (balance: bigint, decimals: number = 18) => {
    const divisor = BigInt(10 ** decimals);
    const wholePart = balance / divisor;
    const fractionalPart = balance % divisor;
    
    // Convert to string with proper decimal places
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '').slice(0, 4); // Show max 4 decimal places, trim trailing zeros
    
    if (trimmedFractional === '') {
      return wholePart.toString();
    }
    
    return `${wholePart.toString()}.${trimmedFractional}`;
  };

  // Parse amount based on token decimals
  const parseTokenAmount = (amount: string, decimals: number = 18) => {
    if (!amount || amount === '') return BigInt(0);
    
    // Handle decimal input
    const parts = amount.split('.');
    const wholePart = parts[0] || '0';
    const fractionalPart = parts[1] || '';
    
    // Pad or truncate fractional part to match token decimals
    const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
    
    // Combine whole and fractional parts
    const fullNumber = wholePart + paddedFractional;
    
    return BigInt(fullNumber);
  };

  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Set mounted state for client-side rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-populate owner address when connected
  useEffect(() => {
    if (address && activeTab === 'create') {
      setOwnerAddress(address);
    }
  }, [address, activeTab]);

  // Fetch token details
  const { data: tokenName } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_PERMIT_ABI,
    functionName: 'name',
    query: {
      enabled: !!tokenAddress && tokenAddress.length === 42,
    },
  });

  const { data: domainSeparator } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_PERMIT_ABI,
    functionName: 'DOMAIN_SEPARATOR',
    query: {
      enabled: !!tokenAddress && tokenAddress.length === 42,
    },
  });

  // Generate a random nonce for EIP-3009
  const generateNonce = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return '0x' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('') as `0x${string}`;
  };

  const { data: ownerBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_PERMIT_ABI,
    functionName: 'balanceOf',
    args: [ownerAddress as `0x${string}`],
    query: {
      enabled: !!tokenAddress && !!ownerAddress && tokenAddress.length === 42 && ownerAddress.length === 42,
    },
  });

  // Sign typed data for permit
  const { signTypedData, data: signature, isPending: isSignaturePending } = useSignTypedData();

  // Write to contract
  const { data: hash, isPending, error, writeContract } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // Create authorization signature for transferWithAuthorization
  const handleCreatePermit = async () => {
    if (!tokenAddress || !ownerAddress || !spenderAddress || !amount || !deadline) return;
    if (!tokenName) return;

    const validAfter = BigInt(0); // Valid immediately
    const validBefore = BigInt(Math.floor(Date.now() / 1000) + parseInt(deadline) * 60);
    const tokenDecimals = currentTokenInfo?.decimals || 18;
    const amountBigInt = parseTokenAmount(amount, tokenDecimals);
    const nonce = generateNonce();

    // Store the signature parameters for later use
    const signatureParams = {
      validAfter,
      validBefore,
      amountBigInt,
      nonce,
      fromAddress: ownerAddress,
      toAddress: spenderAddress,
    };

    // Store in component state temporarily
    (window as any).pendingSignatureParams = signatureParams;

    // USDC uses specific domain configuration
    const domain = {
      name: tokenName,
      version: selectedToken === 'USDC' ? '2' : '2', // USDC uses version 2
      chainId: chainId,
      verifyingContract: tokenAddress as `0x${string}`,
    };

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    const message = {
      from: ownerAddress as `0x${string}`,
      to: spenderAddress as `0x${string}`,
      value: amountBigInt,
      validAfter: validAfter,
      validBefore: validBefore,
      nonce: nonce,
    };

    try {
      await signTypedData({
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message,
      });
    } catch (err) {
      console.error('Error signing authorization:', err);
    }
  };

  // Process signature when available and store authorization data
  useEffect(() => {
    if (signature && deadline) {
      // Get the stored signature parameters
      const params = (window as any).pendingSignatureParams;
      if (!params) return;
      
      // Parse the signature
      const r = signature.slice(0, 66) as `0x${string}`;
      const s = ('0x' + signature.slice(66, 130)) as `0x${string}`;
      const v = parseInt(signature.slice(130, 132), 16);

      setAuthSignature({
        v,
        r,
        s,
        validAfter: params.validAfter,
        validBefore: params.validBefore,
        nonce: params.nonce,
        amount: params.amountBigInt,
        from: params.fromAddress,
        to: params.toAddress,
      });
      
      // Clean up
      delete (window as any).pendingSignatureParams;
    }
  }, [signature, deadline]);

  // Use transferWithAuthorization to transfer tokens in one transaction
  const handleUseAuth = async () => {
    if (!authSignature || !tokenAddress) return;

    try {
      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_PERMIT_ABI,
        functionName: 'transferWithAuthorization',
        args: [
          authSignature.from as `0x${string}`,
          authSignature.to as `0x${string}`,
          authSignature.amount,
          authSignature.validAfter,
          authSignature.validBefore,
          authSignature.nonce,
          authSignature.v,
          authSignature.r,
          authSignature.s,
        ],
      });
    } catch (err) {
      console.error('Error using transferWithAuthorization:', err);
    }
  };

  // Reset form after successful transaction
  useEffect(() => {
    if (isConfirmed) {
      if (activeTab === 'create') {
        setAmount('');
        setSpenderAddress('');
        setDeadline('');
        setAuthSignature(null);
      } else {
        setRecipient('');
        setAmount('');
      }
    }
  }, [isConfirmed, activeTab]);

  // Format address for display
  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>ERC20 Permit - Gasless Approvals</title>
        <meta content="Create and use ERC20 permits for gasless token approvals" name="description" />
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
            <h1 className={styles.title}>ERC20 Permit</h1>
          </div>
          <p className={styles.description}>
            Create gasless approvals and authorize token transfers
          </p>
        </div>

        {!isConnected ? (
          <div className={styles.connectCard}>
            <div className={styles.connectIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7V10C2 16 6 21.5 12 22C18 21.5 22 16 22 10V7L12 2Z" 
                      stroke="#00A3FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <h3>Connect Your Wallet</h3>
            <p>Please connect your wallet to create and use ERC20 permits</p>
          </div>
        ) : (
          <div className={styles.swapCard}>
            <div className={styles.tabContainer}>
              <button
                className={`${styles.tabButton} ${activeTab === 'create' ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveTab('create')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                </svg>
                Create Permit
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'use' ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveTab('use')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 17L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 7H17V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Use Permit
              </button>
            </div>

            <div className={styles.swapBody}>
              {activeTab === 'create' ? (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.formLabel}>Token</label>
                    <select
                      className={styles.formInput}
                      value={selectedToken}
                      onChange={(e) => handleTokenChange(e.target.value)}
                    >
                      {PRESET_TOKENS.map(token => (
                        <option key={token.symbol} value={token.symbol}>
                          {token.name} ({token.symbol})
                        </option>
                      ))}
                      <option value="custom">Custom Token Address</option>
                    </select>
                    
                    {selectedToken === 'custom' && (
                      <input
                        type="text"
                        className={styles.formInput}
                        value={customTokenAddress}
                        onChange={(e) => setCustomTokenAddress(e.target.value)}
                        placeholder="0x..."
                        style={{ marginTop: '0.5rem' }}
                      />
                    )}
                    
                    {tokenName && (
                      <div className={styles.balanceHint}>
                        Token: <span>{tokenName}</span>
                      </div>
                    )}
                    
                    {tokenAddress && (
                      <div className={styles.balanceHint}>
                        Address: <span>{tokenAddress}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.formLabel}>Owner Address (Your Address)</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={ownerAddress}
                      onChange={(e) => setOwnerAddress(e.target.value)}
                      placeholder="0x..."
                    />
                                         {ownerBalance && (
                       <div className={styles.balanceHint}>
                         Balance: <span>{formatTokenBalance(ownerBalance, currentTokenInfo?.decimals || 18)} {selectedToken === 'custom' ? 'tokens' : currentTokenInfo?.symbol}</span>
                       </div>
                     )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.formLabel}>Spender Address</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={spenderAddress}
                      onChange={(e) => setSpenderAddress(e.target.value)}
                      placeholder="0x..."
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.formLabel}>Amount</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.formLabel}>Deadline (minutes from now)</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      placeholder="60"
                      min="1"
                    />
                  </div>

                  {authSignature ? (
                    <div className={styles.successMessage}>
                      <h4>✓ Authorization Signature Created!</h4>
                      <p><strong>V:</strong> {authSignature.v}</p>
                      <p><strong>R:</strong> {formatAddress(authSignature.r)}</p>
                      <p><strong>S:</strong> {formatAddress(authSignature.s)}</p>
                      <p><strong>Valid Until:</strong> {new Date(Number(authSignature.validBefore) * 1000).toLocaleString()}</p>
                      <p><strong>Nonce:</strong> {formatAddress(authSignature.nonce)}</p>
                    </div>
                  ) : (
                    <button
                      className={styles.actionButton}
                      onClick={handleCreatePermit}
                      disabled={isSignaturePending || !tokenAddress || !ownerAddress || !spenderAddress || !amount || !deadline}
                    >
                      {isSignaturePending ? (
                        <>
                          <div className={styles.loadingSpinner}></div>
                          Signing...
                        </>
                      ) : (
                        'Create Authorization Signature'
                      )}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.formLabel}>Token</label>
                    <select
                      className={styles.formInput}
                      value={selectedToken}
                      onChange={(e) => handleTokenChange(e.target.value)}
                    >
                      {PRESET_TOKENS.map(token => (
                        <option key={token.symbol} value={token.symbol}>
                          {token.name} ({token.symbol})
                        </option>
                      ))}
                      <option value="custom">Custom Token Address</option>
                    </select>
                    
                    {selectedToken === 'custom' && (
                      <input
                        type="text"
                        className={styles.formInput}
                        value={customTokenAddress}
                        onChange={(e) => setCustomTokenAddress(e.target.value)}
                        placeholder="0x..."
                        style={{ marginTop: '0.5rem' }}
                      />
                    )}
                    
                    {tokenAddress && (
                      <div className={styles.balanceHint}>
                        Address: <span>{tokenAddress}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.formLabel}>Owner Address (Address that signed permit)</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={ownerAddress}
                      onChange={(e) => setOwnerAddress(e.target.value)}
                      placeholder="0x..."
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.formLabel}>Recipient Address (Where to send tokens)</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="0x..."
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.formLabel}>Amount</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                    />
                  </div>

                  {authSignature ? (
                    <div className={styles.infoMessage}>
                      <h4>Using Authorization Signature</h4>
                      <p>Execute the gasless transfer with authorization in a single transaction</p>
                      <button
                        className={styles.actionButton}
                        onClick={handleUseAuth}
                        disabled={isPending || !tokenAddress || !ownerAddress || !recipient || !amount}
                        style={{ marginTop: '1rem' }}
                      >
                        {isPending ? (
                          <>
                            <div className={styles.loadingSpinner}></div>
                            Processing...
                          </>
                        ) : (
                          'Transfer with Authorization'
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.errorMessage}>
                      <h4>No Authorization Signature</h4>
                      <p>Please create an authorization signature first in the `Create Permit` tab</p>
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className={styles.errorMessage}>
                  <h4>Transaction Error</h4>
                  <p>{error.message}</p>
                </div>
              )}

              {hash && (
                <div className={styles.successMessage}>
                  <h4>Transaction Submitted!</h4>
                  <p>
                    <a
                      href={`https://etherscan.io/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.txLink}
                    >
                      View on Etherscan: {formatAddress(hash)}
                    </a>
                  </p>
                  {isConfirming && <p>Waiting for confirmation...</p>}
                  {isConfirmed && <p>✓ Transaction confirmed!</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <Link href="/" style={{ marginRight: '1rem' }}>Home</Link>
        <Link href="/admin">Admin</Link>
      </footer>
    </div>
  );
};

export default Permit; 