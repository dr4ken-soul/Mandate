// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title IOperatorPermissionsRegistry
/// @notice The registry that decides whether a key or a contract may act for a wallet.
interface IOperatorPermissionsRegistry {
    /// @notice Whether the operator holds the global grant for the owner and the selector.
    /// @param owner The wallet.
    /// @param operator The key or contract.
    /// @param selector The function selector the grant covers.
    function isGloballyApproved(address owner, address operator, bytes4 selector)
        external
        view
        returns (bool approved);
}
