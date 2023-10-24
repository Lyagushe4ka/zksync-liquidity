
export const POOL_FACTORY_ADDRESS = '0xf2DAd89f2788a8CD54625C60b55cD3d2D0ACa7Cb';
export const ROUTER_ADDRESS = '0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295';

export const POOL_FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB) external view returns (address pool)',
];

export const ROUTER_ABI = [
  'function addLiquidity2(address pool, tuple(address token, uint amount)[] calldata inputs, bytes calldata data, uint minLiquidity, address callback, bytes calldata callbackData)',
  'function burnLiquidity(address pool, uint liquidity, bytes calldata data, uint[] calldata minAmounts, address callback, bytes calldata callbackData)',
];

export const POOL_ABI = [
  'function getReserves() external view returns (uint, uint)',
  'function token0() external view returns (address)',
  'function totalSupply() external view returns (uint)',
];

export const TOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function symbol() external view returns (string)'
];
