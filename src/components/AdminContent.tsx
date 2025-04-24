import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from 'wagmi';
import { parseEther, encodeFunctionData, isAddress, formatEther } from 'viem';
import { 
  SWAPPER_CONTRACT_ADDRESSES, 
  SWAPPER_ABI, 
  LIDO_WITHDRAWAL_NFT_ADDRESS, 
  ERC721_ABI,
  WETH_ADDRESS,
  LIDO_WITHDRAWAL_QUEUE_ADDRESS,
} from '../constants';
import styles from '../styles/Home.module.css';

interface WithdrawalRequest {
  requestId: bigint;
  amountOfStETH: bigint;
  amountOfShares: bigint;
  owner: `0x${string}`;
  timestamp: bigint;
  status: string;
}

const AdminContent = () => {
  const [amount, setAmount] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [checkAddress, setCheckAddress] = useState('');
  const [allowAddress, setAllowAddress] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<'withdraw' | 'transferNft' | 'permissions' | 'balances'>('withdraw');
  const { address, isConnected } = useAccount();
  const [allowanceToSet, setAllowanceToSet] = useState<boolean>(true);
  const [checkedAllowance, setCheckedAllowance] = useState<boolean | null>(null);
  const [addressToCheck, setAddressToCheck] = useState<`0x${string}` | undefined>(undefined);
  const [activeContract, setActiveContract] = useState<`0x${string}`>(SWAPPER_CONTRACT_ADDRESSES[0]);
  const [isCheckingOwnership, setIsCheckingOwnership] = useState(true);

  // Check ownership across all contracts
  const { data: ownershipData, isLoading: isLoadingOwnership } = useReadContracts({
    contracts: SWAPPER_CONTRACT_ADDRESSES.map(contractAddress => ({
      address: contractAddress,
      abi: SWAPPER_ABI,
      functionName: 'owner',
    })),
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Find contracts where the connected wallet is owner
  useEffect(() => {
    if (!ownershipData || !address) {
      setIsOwner(false);
      return;
    }
    
    setIsCheckingOwnership(false);
    
    // Check if user is owner of any contract
    const ownedContractIndex = ownershipData.findIndex(data => {
      const owner = data.result as `0x${string}`;
      return owner?.toLowerCase() === address.toLowerCase();
    });
    
    if (ownedContractIndex >= 0) {
      setIsOwner(true);
      setActiveContract(SWAPPER_CONTRACT_ADDRESSES[ownedContractIndex]);
    } else {
      setIsOwner(false);
    }
  }, [ownershipData, address]);

  // Update loading state
  useEffect(() => {
    if (isConnected && address) {
      setIsCheckingOwnership(isLoadingOwnership);
    }
  }, [isLoadingOwnership, isConnected, address]);
  
  // Read allowance for an address when addressToCheck changes
  const { data: allowanceData, isError: allowanceError } = useReadContract({
    address: activeContract,
    abi: SWAPPER_ABI,
    functionName: 'allowed',
    args: addressToCheck ? [addressToCheck] : undefined,
    query: {
      enabled: !!addressToCheck && !!activeContract,
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

  // Read ETH balance from the balances mapping
  const { data: ethBalance, isError: ethError } = useReadContract({
    address: activeContract,
    abi: SWAPPER_ABI,
    functionName: 'balances',
    args: [activeContract],
    query: {
      enabled: !!activeContract,
    }
  });

  // Read stETH balance using the ERC20 balanceOf function
  const { data: stethBalance, isError: stethError } = useReadContract({
    address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', // stETH address
    abi: [
      {
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      }
    ],
    functionName: 'balanceOf',
    args: [activeContract],
    query: {
      enabled: !!activeContract,
    }
  });

  // Read WETH balance
  const { data: wethBalance, isError: wethError } = useReadContract({
    address: WETH_ADDRESS,
    abi: [
      {
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      }
    ],
    functionName: 'balanceOf',
    args: [activeContract],
    query: {
      enabled: !!WETH_ADDRESS && !!activeContract,
    }
  });

  // Read withdrawal request IDs
  const { data: withdrawalRequestIds, isError: withdrawalIdsError } = useReadContract({
    address: LIDO_WITHDRAWAL_QUEUE_ADDRESS,
    abi: [
      {
        inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
        name: 'getWithdrawalRequests',
        outputs: [{ internalType: 'uint256[]', name: 'requestsIds', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'getWithdrawalRequests',
    args: [activeContract],
    query: {
      enabled: !!LIDO_WITHDRAWAL_QUEUE_ADDRESS && !!activeContract,
    }
  });

  // Read withdrawal request statuses
  const { data: withdrawalStatuses, isError: withdrawalStatusError } = useReadContract({
    address: LIDO_WITHDRAWAL_QUEUE_ADDRESS,
    abi: [
      {
        inputs: [{ internalType: 'uint256[]', name: '_requestIds', type: 'uint256[]' }],
        name: 'getWithdrawalStatus',
        outputs: [{
          components: [
            { internalType: 'uint256', name: 'amountOfStETH', type: 'uint256' },
            { internalType: 'uint256', name: 'amountOfShares', type: 'uint256' },
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
            { internalType: 'bool', name: 'isFinalized', type: 'bool' },
            { internalType: 'bool', name: 'isClaimed', type: 'bool' }
          ],
          internalType: 'struct WithdrawalQueueBase.WithdrawalRequestStatus[]',
          name: 'statuses',
          type: 'tuple[]'
        }],
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'getWithdrawalStatus',
    args: [withdrawalRequestIds || []],
    query: {
      enabled: !!LIDO_WITHDRAWAL_QUEUE_ADDRESS && !!withdrawalRequestIds && withdrawalRequestIds.length > 0,
    }
  });

  // Read totalEth from contract
  const { data: totalEth, isError: totalEthError } = useReadContract({
    address: activeContract,
    abi: [{
      inputs: [],
      name: "totalEth",
      outputs: [{ type: "uint256", name: "" }],
      stateMutability: "view",
      type: "function"
    }],
    functionName: 'totalEth',
    query: {
      enabled: !!activeContract,
    }
  });

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!amount || !isOwner) return;
    
    try {
      writeContract({
        address: activeContract,
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
          activeContract, // from (the Swapper contract)
          address, // to (the current user/caller)
          BigInt(tokenId) // tokenId
        ]
      });

      writeContract({
        address: activeContract,
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
        address: activeContract,
        abi: SWAPPER_ABI,
        functionName: 'allow',
        args: [allowAddress as `0x${string}`, allowanceToSet],
      });
    } catch (err) {
      console.error('Error setting allowance:', err);
    }
  };

  // Contract selector component
  const ContractSelector = () => {
    if (SWAPPER_CONTRACT_ADDRESSES.length <= 1) return null;
    
    return (
      <div className={styles.contractSelector}>
        <label className={styles.formLabel}>Select Contract:</label>
        <select 
          value={activeContract}
          onChange={(e) => setActiveContract(e.target.value as `0x${string}`)}
          className={styles.formInput}
          style={{ marginBottom: '1.5rem' }}
        >
          {SWAPPER_CONTRACT_ADDRESSES.map((contract, index) => (
            <option key={contract} value={contract}>
              {contract} {index === 0 ? '(Primary)' : `(Contract ${index + 1})`}
            </option>
          ))}
        </select>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className={styles.connectCard}>
        <div className={styles.connectIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 16.5L14 12.5L10 8.5" stroke="#0D76FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 12.5H3" stroke="#0D76FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 7V5C7 4.46957 7.21071 3.96086 7.58579 3.58579C7.96086 3.21071 8.46957 3 9 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H9C8.46957 22 7.96086 21.7893 7.58579 21.4142C7.21071 21.0391 7 20.5304 7 20V18" stroke="#0D76FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p>Please connect your wallet to access the admin panel.</p>
      </div>
    );
  }

  if (isCheckingOwnership) {
    return (
      <div className={styles.card} style={{ textAlign: 'center', maxWidth: '500px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className={styles.loadingSpinner}></div>
          <p>Checking admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className={styles.card} style={{ textAlign: 'center', borderColor: '#dc3545', maxWidth: '500px' }}>
        <p style={{ color: '#dc3545', marginBottom: '1rem' }}>
          You are not the owner of any swapper contract.
        </p>
        <p>
          Only the contract owner can access the admin panel. Please connect with the owner account.
        </p>
        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6c757d' }}>
          Connected address: {address}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '700px' }}>
      <ContractSelector />
      
      <div className={styles.tabContainer}>
        <button 
          onClick={() => setActiveTab('withdraw')} 
          className={`${styles.tabButton} ${activeTab === 'withdraw' ? styles.tabButtonActive : ''}`}
        >
          Withdraw
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
        <button 
          onClick={() => setActiveTab('balances')} 
          className={`${styles.tabButton} ${activeTab === 'balances' ? styles.tabButtonActive : ''}`}
        >
          Balances
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
        ) : activeTab === 'permissions' ? (
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
        ) : (
          <>
            <h2>Balances & Withdrawal Requests</h2>
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Contract Balances</h3>
                <div style={{ 
                  border: '1px solid #eaeaea',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: '#f9f9f9',
                  marginBottom: '1rem'
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold' }}>WETH Balance:</span>{' '}
                    {wethError ? (
                      <span style={{ color: '#dc3545' }}>Error loading WETH balance</span>
                    ) : wethBalance ? (
                      `${formatEther(wethBalance)} WETH`
                    ) : (
                      'Loading...'
                    )}
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>stETH Balance:</span>{' '}
                    {stethError ? (
                      <span style={{ color: '#dc3545' }}>Error loading stETH balance</span>
                    ) : stethBalance ? (
                      `${formatEther(stethBalance)} stETH`
                    ) : (
                      'Loading...'
                    )}
                  </div>
                </div>

                <div style={{ 
                  border: '1px solid #eaeaea',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: '#f9f9f9',
                  marginBottom: '1rem'
                }}>
                  <div style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                    <span style={{ fontWeight: 'bold' }}>Contract Total ETH:</span>{' '}
                    {totalEthError ? (
                      <span style={{ color: '#dc3545' }}>Error loading total ETH</span>
                    ) : totalEth ? (
                      `${formatEther(totalEth)} ETH`
                    ) : (
                      'Loading...'
                    )}
                  </div>
                  <div style={{ 
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #eaeaea',
                    fontSize: '1.1rem'
                  }}>
                    <span style={{ fontWeight: 'bold' }}>Total Assets:</span>{' '}
                    {totalEthError || wethError || withdrawalStatusError ? (
                      <span style={{ color: '#dc3545' }}>Error loading balances</span>
                    ) : totalEth && wethBalance && withdrawalStatuses ? (
                      `${formatEther(
                        wethBalance + 
                        withdrawalStatuses.reduce(
                          (acc, status) => acc + status.amountOfStETH,
                          BigInt(0)
                        )
                      )} ETH`
                    ) : (
                      'Loading...'
                    )}
                  </div>
                  <div style={{ 
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #eaeaea',
                    fontSize: '1.1rem',
                    color: '#28a745'
                  }}>
                    <span style={{ fontWeight: 'bold' }}>Total Gains:</span>{' '}
                    {totalEthError || wethError || withdrawalStatusError ? (
                      <span style={{ color: '#dc3545' }}>Error loading balances</span>
                    ) : totalEth && wethBalance && withdrawalStatuses ? (
                      `${formatEther(
                        (wethBalance + 
                        withdrawalStatuses.reduce(
                          (acc, status) => acc + status.amountOfStETH,
                          BigInt(0)
                        )) - totalEth
                      )} ETH`
                    ) : (
                      'Loading...'
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Withdrawal Requests</h3>
                {withdrawalIdsError ? (
                  <p style={{ color: '#dc3545' }}>Error loading withdrawal request IDs</p>
                ) : withdrawalStatusError ? (
                  <p style={{ color: '#dc3545' }}>Error loading withdrawal request statuses</p>
                ) : withdrawalRequestIds && withdrawalStatuses ? (
                  withdrawalRequestIds.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {withdrawalRequestIds.map((requestId, index) => {
                        const status = withdrawalStatuses[index];
                        return (
                          <div key={index} style={{ 
                            border: '1px solid #eaeaea',
                            borderRadius: '8px',
                            padding: '1rem',
                            backgroundColor: '#f9f9f9'
                          }}>
                            <div>
                              <span style={{ fontWeight: 'bold' }}>Request ID:</span>{' '}
                              {requestId.toString()}
                            </div>
                            <div>
                              <span style={{ fontWeight: 'bold' }}>Amount:</span>{' '}
                              {formatEther(status.amountOfStETH)} stETH
                            </div>
                            <div>
                              <span style={{ fontWeight: 'bold' }}>Status:</span>{' '}
                              {status.isFinalized ? 'Finalized' : 'Pending'}
                              {status.isClaimed ? ' (Claimed)' : ''}
                            </div>
                            <div>
                              <span style={{ fontWeight: 'bold' }}>Timestamp:</span>{' '}
                              {new Date(Number(status.timestamp) * 1000).toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p>No withdrawal requests found.</p>
                  )
                ) : (
                  <p>Loading withdrawal requests...</p>
                )}
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
    </div>
  );
};

export default AdminContent; 