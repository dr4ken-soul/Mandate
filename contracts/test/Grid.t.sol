// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./MandateTest.sol";

/// @notice The grid and the caps. Fixtures only, no fork.
/// @dev Every test here names the clause it protects.
contract GridTest is MandateTest {
    function test_TickMismatchIsRefused() public {
        pool.setGrid(0.5e18, 1, 1);
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.price = 100.25e18;

        (uint8 code,,,) = mandate.previewAdmit(req);
        assertEq(code, 0x05, "tick mismatch");
    }

    function test_TickAlignedPriceIsAdmitted() public {
        pool.setGrid(0.5e18, 1, 1);
        MandateTypes.OrderRequest memory req = _request(1e18);
        req.price = 100e18;

        (uint8 code,,,) = mandate.previewAdmit(req);
        assertEq(code, 0x00, "admitted");
    }

    function test_LotMismatchIsRefused() public {
        pool.setGrid(1, 1, 0.01e18);
        MandateTypes.OrderRequest memory req = _request(0.005e18);

        (uint8 code,,,) = mandate.previewAdmit(req);
        assertEq(code, 0x06, "lot mismatch");
    }

    function test_LotAlignedSizeIsAdmitted() public {
        pool.setGrid(1, 1, 0.01e18);
        MandateTypes.OrderRequest memory req = _request(0.02e18);

        (uint8 code,,,) = mandate.previewAdmit(req);
        assertEq(code, 0x00, "admitted");
    }

    function test_BelowMinimumQuantityIsRefused() public {
        pool.setGrid(1, 2e18, 1);
        MandateTypes.OrderRequest memory req = _request(1e18);

        (uint8 code,,,) = mandate.previewAdmit(req);
        assertEq(code, 0x07, "below the minimum");
    }

    function test_MarketNotionalCapIsRefused() public {
        MandateTypes.OrderRequest memory req = _request(3e18);

        (uint8 code, uint128 compared, uint128 limit, uint8 clause) = mandate.previewAdmit(req);
        assertEq(code, 0x08, "market notional cap");
        assertEq(clause, 3, "clause C3");
        assertEq(compared, 300e18, "the notional the order would reach");
        assertEq(limit, CAP_PER_MARKET, "the cap");
    }

    function test_TotalNotionalCapIsRefused() public {
        address[] memory markets = new address[](1);
        markets[0] = address(pool);
        _registerWith(1000e18, 150e18, CAP_LOSS, LEVERAGE_BPS, markets);

        MandateTypes.OrderRequest memory req = _request(2e18);

        (uint8 code,,, uint8 clause) = mandate.previewAdmit(req);
        assertEq(code, 0x09, "total notional cap");
        assertEq(clause, 4, "clause C4");
    }

    function test_LeverageCapIsRefused() public {
        address[] memory markets = new address[](1);
        markets[0] = address(pool);
        _registerWith(10_000e18, 10_000e18, CAP_LOSS, 300, markets);

        // 1000 USDso of equity at 3x leaves 3000 USDso of room, so 4000 is over.
        MandateTypes.OrderRequest memory req = _request(40e18);

        (uint8 code, uint128 compared, uint128 limit, uint8 clause) = mandate.previewAdmit(req);
        assertEq(code, 0x0A, "leverage");
        assertEq(clause, 2, "clause C2");
        assertEq(limit, LEVERAGE_BPS, "the cap");
        assertGt(compared, LEVERAGE_BPS, "the leverage the order would reach");
    }

    function test_LeverageIsMeasuredOnTheWholeAccount() public {
        address[] memory markets = new address[](1);
        markets[0] = address(pool);
        _registerWith(10_000e18, 10_000e18, CAP_LOSS, 300, markets);

        // The account already holds 2000 USDso, so a 1500 USDso order would
        // take it to 3500, which is over 3x of 1000 USDso of equity.
        marginBank.setPosition(owner, address(pool), 20e18);

        MandateTypes.OrderRequest memory req = _request(15e18);

        (uint8 code,,,) = mandate.previewAdmit(req);
        assertEq(code, 0x0A, "leverage");
    }

    function test_NotionalUsesTheMarketBaseDecimals() public {
        MockToken eightDecimals = new MockToken(8);
        poolFactory.setBaseToken(address(pool), address(eightDecimals));

        address[] memory markets = new address[](1);
        markets[0] = address(pool);
        _registerWith(10_000e18, 10_000e18, CAP_LOSS, 10_000, markets);

        // 100 USDso per whole BTC, 0.01 BTC, so 1 USDso of notional.
        MandateTypes.OrderRequest memory req = _request(1e6);

        (uint8 code,,,) = mandate.previewAdmit(req);
        assertEq(code, 0x00, "admitted");
    }
}
