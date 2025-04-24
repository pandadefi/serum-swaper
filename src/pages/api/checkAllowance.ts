import type { NextApiRequest, NextApiResponse } from 'next';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { SWAPPER_ABI } from '../../constants';

// Create a public client for reading from the blockchain
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

type RequestData = {
  address: string;
  contractAddress: `0x${string}`;
};

type ResponseData = {
  isAllowed: boolean;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ isAllowed: false, error: 'Method not allowed' });
  }

  try {
    const { address, contractAddress } = req.body as RequestData;

    // Validate input
    if (!address || !contractAddress) {
      return res.status(400).json({ isAllowed: false, error: 'Missing address or contractAddress' });
    }

    // Check if the user is allowed to use the contract
    const isAllowed = await publicClient.readContract({
      address: contractAddress,
      abi: SWAPPER_ABI,
      functionName: 'allowed',
      args: [address],
    });

    // Check if the user is the owner (owners are always allowed)
    const ownerAddress = await publicClient.readContract({
      address: contractAddress,
      abi: SWAPPER_ABI,
      functionName: 'owner',
    });

    const isOwner = ownerAddress.toLowerCase() === address.toLowerCase();

    return res.status(200).json({ isAllowed: isAllowed || isOwner });
  } catch (error) {
    console.error('Error checking allowance:', error);
    return res.status(500).json({ isAllowed: false, error: 'Failed to check allowance' });
  }
} 