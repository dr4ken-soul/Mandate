// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title IMarginBank
/// @notice The part of the dreamDEX MarginBank that a policy contract reads.
interface IMarginBank {
    /// @notice The equity of an account, which is collateral plus unrealised profit and loss.
    /// @param account The wallet.
    /// @return equity The equity in raw collateral units. Signed, because settlement can drive it negative.
    function getAccountEquity(address account) external view returns (int256 equity);

    /// @notice The position an account holds in one perp pool.
    /// @param account The wallet.
    /// @param perpPool The pool.
    /// @return size The signed size in base units.
    /// @return avgEntryPrice The average entry price.
    /// @return entryFundingIndex The funding index at entry.
    /// @return lastUpdatedTimestampNs When the position was last touched.
    function getPosition(address account, address perpPool)
        external
        view
        returns (
            int128 size,
            uint128 avgEntryPrice,
            int256 entryFundingIndex,
            uint64 lastUpdatedTimestampNs
        );

    /// @notice The pools where an account holds a position.
    /// @param account The wallet.
    /// @return activePerpPools The pools the account holds a position in.
    function getActivePerpPools(address account) external view returns (address[] memory activePerpPools);

    /// @notice Whether paper credit may open this market.
    function isVoucherMarketAllowed(address perpPool) external view returns (bool);

    /// @notice The non-withdrawable credit floor currently held by an account.
    /// @dev A nonzero floor identifies an account subject to voucher restrictions.
    function getCreditFloor(address account) external view returns (uint256);

    /// @notice Whether an isolated account may trade this market.
    function isolationAllowsMarket(address account, address market) external view returns (bool);

}


