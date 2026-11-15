// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./MandateTest.sol";

/// @notice One test per reason code. Each asserts the exact selector, the code
///         inside the revert data, and that the mandate did not change.
contract CodesTest is MandateTest {
    // The selectors, computed once and written down. A change to any error
    // signature changes the selector and breaks the test that names it.
    bytes4 internal constant SELECTOR_NO_MANDATE = 0x13d914bb;
    bytes4 internal constant SELECTOR_OPERATOR_REVOKED = 0x5e23eb82;
    bytes4 internal constant SELECTOR_EXPIRED = 0x5dffa6ef;
    bytes4 internal constant SELECTOR_MARKET_NOT_ALLOWED = 0x5a2d716e;
    bytes4 internal constant SELECTOR_TICK_MISMATCH = 0x04edcb32;
    bytes4 internal constant SELECTOR_LOT_MISMATCH = 0x2e95a233;
    bytes4 internal constant SELECTOR_BELOW_MIN_QTY = 0xd5c73ade;
    bytes4 internal constant SELECTOR_MARKET_NOTIONAL_CAP = 0x47a56227;
    bytes4 internal constant SELECTOR_TOTAL_NOTIONAL_CAP = 0x3334936d;
    bytes4 internal constant SELECTOR_LEVERAGE = 0x2b808b49;
    bytes4 internal constant SELECTOR_LOSS_WINDOW = 0xab41e695;
    bytes4 internal constant SELECTOR_VENUE_POSITION_CAP = 0x035bb5c8;
    bytes4 internal constant SELECTOR_VOUCHER_BLOCKED = 0x93abd6ec;
    bytes4 internal constant SELECTOR_MARK_STALE = 0x7fc665b6;
    bytes4 internal constant SELECTOR_GAS_HEADROOM = 0xfe627acc;
    bytes4 internal constant SELECTOR_COOLDOWN = 0x4029495f;
    bytes4 internal constant SELECTOR_IN_BREACH = 0x1fbd6281;

    /// @dev The code sits in the last byte of the ABI encoded error data.
    function _codeOf(bytes memory returnData) internal pure returns (uint8) {
        bytes memory tail = new bytes(returnData.length - 4);
        for (uint256 i = 0; i < tail.length; i++) {
            tail[i] = returnData[i + 4];
        }
        return abi.decode(tail, (uint8));
    }
    /// @dev Call admit and assert the refusal came back with the expected
    ///      selector and code, and that the mandate is untouched.
    function _assertRefusal(
        bytes4 expectedSelector,
        uint8 expectedCode,
        MandateTypes.OrderRequest memory req
    ) internal {
        MandateTypes.Mandate memory before = _mandateOf(owner);

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );

        assertFalse(success, "the call should have reverted");
        assertGt(returnData.length, 4, "the revert should carry data");
        assertEq(bytes4(returnData), expectedSelector, "the selector");
        assertEq(_codeOf(returnData), expectedCode, "the code");

        MandateTypes.Mandate memory afterState = _mandateOf(owner);
        assertEq(afterState.policyHash, before.policyHash, "the policy hash");
        assertEq(afterState.status, before.status, "the status");
        assertEq(afterState.maxNotionalPerMarket, before.maxNotionalPerMarket, "the market cap");
        assertEq(afterState.maxNotionalTotal, before.maxNotionalTotal, "the total cap");
        assertEq(afterState.epochStartEquity, before.epochStartEquity, "the epoch equity");
    }

    function test_0x01_NoMandate() public {
        address stranger = address(0xDEAD);
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.owner = stranger;

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_NO_MANDATE);
        assertEq(_codeOf(returnData), 0x01);
    }

    function test_0x02_OperatorRevokedWhenTheExecutorIsWrong() public {
        MandateTypes.OrderRequest memory req = _request(1e18);

        vm.prank(address(0xBAD));
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_OPERATOR_REVOKED);
        assertEq(_codeOf(returnData), 0x02);
    }

    function test_0x02_OperatorRevokedWhenTheGrantIsGone() public {
        // The grant is read when the mandate is registered, so a registration
        // without the grant is refused rather than accepted.
        operatorRegistry.setAuthorizedFor(address(mandate), false);

        vm.prank(owner);
        vm.expectRevert();
        mandate.register(_input(), executor, _clauseTexts());
    }

    function test_0x03_Expired() public {
        vm.warp(block.timestamp + 31 days);
        MandateTypes.OrderRequest memory req = _request(1e18);

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_EXPIRED);
        assertEq(_codeOf(returnData), 0x03);
    }

    function test_0x04_MarketNotAllowed() public {
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.market = address(0xBEEF);

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_MARKET_NOT_ALLOWED);
        assertEq(_codeOf(returnData), 0x04);
    }

    function test_0x05_TickMismatch() public {
        pool.setGrid(0.5e18, 1, 1);
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.price = 100.25e18;

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_TICK_MISMATCH);
        assertEq(_codeOf(returnData), 0x05);
    }

    function test_0x06_LotMismatch() public {
        pool.setGrid(1, 1, 0.01e18);
        MandateTypes.OrderRequest memory req = _request(0.005e18);

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_LOT_MISMATCH);
        assertEq(_codeOf(returnData), 0x06);
    }

    function test_0x07_BelowMinQuantity() public {
        pool.setGrid(1, 2e18, 1);
        MandateTypes.OrderRequest memory req = _request(1e18);

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_BELOW_MIN_QTY);
        assertEq(_codeOf(returnData), 0x07);
    }

    function test_0x08_MarketNotionalCap() public {
        MandateTypes.OrderRequest memory req = _request(3e18);

        _assertRefusal(SELECTOR_MARKET_NOTIONAL_CAP, 0x08, req);
    }

    function test_0x09_TotalNotionalCap() public {
        address[] memory markets = new address[](1);
        markets[0] = address(pool);
        _registerWith(1000e18, 150e18, CAP_LOSS, LEVERAGE_BPS, markets);

        MandateTypes.OrderRequest memory req = _request(2e18);
        _assertRefusal(SELECTOR_TOTAL_NOTIONAL_CAP, 0x09, req);
    }

    function test_0x0A_Leverage() public {
        address[] memory markets = new address[](1);
        markets[0] = address(pool);
        _registerWith(10_000e18, 10_000e18, CAP_LOSS, 300, markets);

        MandateTypes.OrderRequest memory req = _request(40e18);
        _assertRefusal(SELECTOR_LEVERAGE, 0x0A, req);
    }

    function test_0x0B_LossWindow() public {
        // The epoch started at 1000 USDso of equity and the cap is 50, so the
        // floor is 950. The account falls below it after the mandate is set.
        address[] memory markets = new address[](1);
        markets[0] = address(pool);
        _registerWith(10_000e18, 10_000e18, CAP_LOSS, 10_000, markets);
        marginBank.setEquity(owner, 900e18);

        MandateTypes.OrderRequest memory req = _request(1e18);
        _assertRefusal(SELECTOR_LOSS_WINDOW, 0x0B, req);
    }

    function test_0x0C_VenuePositionCap() public {
        pool.setMark(100e18, true);
        // The venue caps the account at 2 BTC.
        MockPerpPool fresh = new MockPerpPool();
        fresh.setMark(100e18, true);
        fresh.setPositionCap(2e18);
        poolFactory.setBaseToken(address(fresh), address(baseToken));

        address[] memory markets = new address[](1);
        markets[0] = address(fresh);
        _registerWith(10_000e18, 10_000e18, CAP_LOSS, 10_000, markets);

        MandateTypes.OrderRequest memory req = _request(3e18);
        req.market = address(fresh);

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_VENUE_POSITION_CAP);
        assertEq(_codeOf(returnData), 0x0C);
    }

    function test_0x0D_VoucherBlocked() public {
        marginBank.setVoucherCreditFloor(owner, 1000e18);
        marginBank.setVoucherAllows(false);

        MandateTypes.OrderRequest memory req = _request(1e18);

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_VOUCHER_BLOCKED);
        assertEq(_codeOf(returnData), 0x0D);
    }

    function test_0x0E_MarkStale() public {
        pool.setMark(0, false);

        MandateTypes.OrderRequest memory req = _request(1e18);

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_MARK_STALE);
        assertEq(_codeOf(returnData), 0x0E);
    }

    function test_0x0F_GasHeadroom() public {
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.armsStop = true;

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_GAS_HEADROOM);
        assertEq(_codeOf(returnData), 0x0F);
    }

    function test_0x10_Cooldown() public {
        mandate.startCooldown(owner);

        MandateTypes.OrderRequest memory req = _request(1e18);

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_COOLDOWN);
        assertEq(_codeOf(returnData), 0x10);
    }

    function test_0x10_CooldownStillAcceptsReductions() public {
        mandate.startCooldown(owner);

        MandateTypes.OrderRequest memory req = _request(1e18);
        req.reduceOnly = true;

        (uint8 code,,,) = mandate.previewAdmit(req);
        assertEq(code, 0x00, "a reduction is accepted");
    }

    function test_0x12_InBreach() public {
        mandate.markBreach(owner);

        MandateTypes.OrderRequest memory req = _request(1e18);

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );
        assertFalse(success);
        assertEq(bytes4(returnData), SELECTOR_IN_BREACH);
        assertEq(_codeOf(returnData), 0x12);
    }
}









