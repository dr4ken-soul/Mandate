// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../../src/interfaces/IPerpPool.sol";
import "../../src/interfaces/IMarginBank.sol";
import "../../src/interfaces/IPerpPoolFactory.sol";
import "../../src/interfaces/IOperatorPermissionsRegistry.sol";
import "../../src/interfaces/IERC20.sol";

/// @notice A perp pool that answers from storage, for the offline tests.
contract MockPerpPool is IPerpPool {
    uint256 public tickSize = 1;
    uint256 public minQuantity = 1;
    uint256 public lotSize = 1;

    uint256 public markPrice = 100e18;
    bool public priceable = true;

    uint256 public maxPositionSize = 1_000_000e18;

    uint64 public expiryNs = 4_000_000_000_000_000_000;

    bool public shouldRevertOnPlace;
    bool public lastCallPlaced;
    address public lastOwner;
    bool public lastIsBid;
    uint256 public lastPrice;
    uint256 public lastQuantity;
    uint8 public lastOrderType;

    function setGrid(uint256 tick, uint256 min, uint256 lot) external {
        tickSize = tick;
        minQuantity = min;
        lotSize = lot;
    }

    function setPositionCap(uint256 cap) external {
        maxPositionSize = cap;
    }

    function setMark(uint256 price, bool isPriceable) external {
        markPrice = price;
        priceable = isPriceable;
    }

    function getOrderBookParameters() external view returns (uint256, uint256, uint256) {
        return (tickSize, minQuantity, lotSize);
    }

    function getMarkPrice() external view returns (uint256) {
        require(priceable, "stale");
        return markPrice;
    }

    function tryGetMarkPrice() external view returns (bool, uint256) {
        return (priceable, markPrice);
    }

    function getPerpPoolParameters()
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            int256,
            uint256
        )
    {
        return (0, 0, 0, 0, maxPositionSize, 0, 0, 0);
    }

    bool public operatorAuthorized = true;

    function setOperatorAuthorized(bool value) external {
        operatorAuthorized = value;
    }

    function isOperatorAuthorized(address, address, bytes4) external view returns (bool) {
        return operatorAuthorized;
    }

    function marketExpiryNs() external view returns (uint64) {
        return expiryNs;
    }

    function placeOrderFor(
        address owner,
        bool isBid,
        uint64,
        uint256 price,
        uint256 quantity,
        uint64,
        uint8 orderType,
        uint8,
        address,
        uint96
    ) external payable returns (bool, uint128) {
        require(!shouldRevertOnPlace, "venue refused");
        lastCallPlaced = true;
        lastOwner = owner;
        lastIsBid = isBid;
        lastPrice = price;
        lastQuantity = quantity;
        lastOrderType = orderType;
        return (true, 1);
    }
}

/// @notice A margin bank that answers from storage, for the offline tests.
contract MockMarginBank is IMarginBank {
    mapping(address => int256) public equity;
    mapping(address => mapping(address => int128)) public positionSize;
    mapping(address => address[]) public activePools;
    mapping(address => uint64) public voucherExpiry;
    bool public voucherAllows = true;
    bool public isolationAllows = true;

    function setEquity(address account, int256 value) external {
        equity[account] = value;
    }

    function setPosition(address account, address pool, int128 size) external {
        positionSize[account][pool] = size;
        activePools[account].push(pool);
    }

    function setVoucherAllows(bool value) external {
        voucherAllows = value;
    }

    function setVoucher(address account, uint64 expiry) external {
        voucherExpiry[account] = expiry;
    }

    function getAccountEquity(address account) external view returns (int256) {
        return equity[account];
    }

    function getPosition(address account, address perpPool)
        external
        view
        returns (int128, uint128, int256, uint64)
    {
        return (positionSize[account][perpPool], 0, 0, 0);
    }

    function getAccountState(address account)
        external
        view
        returns (int256, uint256, address[] memory)
    {
        return (equity[account], 0, activePools[account]);
    }

    function getActivePerpPools(address account) external view returns (address[] memory) {
        return activePools[account];
    }

    function isVoucherMarketAllowed(address) external view returns (bool) {
        return voucherAllows;
    }

    function isolationAllowsMarket(address, address) external view returns (bool) {
        return isolationAllows;
    }

    function voucherExpiryOf(address account) external view returns (uint64) {
        return voucherExpiry[account];
    }
}

/// @notice A pool factory that maps a pool to a base token.
contract MockPerpPoolFactory is IPerpPoolFactory {
    mapping(address => address) public baseTokenForPool;

    function setBaseToken(address pool, address baseToken) external {
        baseTokenForPool[pool] = baseToken;
    }

    function getBaseTokenForPool(address perpPool) external view returns (address) {
        return baseTokenForPool[perpPool];
    }

    function getPerpPools() external view returns (address[] memory) {
        return new address[](0);
    }
}

/// @notice A base token that only reports its decimals.
contract MockToken is IERC20 {
    uint8 public immutable tokenDecimals;

    constructor(uint8 decimals_) {
        tokenDecimals = decimals_;
    }

    function decimals() external view returns (uint8) {
        return tokenDecimals;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 0;
    }
}

/// @notice An operator registry that answers from storage.
contract MockOperatorRegistry is IOperatorPermissionsRegistry {
    mapping(address => bool) public authorized;

    function setAuthorizedFor(address operator, bool value) external {
        authorized[operator] = value;
    }

    function isGloballyApproved(address, address operator, bytes4) external view returns (bool) {
        return authorized[operator];
    }
}




