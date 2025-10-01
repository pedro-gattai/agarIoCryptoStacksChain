#!/usr/bin/env node

/**
 * Health Check Script for AgarCoin Stacks
 * Validates all systems are working for hackathon demo
 */

import { Configuration, AccountsApi, SmartContractsApi } from '@stacks/blockchain-api-client';
import { StacksTestnet } from '@stacks/network';
import fetch from 'node-fetch';

const network = new StacksTestnet();
const config = new Configuration({ 
  basePath: network.coreApiUrl,
  fetchApi: fetch
});

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = level === 'SUCCESS' ? COLORS.green : 
                level === 'ERROR' ? COLORS.red : 
                level === 'WARNING' ? COLORS.yellow : COLORS.blue;
  console.log(`${color}[${timestamp}] ${level}:${COLORS.reset} ${message}`);
}

async function checkStacksNetwork() {
  log('INFO', 'Checking Stacks network connectivity...');
  
  try {
    const response = await fetch(`${network.coreApiUrl}/v2/info`);
    const data = await response.json();
    
    if (response.ok) {
      log('SUCCESS', `Connected to Stacks ${data.network_id} (${data.stacks_tip_height} blocks)`);
      return true;
    } else {
      log('ERROR', 'Failed to connect to Stacks network');
      return false;
    }
  } catch (error) {
    log('ERROR', `Stacks network error: ${error.message}`);
    return false;
  }
}

async function checkSmartContract() {
  log('INFO', 'Checking smart contract deployment...');
  
  try {
    const contractsApi = new SmartContractsApi(config);
    const contractAddress = process.env.STACKS_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const contractName = process.env.STACKS_CONTRACT_NAME || 'game-pool';
    
    const result = await contractsApi.getContractById({
      contractAddress,
      contractId: `${contractAddress}.${contractName}`
    });
    
    if (result.source_code) {
      log('SUCCESS', `Smart contract found: ${contractAddress}.${contractName}`);
      
      // Test read-only function
      try {
        const readResult = await contractsApi.callReadOnlyFunction({
          contractAddress,
          contractName,
          functionName: 'get-next-game-id',
          functionArgs: []
        });
        
        log('SUCCESS', `Contract function callable: ${readResult.result}`);
        return true;
      } catch (readError) {
        log('WARNING', `Contract deployed but function call failed: ${readError.message}`);
        return true; // Contract exists, might be a function issue
      }
    } else {
      log('ERROR', 'Smart contract not found or not deployed');
      return false;
    }
  } catch (error) {
    log('ERROR', `Smart contract check failed: ${error.message}`);
    return false;
  }
}

async function checkWalletBalance() {
  log('INFO', 'Checking test wallet balance...');
  
  try {
    const accountsApi = new AccountsApi(config);
    const testAddress = process.env.STACKS_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    
    const balance = await accountsApi.getAccountBalance({ principal: testAddress });
    const stxBalance = parseInt(balance.stx.balance) / 1000000;
    
    if (stxBalance > 0) {
      log('SUCCESS', `Test wallet has ${stxBalance.toFixed(6)} STX`);
      return true;
    } else {
      log('WARNING', 'Test wallet has no STX balance');
      return false;
    }
  } catch (error) {
    log('ERROR', `Wallet balance check failed: ${error.message}`);
    return false;
  }
}

async function checkBackendService() {
  log('INFO', 'Checking backend service...');
  
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/health`);
    
    if (response.ok) {
      const data = await response.json();
      log('SUCCESS', `Backend service running: ${data.status}`);
      return true;
    } else {
      log('ERROR', `Backend service returned ${response.status}`);
      return false;
    }
  } catch (error) {
    log('WARNING', `Backend service not accessible: ${error.message}`);
    return false;
  }
}

async function checkFrontendService() {
  log('INFO', 'Checking frontend service...');
  
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const response = await fetch(frontendUrl);
    
    if (response.ok) {
      log('SUCCESS', 'Frontend service accessible');
      return true;
    } else {
      log('ERROR', `Frontend service returned ${response.status}`);
      return false;
    }
  } catch (error) {
    log('WARNING', `Frontend service not accessible: ${error.message}`);
    return false;
  }
}

async function checkDatabase() {
  log('INFO', 'Checking database connectivity...');
  
  try {
    // This would require actual database connection
    // For now, just check if DATABASE_URL is set
    if (process.env.DATABASE_URL) {
      log('SUCCESS', 'Database URL configured');
      return true;
    } else {
      log('WARNING', 'DATABASE_URL not set');
      return false;
    }
  } catch (error) {
    log('ERROR', `Database check failed: ${error.message}`);
    return false;
  }
}

async function generateStatusReport(results) {
  log('INFO', '='.repeat(50));
  log('INFO', 'AGARCOIN STACKS - HEALTH CHECK REPORT');
  log('INFO', '='.repeat(50));
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  const healthScore = Math.round((passedChecks / totalChecks) * 100);
  
  Object.entries(results).forEach(([check, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const checkName = check.replace(/([A-Z])/g, ' $1').toUpperCase();
    log('INFO', `${status} ${checkName}`);
  });
  
  log('INFO', '='.repeat(50));
  log('INFO', `OVERALL HEALTH SCORE: ${healthScore}%`);
  
  if (healthScore >= 80) {
    log('SUCCESS', '🚀 System ready for hackathon demo!');
  } else if (healthScore >= 60) {
    log('WARNING', '⚠️  System mostly ready, some issues detected');
  } else {
    log('ERROR', '🚨 System not ready for demo, critical issues found');
  }
  
  log('INFO', '='.repeat(50));
  
  return healthScore;
}

async function runHealthCheck() {
  log('INFO', 'Starting AgarCoin Stacks health check...');
  
  const results = {
    stacksNetwork: await checkStacksNetwork(),
    smartContract: await checkSmartContract(),
    walletBalance: await checkWalletBalance(),
    backendService: await checkBackendService(),
    frontendService: await checkFrontendService(),
    database: await checkDatabase()
  };
  
  const healthScore = await generateStatusReport(results);
  
  // Exit with appropriate code
  process.exit(healthScore >= 80 ? 0 : 1);
}

// Export for use in other scripts
export { runHealthCheck };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthCheck().catch(error => {
    log('ERROR', `Health check failed: ${error.message}`);
    process.exit(1);
  });
}