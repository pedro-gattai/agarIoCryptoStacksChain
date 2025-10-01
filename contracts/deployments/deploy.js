import { makeContractDeploy, broadcastTransaction, AnchorMode } from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';
import fs from 'fs';

const network = new StacksTestnet();

async function deployContract() {
  try {
    // Read the contract source code
    const contractSource = fs.readFileSync('./contracts/game-pool.clar', 'utf-8');
    
    const deployerPrivateKey = process.env.STACKS_PRIVATE_KEY || 
      '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601';
    
    const txOptions = {
      contractName: 'game-pool',
      codeBody: contractSource,
      senderKey: deployerPrivateKey,
      network,
      anchorMode: AnchorMode.Any,
    };

    const transaction = await makeContractDeploy(txOptions);
    console.log('Deploying contract...');
    
    const broadcastResponse = await broadcastTransaction(transaction, network);
    console.log('Contract deployment broadcast:', broadcastResponse);
    
    if (broadcastResponse.error) {
      console.error('Deployment failed:', broadcastResponse);
      process.exit(1);
    }
    
    console.log('✅ Contract deployed successfully!');
    console.log('Transaction ID:', broadcastResponse.txid);
    console.log('Contract Address: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.game-pool');
    
  } catch (error) {
    console.error('Deployment error:', error);
    process.exit(1);
  }
}

deployContract();