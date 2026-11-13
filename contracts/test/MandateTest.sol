// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Test.sol";
import "../src/Mandate.sol";
import "../src/MandateTypes.sol";
import "./mocks/Mocks.sol";

/// @notice The shared fixture for the offline tests. No fork, no network.
abstract contract MandateTest is Test {
    Mandate internal mandate;

    MockPerpPool internal pool;
    MockMarginBank internal marginBank;
    MockPerpPoolFactory internal poolFactory;
    MockOperatorRegistry internal operatorRegistry;
    MockToken internal baseToken;

    address internal owner = address(0xA11CE);
    address internal executor;

    uint8 internal constant DECIMALS = 18;

    uint256 internal constant CAP_PER_MARKET = 200e18;
    uint256 internal constant CAP_TOTAL = 500e18;
    uint256 internal constant CAP_LOSS = 50e18;
    uint32 internal constant LEVERAGE_BPS = 300;

    function setUp() public virtual {
        executor = address(this);
        pool = new MockPerpPool();
        marginBank = new MockMarginBank();
        poolFactory = new MockPerpPoolFactory();
        operatorRegistry = new MockOperatorRegistry();
        baseToken = new MockToken(DECIMALS);

        poolFactory.setBaseToken(address(pool), address(baseToken));

        mandate = new Mandate(address(marginBank), address(poolFactory), address(operatorRegistry));
        operatorRegistry.setAuthorizedFor(address(mandate), true);

        marginBank.setEquity(owner, 1000e18);

        vm.prank(owner);
        mandate.register(_input(), executor, _clauseTexts());
    }

    function _input() internal view returns (MandateTypes.MandateInput memory input) {
        address[] memory markets = new address[](1);
        markets[0] = address(pool);
        input.allowedMarkets = markets;
        input.maxLeverageBps = LEVERAGE_BPS;
        input.maxNotionalPerMarket = uint128(CAP_PER_MARKET);
        input.maxNotionalTotal = uint128(CAP_TOTAL);
        input.maxLossPerWindow = uint128(CAP_LOSS);
        input.expiresAt = uint64(block.timestamp + 30 days);
    }

    function _clauseTexts() internal pure returns (string[6] memory texts) {
        texts[0] = "Only BTC-PERP.";
        texts[1] = "Never above 3x.";
        texts[2] = "Never risk more than 200 USDso on one market.";
        texts[3] = "Never above 500 USDso in total.";
        texts[4] = "Stop at a loss of 50 USDso.";
        texts[5] = "Be flat by Friday.";
    }

    /// @dev The mandate as a struct, read field by field from the flat return.
    function _mandateOf(address who) internal returns (MandateTypes.Mandate memory policy) {
        (
            uint8 status,
            address executor,
            bytes32 policyHash,
            uint64 expiresAt,
            uint32 maxLeverageBps,
            uint128 maxNotionalPerMarket,
            uint128 maxNotionalTotal,
            uint128 maxLossPerWindow,
            uint128 epochStartEquity,
            uint128 totalNotional,
            int256 equity
        ) = mandate.getMandate(who);
        totalNotional;
        equity;
        policy.owner = who;
        policy.executor = executor;
        policy.policyHash = policyHash;
        policy.expiresAt = expiresAt;
        policy.maxLeverageBps = maxLeverageBps;
        policy.status = status;
        policy.maxNotionalPerMarket = maxNotionalPerMarket;
        policy.maxNotionalTotal = maxNotionalTotal;
        policy.maxLossPerWindow = maxLossPerWindow;
        policy.epochStartEquity = epochStartEquity;
    }
    /// @dev A request for the given quantity of BTC at 100 USDso, the mark price.
    function _request(uint256 quantity) internal view returns (MandateTypes.OrderRequest memory req) {
        req.owner = owner;
        req.market = address(pool);
        req.isBid = true;
        req.price = 100e18;
        req.quantity = quantity;
        req.reduceOnly = false;
        req.armsStop = false;
        req.expireTimestampNs = 0;
        req.orderType = 0;
    }

    /// @dev Register a policy with different values, for the tests that need one.
    function _registerWith(
        uint256 perMarket,
        uint256 total,
        uint256 loss,
        uint32 leverageBps,
        address[] memory markets
    ) internal {
        MandateTypes.MandateInput memory input;
        input.allowedMarkets = markets;
        input.maxLeverageBps = leverageBps;
        input.maxNotionalPerMarket = uint128(perMarket);
        input.maxNotionalTotal = uint128(total);
        input.maxLossPerWindow = uint128(loss);
        input.expiresAt = uint64(block.timestamp + 30 days);
        vm.prank(owner);
        mandate.register(input, executor, _clauseTexts());
    }
}








