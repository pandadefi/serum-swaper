import type { NextApiRequest, NextApiResponse } from 'next';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { SWAPPER_CONTRACT_ADDRESS, SWAPPER_ABI } from '../../constants';

type ResponseData = {
  isAllowed: boolean;
  address?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ isAllowed: false, error: 'Invalid address parameter' });
    }

    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://eth.llamarpc.com')
    });

    const isAllowed = await publicClient.readContract({
      address: SWAPPER_CONTRACT_ADDRESS,
      abi: SWAPPER_ABI,
      functionName: 'allowed',
      args: [address as `0x${string}`],
    });

    return res.status(200).json({ isAllowed: !!isAllowed, address });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ isAllowed: false, error: 'Failed to check allowance' });
  }
} 