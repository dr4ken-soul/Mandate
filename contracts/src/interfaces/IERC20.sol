// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title IERC20
/// @notice The two reads a policy contract needs from a token.
interface IERC20 {
    /// @notice The token's decimals, which is the scale of a position size.
    function decimals() external view returns (uint8);

    /// @notice A balance, in the token's own units.
    function balanceOf(address account) external view returns (uint256);
}
