// Swapper contract address
export const SWAPPER_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_SWAPPER_CONTRACT_ADDRESS || '0x58d7DdD74292bD5faF69b0821abA4fd8f0bB9724') as `0x${string}`;

// Lido Withdrawal NFT contract address
export const LIDO_WITHDRAWAL_NFT_ADDRESS = '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1' as `0x${string}`;

// Lido stETH Token address (Ethereum Mainnet)
export const STETH_ADDRESS = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' as `0x${string}`;

// WETH Token address (Ethereum Mainnet)
export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`;

// Lido Withdrawal Queue contract address
export const LIDO_WITHDRAWAL_QUEUE_ADDRESS = '0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1' as `0x${string}`;

// Swapper contract ABI (just the functions we need)
export const SWAPPER_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'bytes', name: '_data', type: 'bytes' }
    ],
    name: 'execute',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'depositEth',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'depositSteth',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'withdrawEth',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'withdrawSteth',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'allowed',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_address', type: 'address' },
      { internalType: 'bool', name: '_allowed', type: 'bool' }
    ],
    name: 'allow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getEthBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getStethBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    name: 'getWithdrawalRequests',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'requestId', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOfStETH', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOfShares', type: 'uint256' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
          { internalType: 'string', name: 'status', type: 'string' }
        ],
        internalType: 'struct IWithdrawalQueueERC721.WithdrawalRequestStatus[]',
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ERC721 minimal ABI for transferFrom function
export const ERC721_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' }
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  }
] as const;

// ERC20 minimal ABI for balanceOf and other token functions
export const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const;

// Lido Withdrawal Queue ABI
export const LIDO_WITHDRAWAL_QUEUE_ABI = [
  {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    name: 'getWithdrawalRequests',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'requestId', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOfStETH', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOfShares', type: 'uint256' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
          { internalType: 'string', name: 'status', type: 'string' }
        ],
        internalType: 'struct IWithdrawalQueueERC721.WithdrawalRequestStatus[]',
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const; 