// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title MandateTypes
/// @notice The storage shapes, the status enum, the reason code errors and the
///         events for a Mandate policy. Every refusal carries one code and the
///         code is the only reason a caller needs to read.
library MandateTypes {
    /// @notice A compiled policy, one per owner.
    /// @param owner The wallet the policy governs.
    /// @param executor The key allowed to ask for admission.
    /// @param policyHash Keccak256 of the canonical policy document.
    /// @param expiresAt Unix seconds after which the mandate stops opening exposure.
    /// @param windowStart Unix seconds the current loss window opened at.
    /// @param maxLeverageBps Maximum notional over equity, in basis points.
    /// @param status One of MandateStatus.
    /// @param maxNotionalPerMarket Clause C3, in quote units.
    /// @param maxNotionalTotal Clause C4, in quote units.
    /// @param maxLossPerWindow Clause C5, in quote units.
    /// @param epochStartEquity Equity at the moment the mandate was registered.
    struct Mandate {
        address owner;
        address executor;
        bytes32 policyHash;
        uint64 expiresAt;
        uint64 windowStart;
        uint32 maxLeverageBps;
        uint8 status;
        uint128 maxNotionalPerMarket;
        uint128 maxNotionalTotal;
        uint128 maxLossPerWindow;
        uint128 epochStartEquity;
    }

    /// @notice The policy values an owner submits when registering.
    /// @param allowedMarkets Clause C1, the pool addresses the mandate covers.
    /// @param maxLeverageBps Clause C2, in basis points.
    /// @param maxNotionalPerMarket Clause C3, in quote units.
    /// @param maxNotionalTotal Clause C4, in quote units.
    /// @param maxLossPerWindow Clause C5, in quote units.
    /// @param expiresAt Clause C6, unix seconds.
    struct MandateInput {
        address[] allowedMarkets;
        uint32 maxLeverageBps;
        uint128 maxNotionalPerMarket;
        uint128 maxNotionalTotal;
        uint128 maxLossPerWindow;
        uint64 expiresAt;
    }

    /// @notice One order request, as the executor submits it.
    /// @param owner The wallet the order is for.
    /// @param market The pool address, which must be in clause C1.
    /// @param isBid True for a buy, false for a sell.
    /// @param price Price in quote units per whole base asset, 18 decimals.
    /// @param quantity Size in the market's base units.
    /// @param reduceOnly True when the order may only shrink a position.
    /// @param armsStop True when the order carries a stop, which costs 0.15 STT.
    /// @param expireTimestampNs Order expiry in nanoseconds.
    /// @param orderType 0 rests, 1 fills or kills, 2 fills or cancels, 3 rests only.
    struct OrderRequest {
        address owner;
        address market;
        bool isBid;
        uint256 price;
        uint256 quantity;
        bool reduceOnly;
        bool armsStop;
        uint64 expireTimestampNs;
        uint8 orderType;
    }

    /// @notice The lifecycle of a mandate.
    enum MandateStatus {
        None,
        Active,
        Breach,
        Revoked
    }

    // ---------------------------------------------------------------------
    // Reason codes.
    //
    // One error per code, each carrying the code itself, so a caller can read
    // the reason without a lookup table. The numeric value inside the error is
    // the same value the Decision event carries.
    // ---------------------------------------------------------------------

    /// @notice 0x01 There is no active mandate for the wallet.
    error ENoMandate(uint8 code);
    /// @notice 0x02 The executor is not an approved operator for the wallet.
    error EOperatorRevoked(uint8 code);
    /// @notice 0x03 The mandate expired and the order adds exposure.
    error EExpired(uint8 code);
    /// @notice 0x04 The market is not in clause C1.
    error EMarketNotAllowed(uint8 code);
    /// @notice 0x05 The price is not a multiple of the tick size.
    error ETickMismatch(uint8 code);
    /// @notice 0x06 The size is not a multiple of the lot size.
    error ELotMismatch(uint8 code);
    /// @notice 0x07 The size is below the market minimum.
    error EBelowMinQty(uint8 code);
    /// @notice 0x08 The order would push the market past clause C3.
    error EMarketNotionalCap(uint8 code);
    /// @notice 0x09 The order would push the mandate past clause C4.
    error ETotalNotionalCap(uint8 code);
    /// @notice 0x0A The order would put the account past clause C2.
    error ELeverage(uint8 code);
    /// @notice 0x0B The mandate has reached its clause C5 loss floor.
    error ELossWindow(uint8 code);
    /// @notice 0x0C The venue position cap binds before the mandate does.
    error EVenuePositionCap(uint8 code);
    /// @notice 0x0D Paper credit cannot open this market.
    error EVoucherBlocked(uint8 code);
    /// @notice 0x0E The mark price is stale, so no size can be quoted.
    error EMarkStale(uint8 code);
    /// @notice 0x0F The wallet cannot cover the 0.15 STT each stop holds.
    error EGasHeadroom(uint8 code);
    /// @notice 0x10 The mandate is inside the cool-down after an enforcement.
    error ECooldown(uint8 code);
    /// @notice 0x12 The mandate is in breach and the order adds exposure.
    error EInBreach(uint8 code);

    // ---------------------------------------------------------------------
    // Events.
    // ---------------------------------------------------------------------

    /// @notice Emitted for every admission attempt, admitted or refused.
    /// @dev A refusal reverts, and a revert rolls back the log, so a refusal is
    ///      recorded by `recordRefusal` in the transaction that follows the
    ///      reverted one. `txRef` carries the hash of that reverted transaction,
    ///      so the row points at the refusal itself rather than at the recorder.
    /// @param owner The wallet the attempt was for.
    /// @param admitted True when the order was forwarded to the pool.
    /// @param code The reason code, 0x00 when admitted.
    /// @param policyHash The hash of the mandate that produced the decision.
    /// @param market The pool the attempt targeted.
    /// @param compared The value that was compared, in quote units or basis points.
    /// @param limit The limit it was compared against.
    /// @param clause The clause that bound, 0 when the venue gate bound.
    /// @param txRef The hash of the refused transaction, or zero for an admission.
    event Decision(
        address indexed owner,
        bool admitted,
        uint8 code,
        bytes32 indexed policyHash,
        address indexed market,
        uint128 compared,
        uint128 limit,
        uint8 clause,
        bytes32 txRef
    );

    /// @notice Emitted when the reactive handler pulled a position back inside the mandate.
    /// @param owner The wallet the position belongs to.
    /// @param clause The clause that was breached.
    /// @param size The size removed, in base units.
    /// @param policyHash The hash of the mandate that was enforced.
    event Enforced(address indexed owner, uint8 clause, uint256 size, bytes32 indexed policyHash);

    /// @notice Emitted when the venue refused the reduction the handler attempted.
    /// @param owner The wallet the position belongs to.
    /// @param reason The venue's own reason, as text.
    event EnforcementFailed(address indexed owner, string reason);

    /// @notice Emitted when a mandate is registered.
    /// @param owner The wallet the mandate governs.
    /// @param policyHash The hash of the canonical policy document.
    /// @param expiresAt Clause C6, unix seconds.
    event MandateRegistered(address indexed owner, bytes32 indexed policyHash, uint64 expiresAt);

    /// @notice Emitted when a mandate is revoked.
    /// @param owner The wallet the mandate governed.
    /// @param policyHash The hash of the mandate that was revoked.
    event MandateRevoked(address indexed owner, bytes32 indexed policyHash);
}

