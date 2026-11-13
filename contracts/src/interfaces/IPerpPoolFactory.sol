// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title IPerpPoolFactory
/// @notice The part of the perp pool factory that a policy contract reads.
interface IPerpPoolFactory {
    /// @notice The base token of a perp pool.
    /// @param perpPool The pool.
    /// @return baseToken The ERC20 the position size is denominated in.
    function getBaseTokenForPool(address perpPool) external view returns (address baseToken);

    /// @notice Every perp pool the factory has deployed.
    function getPerpPools() external view returns (address[] memory perpPools);
}

