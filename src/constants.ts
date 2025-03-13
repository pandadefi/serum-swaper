// Swapper contract address
export const SWAPPER_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_SWAPPER_CONTRACT_ADDRESS || '0x404079604e7d565d068ac8e8eb213b4f05b174f4') as `0x${string}`;

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
] as const; 