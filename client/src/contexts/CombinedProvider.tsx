import React from 'react';
import type { ReactNode } from 'react';
import { SocketProvider } from './SocketContext';
import { RoomProvider } from './game/RoomProvider';
import { GameProvider } from './game/GameProvider';
import { WalletProvider } from './WalletContext';

interface CombinedProviderProps {
  children: ReactNode;
  serverUrl?: string;
}

export const CombinedProvider: React.FC<CombinedProviderProps> = ({ 
  children, 
  serverUrl = 'http://localhost:3000' 
}) => {
  return (
    <WalletProvider autoConnect={true} cluster="devnet">
      <SocketProvider serverUrl={serverUrl}>
        <RoomProvider>
          <GameProvider>
            {children}
          </GameProvider>
        </RoomProvider>
      </SocketProvider>
    </WalletProvider>
  );
};