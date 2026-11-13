// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title IPerpPool
/// @notice The part of a dreamDEX perp pool that a policy contract reads and calls.
/// @dev The perps pools share the order book base, so one interface covers every market.
interface IPerpPool {
    /// @notice The order grid of the market.
    /// @param tickSize The price grid, in quote units.
    /// @param minQuantity The smallest order the market accepts, in base units.
    /// @param lotSize The size grid, in base units.
    function getOrderBookParameters()
        external
        view
        returns (uint256 tickSize, uint256 minQuantity, uint256 lotSize);

    /// @notice The mark price, which reverts when the feed is stale.
    function getMarkPrice() external view returns (uint256);

    /// @notice The mark price with a liveness flag, which does not revert when it is stale.
    /// @param ok True when the mark price is fresh.
    /// @param price The mark price, zero when it is not fresh.
    function tryGetMarkPrice() external view returns (bool ok, uint256 price);

    /// @notice The risk parameters of the market.
    /// @param initialMarginBps The initial margin floor, in basis points.
    /// @param maintenanceMarginBps The maintenance margin floor, in basis points.
    /// @param closeOutMarginBps The close out margin floor, in basis points.
    /// @param maxOpenInterest The market open interest cap.
    /// @param maxPositionSize The per account position cap, in base units.
    /// @param takerFeeBpsTimes1k The taker fee.
    /// @param makerFeeBpsTimes1k The maker fee.
    /// @param insuranceFundShareBps The share of a loss the insurance fund covers.
    function getPerpPoolParameters()
        external
        view
        returns (
            uint256 initialMarginBps,
            uint256 maintenanceMarginBps,
            uint256 closeOutMarginBps,
            uint256 maxOpenInterest,
            uint256 maxPositionSize,
            uint256 takerFeeBpsTimes1k,
            int256 makerFeeBpsTimes1k,
            uint256 insuranceFundShareBps
        );

    /// @notice The latest expiry an order on this market may carry.
    function marketExpiryNs() external view returns (uint64);

    /// @notice Whether the operator holds the grant for the owner and the selector.
    /// @param owner The wallet.
    /// @param operator The key or the contract.
    /// @param selector The function selector the grant covers.
    function isOperatorAuthorized(address owner, address operator, bytes4 selector)
        external
        view
        returns (bool authorized);

    /// @notice Place an order on behalf of an owner, which requires operator rights.
    /// @param owner The wallet the order is for.
    /// @param isBid True for a buy.
    /// @param userData Opaque maker bookkeeping, forwarded verbatim.
    /// @param price The price, in quote units per whole base asset.
    /// @param quantity The size, in the market's base units.
    /// @param expireTimestampNs The order expiry, in nanoseconds.
    /// @param orderType 0 rests, 1 fills or kills, 2 fills or cancels, 3 rests only.
    /// @param selfMatchingOption 0 cancels the taker, 1 cancels the maker.
    /// @param builder The builder address, or zero.
    /// @param builderFeeBpsTimes1k The builder fee.
    function placeOrderFor(
        address owner,
        bool isBid,
        uint64 userData,
        uint256 price,
        uint256 quantity,
        uint64 expireTimestampNs,
        uint8 orderType,
        uint8 selfMatchingOption,
        address builder,
        uint96 builderFeeBpsTimes1k
    ) external payable returns (bool success, uint128 orderId);
}
