// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./MandateTest.sol";

/// @notice The 20 policy fixtures require a live preview and an admit call to
///         produce the same code at the same state.
contract AdmitParityTest is MandateTest {
    function _assertParity(
        MandateTypes.OrderRequest memory req,
        uint8 expectedCode,
        bytes4 expectedSelector
    ) internal {
        (uint8 previewCode,,,) = mandate.previewAdmit(req);
        assertEq(previewCode, expectedCode, "preview fixture code");

        vm.prank(executor);
        (bool success, bytes memory returnData) = address(mandate).call(
            abi.encodeWithSelector(Mandate.admit.selector, req)
        );

        if (expectedCode == 0) {
            assertTrue(success, "admit should accept the previewed order");
            (bool venueSuccess,) = abi.decode(returnData, (bool, uint128));
            assertTrue(venueSuccess, "mock venue accepted the order");
            assertTrue(pool.lastCallPlaced(), "admit reached the mock venue");
            return;
        }

        assertFalse(success, "admit should refuse the previewed order");
        assertEq(returnData.length, 36, "custom error includes one uint8 code");
        assertEq(bytes4(returnData), expectedSelector, "admit selector matches fixture");
        assertEq(uint8(returnData[returnData.length - 1]), expectedCode, "admit code matches preview");
        assertFalse(pool.lastCallPlaced(), "a refused request never reached the venue");
    }

    function test_01_AllowedOrder() public {
        _assertParity(_request(1e18), 0x00, bytes4(0));
    }

    function test_02_AllowedReduction() public {
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.reduceOnly = true;
        _assertParity(req, 0x00, bytes4(0));
    }

    function test_03_AllowedAskOrder() public {
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.isBid = false;
        _assertParity(req, 0x00, bytes4(0));
    }

    function test_04_AllowedDifferentPrice() public {
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.price = 101e18;
        _assertParity(req, 0x00, bytes4(0));
    }

    function test_05_NoMandate() public {
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.owner = address(0xDEAD);
        _assertParity(req, 0x01, MandateTypes.ENoMandate.selector);
    }

    function test_06_Expired() public {
        vm.warp(block.timestamp + 31 days);
        _assertParity(_request(1e18), 0x03, MandateTypes.EExpired.selector);
    }

    function test_07_MarketNotAllowed() public {
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.market = address(0xBEEF);
        _assertParity(req, 0x04, MandateTypes.EMarketNotAllowed.selector);
    }

    function test_08_TickMismatch() public {
        pool.setGrid(0.5e18, 1, 1);
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.price = 100.25e18;
        _assertParity(req, 0x05, MandateTypes.ETickMismatch.selector);
    }

    function test_09_LotMismatch() public {
        pool.setGrid(1, 1, 0.01e18);
        _assertParity(_request(0.005e18), 0x06, MandateTypes.ELotMismatch.selector);
    }

    function test_10_BelowMinimumQuantity() public {
        pool.setGrid(1, 2e18, 1);
        _assertParity(_request(1e18), 0x07, MandateTypes.EBelowMinQty.selector);
    }

    function test_11_MarketNotionalCap() public {
        _assertParity(_request(3e18), 0x08, MandateTypes.EMarketNotionalCap.selector);
    }

    function test_12_TotalNotionalCap() public {
        address[] memory markets = new address[](1);
        markets[0] = address(pool);
        _registerWith(1000e18, 150e18, CAP_LOSS, LEVERAGE_BPS, markets);
        _assertParity(_request(2e18), 0x09, MandateTypes.ETotalNotionalCap.selector);
    }

    function test_13_Leverage() public {
        address[] memory markets = new address[](1);
        markets[0] = address(pool);
        _registerWith(1000e18, 1000e18, CAP_LOSS, LEVERAGE_BPS, markets);
        marginBank.setEquity(owner, 10e18);
        _assertParity(_request(1e18), 0x0A, MandateTypes.ELeverage.selector);
    }

    function test_14_LossWindow() public {
        marginBank.setEquity(owner, 900e18);
        _assertParity(_request(1e18), 0x0B, MandateTypes.ELossWindow.selector);
    }

    function test_15_VenuePositionCap() public {
        pool.setPositionCap(0.5e18);
        _assertParity(_request(1e18), 0x0C, MandateTypes.EVenuePositionCap.selector);
    }

    function test_16_VoucherBlocked() public {
        marginBank.setVoucherCreditFloor(owner, 1000e18);
        marginBank.setVoucherAllows(false);
        _assertParity(_request(1e18), 0x0D, MandateTypes.EVoucherBlocked.selector);
    }

    function test_17_StaleMark() public {
        pool.setMark(0, false);
        _assertParity(_request(1e18), 0x0E, MandateTypes.EMarkStale.selector);
    }

    function test_18_StopGasHeadroom() public {
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.armsStop = true;
        _assertParity(req, 0x0F, MandateTypes.EGasHeadroom.selector);
    }

    function test_19_Cooldown() public {
        mandate.startCooldown(owner);
        _assertParity(_request(1e18), 0x10, MandateTypes.ECooldown.selector);
    }

    function test_20_InBreach() public {
        mandate.markBreach(owner);
        _assertParity(_request(1e18), 0x12, MandateTypes.EInBreach.selector);
    }

    function test_21_OrdinaryCollateralIgnoresVoucherMarketList() public {
        marginBank.setVoucherAllows(false);
        _assertParity(_request(1e18), 0, bytes4(0));
    }
}
