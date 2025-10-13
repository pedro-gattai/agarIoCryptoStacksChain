/**
 * Formats a blockchain address to a shorter, more readable format
 * @param address - The full blockchain address
 * @param startChars - Number of characters to show at the start (default: 5)
 * @param endChars - Number of characters to show at the end (default: 4)
 * @returns Formatted address like "SP2J6...XYZ9"
 */
export const formatAddress = (
  address: string | null | undefined,
  startChars: number = 5,
  endChars: number = 4
): string => {
  if (!address) return '';

  if (address.length <= startChars + endChars) {
    return address;
  }

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Copies text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copy is successful
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

/**
 * Gets the Stacks Explorer URL for an address
 * @param address - The blockchain address
 * @param network - Network type ('mainnet' or 'testnet')
 * @returns Full explorer URL
 */
export const getExplorerUrl = (
  address: string,
  network: 'mainnet' | 'testnet' = 'testnet'
): string => {
  const baseUrl = network === 'mainnet'
    ? 'https://explorer.hiro.so'
    : 'https://explorer.hiro.so/?chain=testnet';

  return `${baseUrl}/address/${address}`;
};
