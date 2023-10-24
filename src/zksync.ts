import { BigNumber, ContractTransaction, ethers } from "ethers";
import { POOL_ABI, POOL_FACTORY_ABI, POOL_FACTORY_ADDRESS, ROUTER_ABI, ROUTER_ADDRESS, TOKEN_ABI } from "./constants";


const provider = new ethers.providers.JsonRpcProvider('https://mainnet.era.zksync.io');

export async function addAndRemoveLiquidity(
  privateKey: string,
  tokenA: string,
  tokenB: string,
): Promise<void> {
  const signer = new ethers.Wallet(privateKey, provider);
  const poolFactoryInstance = new ethers.Contract(POOL_FACTORY_ADDRESS, POOL_FACTORY_ABI, signer);
  const routerInstance = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);

  const poolAddress: string = await poolFactoryInstance.getPool(tokenA, tokenB); // get pool address

  if (poolAddress === ethers.constants.AddressZero) {
    throw new Error('Pool does not exist');
  }

  const poolInstance = new ethers.Contract(poolAddress, POOL_ABI, signer);

  const [reserve0, reserve1]: Array<BigNumber> = await poolInstance.getReserves(); // get reserves

  const token0: string = await poolInstance.token0(); // get token0 address
  const token1: string = token0.toLowerCase() === tokenA.toLowerCase() ? tokenB : tokenA;

  console.log(`Token address ${token0} has ${reserve0.toString()} reserves`);
  console.log(`Token address ${token1} has ${reserve1.toString()} reserves`);

  let balances: BigNumber[] = [];
  for (const token of [token0, token1]) {
    balances.push(await getBalanceAndApprove(signer, token));
  }

  const [cost0, cost1] = await getLpPrices(poolAddress); // lp token prices to pool tokens

  const minLpTokens = BigNumber.from((+balances[0] * cost0 + +balances[1] * cost1).toFixed(0)).mul(95).div(100); // min lp tokens to receive - 95% of the calculated value

  const gasPrice = await provider.getGasPrice();

  const addCalldata = [
    poolAddress,
    [
      [
        token0,
        balances[0],
      ],
      [
        token1,
        balances[1],
      ],
    ],
    ethers.utils.hexZeroPad(signer.address, 32),
    minLpTokens,
    ethers.constants.AddressZero,
    '0x',
  ]

  const addGasLimit = await routerInstance.estimateGas.addLiquidity2(...addCalldata);

  const addLiquidityTx: ContractTransaction = await routerInstance.addLiquidity2(
    ...addCalldata,
    {
      gasLimit: addGasLimit,
      gasPrice,
    }
  );

  const addReceipt = await addLiquidityTx.wait();
  console.log(`Successfully added liquidity, tx hash: ${addReceipt.transactionHash}`)

  await new Promise(resolve => setTimeout(resolve, 5_000));

  const lpTokensBalance = await getBalanceAndApprove(signer, poolAddress);

  const removeCalldata = [
    poolAddress,
    lpTokensBalance,
    ethers.utils.hexZeroPad(signer.address, 32) + ethers.utils.hexZeroPad('0x1', 32).replace('0x', ''),
    [
      balances[0].mul(95).div(100),
      balances[1].mul(95).div(100),
    ],
    ethers.constants.AddressZero,
    '0x',
  ];

  const removeGasLimit = await routerInstance.estimateGas.burnLiquidity(
    ...removeCalldata,
    {
      gasPrice,
    }
  );

  const removeLiquidityTx: ContractTransaction = await routerInstance.burnLiquidity(
    ...removeCalldata,
    {
      gasLimit: removeGasLimit.mul(11).div(10),
      gasPrice,
    }
  );

  const burnReceipt = await removeLiquidityTx.wait();
  console.log(`Successfully removed liquidity, tx hash: ${burnReceipt.transactionHash}`)
}

async function getBalanceAndApprove(
  signer: ethers.Wallet,
  tokenAddress: string,
): Promise<BigNumber> {

  const tokenInstance = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);

  const balance: BigNumber = await tokenInstance.balanceOf(signer.address);

  const allowance: BigNumber = await tokenInstance.allowance(signer.address, ROUTER_ADDRESS);

  if (allowance.gte(balance)) {
    return balance;
  }

  const ticker = await tokenInstance.symbol();

  // check if token is USDT and revoke approval if not zero
  if (allowance.gt(0) && ticker === 'USDT') {
    const gasLimit = await tokenInstance.estimateGas.approve(ROUTER_ADDRESS, 0);
    const revoke = await tokenInstance.approve(ROUTER_ADDRESS, 0, { gasLimit });

    const receipt = await revoke.wait();
    console.log(`Revoke ${ticker}, tx hash: ${receipt.transactionHash}`)

    await new Promise(resolve => setTimeout(resolve, 3_000));
  }

  const gasLimit = await tokenInstance.estimateGas.approve(ROUTER_ADDRESS, balance);
  const approve = await tokenInstance.approve(ROUTER_ADDRESS, balance, { gasLimit });

  const receipt = await approve.wait();
  console.log(`Approve ${ticker}, tx hash: ${receipt.transactionHash}`)

  await new Promise(resolve => setTimeout(resolve, 3_000));

  return balance;
}

async function getLpPrices(
  poolAddress: string,
): Promise<Array<number>> {
  const poolInstance = new ethers.Contract(poolAddress, POOL_ABI, provider);

  const [reserve0, reserve1]: Array<BigNumber> = await poolInstance.getReserves(); // get reserves

  const lpSupply: BigNumber = await poolInstance.totalSupply();
  const lpHalfSupply = Number(lpSupply.div(2));

  const cost0 = lpHalfSupply / Number(reserve0);
  const cost1 = lpHalfSupply / Number(reserve1);

  return [cost0, cost1];
}

(async () => {
  const key = process.env.KEY;

  if (!key) {
    throw new Error('Private key is not set');
  }

  await addAndRemoveLiquidity(
    key,
    '',
    '',
  );

})()
