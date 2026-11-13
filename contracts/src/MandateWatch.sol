// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@somnia-chain/reactivity-contracts/SomniaEventHandler.sol";
import "@somnia-chain/reactivity-contracts/interfaces/SomniaExtensions.sol";

import "./MandateTypes.sol";
import "./Mandate.sol";
import "./interfaces/IPerpPool.sol";
import "./interfaces/IMarginBank.sol";
import "./interfaces/IPerpPoolFactory.sol";
import "./interfaces/IERC20.sol";

/// @title MandateWatch
/// @notice The reactive enforcement path. It subscribes to the venue's position
///         events for the wallet it watches and, when a clause is breached,
///         places a reduce-only order that restores compliance.
///
/// The handler is called by the chain, not by a bot. The wallet that owns the
/// subscription pays for every callback and must hold the precompile's
/// minimum balance, which is 32 STT. Both costs are the owner's, and the
/// interface says so next to the enforcement status.
contract MandateWatch is SomniaEventHandler {
    using SomniaExtensions for uint256;

    /// @notice The mandate contract this handler enforces.
    Mandate public immutable mandate;

    /// @notice The venue.
    IMarginBank public immutable marginBank;

    /// @notice The pool this handler watches.
    address public immutable pool;

    /// @notice The wallet whose position is watched.
    address public immutable owner;

    /// @notice The topic of the position event the handler reacts to.
    bytes32 public immutable positionTopic;

    /// @notice The subscription that delivers the callbacks.
    uint256 public subscriptionId;

    event Enforced(address indexed owner, uint8 clause, uint256 size, bytes32 indexed policyHash);
    event EnforcementFailed(address indexed owner, string reason);

    /// @param mandateAddress The mandate contract.
    /// @param marginBankAddress The venue.
    /// @param poolFactoryAddress The pool factory, used to read the base decimals.
    /// @param poolAddress The pool to watch.
    /// @param ownerAddress The wallet to watch.
    /// @param topic The topic of the position event, taken from the venue's own log.
    constructor(
        address mandateAddress,
        address marginBankAddress,
        address poolFactoryAddress,
        address poolAddress,
        address ownerAddress,
        bytes32 topic
    ) {
        mandate = Mandate(mandateAddress);
        marginBank = IMarginBank(marginBankAddress);
        pool = poolAddress;
        owner = ownerAddress;
        positionTopic = topic;
        poolFactory = IPerpPoolFactory(poolFactoryAddress);
    }

    IPerpPoolFactory public immutable poolFactory;

    /// @notice Subscribe to the position events of the watched wallet.
    /// @dev The caller becomes the subscription owner and pays for the callbacks.
    function subscribe(uint64 gasLimit) external returns (uint256 id) {
        SomniaExtensions.SubscriptionFilter memory filter = SomniaExtensions.SubscriptionFilter({
            eventTopics: [positionTopic, bytes32(0), bytes32(0), bytes32(0)],
            origin: address(0),
            emitter: address(marginBank)
        });
        SomniaExtensions.SubscriptionOptions memory options = SomniaExtensions.SubscriptionOptions({
            priorityFeePerGas: 0,
            maxFeePerGas: 20 gwei,
            gasLimit: gasLimit
        });
        id = SomniaExtensions.subscribe(address(this), filter, options);
        subscriptionId = id;
    }

    /// @notice Cancel the subscription.
    function unsubscribe() external {
        SomniaExtensions.unsubscribe(subscriptionId);
    }

    /// @notice The callback the precompile makes when a watched event fires.
    /// @param emitter The contract that emitted the event.
    /// @param eventTopics The topics of the event.
    /// @param data The non indexed data of the event.
    function _onEvent(address emitter, bytes32[] calldata eventTopics, bytes calldata data) internal override {
        if (emitter != address(marginBank)) {
            return;
        }

        (bool priceable, uint256 markPrice) = IPerpPool(pool).tryGetMarkPrice();
        if (!priceable) {
            emit EnforcementFailed(owner, "the mark price is stale");
            return;
        }

        (int128 size,,,) = marginBank.getPosition(owner, pool);
        if (size == 0) {
            return;
        }

                (uint8 status, uint128 maxNotionalPerMarket, bytes32 policyHash) = mandate.getEnforcementState(owner);
        if (status != uint8(MandateTypes.MandateStatus.Active)) {
            return;
        }

        uint8 decimals = IERC20(poolFactory.getBaseTokenForPool(pool)).decimals();
        uint256 scale = 10 ** uint256(decimals);
        uint256 exposure = uint256(size < 0 ? -int256(size) : int256(size)) * markPrice / scale;
        uint256 cap = maxNotionalPerMarket;
        if (cap == 0 || exposure <= cap) {
            return;
        }

        // The size that brings the exposure back to the cap, rounded up so the
        // reduction clears the limit rather than landing on it.
        uint256 excess = exposure - cap;
        uint256 quantity = (excess * scale + markPrice - 1) / markPrice;
        if (quantity == 0) {
            return;
        }

        mandate.markBreach(owner);
        mandate.startCooldown(owner);

        try IPerpPool(pool).placeOrderFor(
            owner,
            size < 0,
            0,
            markPrice,
            quantity,
            IPerpPool(pool).marketExpiryNs(),
            2,
            0,
            address(0),
            0
        ) {
            mandate.clearBreach(owner);
            emit Enforced(owner, 3, quantity, policyHash);
        } catch {
            emit EnforcementFailed(owner, "the venue refused the reduction");
        }
    }
}









