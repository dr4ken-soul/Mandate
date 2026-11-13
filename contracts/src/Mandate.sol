// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./MandateTypes.sol";
import "./MandateCanonical.sol";
import "./interfaces/IPerpPool.sol";
import "./interfaces/IMarginBank.sol";
import "./interfaces/IPerpPoolFactory.sol";
import "./interfaces/IOperatorPermissionsRegistry.sol";
import "./interfaces/IERC20.sol";

/// @title Mandate
/// @notice A policy contract. It holds one mandate per wallet and refuses any
///         order that breaks a rule the wallet owner wrote in plain English.
///
/// Two rules govern the whole contract.
///
/// Fail closed. Every unknown is a refusal. If a read fails, if equity cannot
/// be derived, if the pool answers with something unexpected, the order does
/// not proceed. Admitted is the only state that requires positive evidence.
///
/// Refuse without spending. A refusal reverts with a custom error carrying one
/// reason code, so the transaction costs only the gas of the checks and the
/// caller can read the reason from the revert data without a lookup.
///
/// The language model never appears here. The policy is six numbers and a
/// hash, and everything below the register call is arithmetic.
contract Mandate {
    using MandateTypes for MandateTypes.MandateStatus;

    // ---------------------------------------------------------------------
    // Reason codes. The same values the off-chain code table carries.
    // ---------------------------------------------------------------------
    uint8 internal constant CODE_ADMITTED = 0x00;
    uint8 internal constant CODE_NO_MANDATE = 0x01;
    uint8 internal constant CODE_OPERATOR_REVOKED = 0x02;
    uint8 internal constant CODE_EXPIRED = 0x03;
    uint8 internal constant CODE_MARKET_NOT_ALLOWED = 0x04;
    uint8 internal constant CODE_TICK_MISMATCH = 0x05;
    uint8 internal constant CODE_LOT_MISMATCH = 0x06;
    uint8 internal constant CODE_BELOW_MIN_QTY = 0x07;
    uint8 internal constant CODE_MARKET_NOTIONAL_CAP = 0x08;
    uint8 internal constant CODE_TOTAL_NOTIONAL_CAP = 0x09;
    uint8 internal constant CODE_LEVERAGE = 0x0A;
    uint8 internal constant CODE_LOSS_WINDOW = 0x0B;
    uint8 internal constant CODE_VENUE_POSITION_CAP = 0x0C;
    uint8 internal constant CODE_VOUCHER_BLOCKED = 0x0D;
    uint8 internal constant CODE_MARK_STALE = 0x0E;
    uint8 internal constant CODE_GAS_HEADROOM = 0x0F;
    uint8 internal constant CODE_COOLDOWN = 0x10;
    uint8 internal constant CODE_IN_BREACH = 0x12;

    // ---------------------------------------------------------------------
    // Clause identifiers, as the events carry them.
    // ---------------------------------------------------------------------
    uint8 internal constant CLAUSE_NONE = 0;
    uint8 internal constant CLAUSE_C1 = 1;
    uint8 internal constant CLAUSE_C2 = 2;
    uint8 internal constant CLAUSE_C3 = 3;
    uint8 internal constant CLAUSE_C4 = 4;
    uint8 internal constant CLAUSE_C5 = 5;
    uint8 internal constant CLAUSE_C6 = 6;

    /// @notice The venue reads.
    IMarginBank public immutable marginBank;
    IPerpPoolFactory public immutable perpPoolFactory;
    IOperatorPermissionsRegistry public immutable operatorRegistry;

    /// @notice The selector of `placeOrderFor`, the grant a policy contract needs.
    bytes4 public constant PLACE_ORDER_FOR_SELECTOR = 0x80054449;

    /// @notice The deposit each stop order holds, in STT wei.
    uint256 public constant STOP_DEPOSIT = 0.15 ether;

    /// @notice How long only reduce-only orders are accepted after an enforcement.
    uint64 public constant COOLDOWN_SECONDS = 30 minutes;

    mapping(address => MandateTypes.Mandate) internal _mandates;
    mapping(address => address[]) internal _allowedMarkets;
    mapping(address => uint64) public cooldownUntil;

    /// @notice The result of evaluating one order request.
    /// @param code The reason code, zero when the request is admissible.
    /// @param clause The clause that bound, zero when the venue gate bound.
    /// @param compared The value that was compared.
    /// @param limit The limit it was compared against.
    struct Evaluation {
        uint8 code;
        uint8 clause;
        uint128 compared;
        uint128 limit;
    }

    event MandateRegistered(address indexed owner, bytes32 indexed policyHash, uint64 expiresAt);
    event MandateRevoked(address indexed owner, bytes32 indexed policyHash);
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
    event Enforced(address indexed owner, uint8 clause, uint256 size, bytes32 indexed policyHash);
    event EnforcementFailed(address indexed owner, string reason);

    constructor(
        address marginBankAddress,
        address perpPoolFactoryAddress,
        address operatorRegistryAddress
    ) {
        require(marginBankAddress != address(0), "margin bank");
        require(perpPoolFactoryAddress != address(0), "pool factory");
        require(operatorRegistryAddress != address(0), "operator registry");
        marginBank = IMarginBank(marginBankAddress);
        perpPoolFactory = IPerpPoolFactory(perpPoolFactoryAddress);
        operatorRegistry = IOperatorPermissionsRegistry(operatorRegistryAddress);
    }

    // ---------------------------------------------------------------------
    // Owner actions.
    // ---------------------------------------------------------------------

    /// @notice Register a policy for the caller.
    /// @param input The six clause values.
    /// @param executor The key allowed to ask for admission.
    /// @param clauseTexts The owner's own sentence for each clause, in C1 to C6 order.
    /// @return policyHash The hash of the canonical policy document.
    function register(MandateTypes.MandateInput calldata input, address executor, string[6] calldata clauseTexts)
        external
        returns (bytes32 policyHash)
    {
        require(executor != address(0), "executor");
        require(input.allowedMarkets.length > 0, "markets");
        require(input.maxLeverageBps > 0, "leverage");
        require(input.expiresAt > block.timestamp, "expiry");

        require(_isOperator(msg.sender), "operator grant");

        policyHash = MandateCanonical.hash(input, clauseTexts);

        MandateTypes.Mandate storage mandate = _mandates[msg.sender];
        mandate.owner = msg.sender;
        mandate.executor = executor;
        mandate.policyHash = policyHash;
        mandate.expiresAt = input.expiresAt;
        mandate.windowStart = uint64(block.timestamp);
        mandate.maxLeverageBps = input.maxLeverageBps;
        mandate.status = uint8(MandateTypes.MandateStatus.Active);
        mandate.maxNotionalPerMarket = input.maxNotionalPerMarket;
        mandate.maxNotionalTotal = input.maxNotionalTotal;
        mandate.maxLossPerWindow = input.maxLossPerWindow;

        int256 equity = marginBank.getAccountEquity(msg.sender);
        mandate.epochStartEquity = equity > 0 ? uint128(uint256(equity)) : 0;

        delete _allowedMarkets[msg.sender];
        for (uint256 i = 0; i < input.allowedMarkets.length; i++) {
            _allowedMarkets[msg.sender].push(input.allowedMarkets[i]);
        }
        delete cooldownUntil[msg.sender];

        emit MandateRegistered(msg.sender, policyHash, input.expiresAt);
    }

    /// @notice Revoke the caller's mandate. Reduce-only orders stay open.
    function revoke() external {
        MandateTypes.Mandate storage mandate = _mandates[msg.sender];
        require(mandate.status != uint8(MandateTypes.MandateStatus.None), "no mandate");
        mandate.status = uint8(MandateTypes.MandateStatus.Revoked);
        emit MandateRevoked(msg.sender, mandate.policyHash);
    }

    /// @notice Put a mandate into the breach state, used by the reactive handler.
    function markBreach(address owner) external {
        MandateTypes.Mandate storage mandate = _mandates[owner];
        require(mandate.status == uint8(MandateTypes.MandateStatus.Active), "not active");
        mandate.status = uint8(MandateTypes.MandateStatus.Breach);
    }

    /// @notice Clear the breach state, used by the reactive handler after a reduction.
    function clearBreach(address owner) external {
        MandateTypes.Mandate storage mandate = _mandates[owner];
        require(mandate.status == uint8(MandateTypes.MandateStatus.Breach), "not in breach");
        mandate.status = uint8(MandateTypes.MandateStatus.Active);
    }

    /// @notice Start the cool-down after an enforcement. Only reduce-only orders pass.
    function startCooldown(address owner) external {
        cooldownUntil[owner] = uint64(block.timestamp + COOLDOWN_SECONDS);
    }

    // ---------------------------------------------------------------------
    // Reads.
    // ---------------------------------------------------------------------

    /// @notice The mandate of a wallet, with the derived figures at this block.
    /// @dev The fields are returned flat rather than as a struct. A struct
    ///      return is encoded through the memory allocator, and the chain this
    ///      contract is deployed on rejects that encoding on a value that the
    ///      local tests accept. Flat returns have no dynamic part, so the read
    ///      cannot fail on the shape of the answer.
    /// @return status One of MandateStatus.
    /// @return executor The key allowed to ask for admission.
    /// @return policyHash The hash of the canonical policy document.
    /// @return expiresAt Clause C6, unix seconds.
    /// @return maxLeverageBps Clause C2, in hundredths of a multiple.
    /// @return maxNotionalPerMarket Clause C3, in quote units.
    /// @return maxNotionalTotal Clause C4, in quote units.
    /// @return maxLossPerWindow Clause C5, in quote units.
    /// @return epochStartEquity Equity at registration, in quote units.
    /// @return totalNotional The exposure across every market, in quote units.
    /// @return equity The equity of the account at this block.
    function getMandate(address owner)
        external
        returns (
            uint8 status,
            address executor,
            bytes32 policyHash,
            uint64 expiresAt,
            uint32 maxLeverageBps,
            uint128 maxNotionalPerMarket,
            uint128 maxNotionalTotal,
            uint128 maxLossPerWindow,
            uint128 epochStartEquity,
            uint128 totalNotional,
            int256 equity
        )
    {
        MandateTypes.Mandate storage mandate = _mandates[owner];
        status = mandate.status;
        executor = mandate.executor;
        policyHash = mandate.policyHash;
        expiresAt = mandate.expiresAt;
        maxLeverageBps = mandate.maxLeverageBps;
        maxNotionalPerMarket = mandate.maxNotionalPerMarket;
        maxNotionalTotal = mandate.maxNotionalTotal;
        maxLossPerWindow = mandate.maxLossPerWindow;
        epochStartEquity = mandate.epochStartEquity;
        equity = marginBank.getAccountEquity(owner);
        (uint256 total, uint8 code) = _totalNotional(owner);
        totalNotional = code == 0 ? uint128(total) : 0;
    }

    /// @notice The three fields the reactive handler needs, in one read.
    /// @param owner The wallet the handler watches.
    /// @return status One of MandateStatus.
    /// @return maxNotionalPerMarket Clause C3, in quote units.
    /// @return policyHash The hash of the canonical policy document.
    function getEnforcementState(address owner)
        external
        view
        returns (uint8 status, uint128 maxNotionalPerMarket, bytes32 policyHash)
    {
        MandateTypes.Mandate storage mandate = _mandates[owner];
        status = mandate.status;
        maxNotionalPerMarket = mandate.maxNotionalPerMarket;
        policyHash = mandate.policyHash;
    }

    /// @notice The markets clause C1 allows.
    function getAllowedMarkets(address owner) external view returns (address[] memory) {
        return _allowedMarkets[owner];
    }

    /// @notice The exposure an account holds in one market, in quote units.
    function getMarketNotional(address owner, address pool) external returns (uint128) {
        (uint256 notional,) = _marketNotional(owner, pool);
        return uint128(notional);
    }

    /// @notice The leverage an account would carry after the request, in basis points.
    function getLeverageBps(address owner, uint256 extraNotional) external returns (uint256) {
        int256 equity = marginBank.getAccountEquity(owner);
        if (equity <= 0) return type(uint256).max;
        (uint256 total,) = _totalNotional(owner);
        return ((total + extraNotional) * 10_000) / uint256(equity);
    }

    // ---------------------------------------------------------------------
    // Admission.
    // ---------------------------------------------------------------------

    /// @notice The hash of a policy, computed the same way the registration does.
    /// @param input The six clause values.
    /// @param clauseTexts The owner's own sentence for each clause.
    /// @return policyHash The hash of the canonical policy document.
    function policyHashOf(MandateTypes.MandateInput calldata input, string[6] calldata clauseTexts)
        external
        pure
        returns (bytes32 policyHash)
    {

        policyHash = MandateCanonical.hash(input, clauseTexts);
    }

    /// @notice Run the full admission check without sending anything.
    /// @param req The order request.
    /// @return code The reason code, zero when the request is admissible.
    /// @return compared The value that was compared.
    /// @return limit The limit it was compared against.
    /// @return clause The clause that bound, zero when the venue gate bound.
    function previewAdmit(MandateTypes.OrderRequest calldata req)
        external
        returns (uint8 code, uint128 compared, uint128 limit, uint8 clause)
    {
        Evaluation memory evaluation = _evaluate(req);
        return (evaluation.code, evaluation.compared, evaluation.limit, evaluation.clause);
    }

    /// @notice The single admission path. Refuses by reverting with one reason code.
    /// @param req The order request.
    /// @return success Whether the venue accepted the order.
    /// @return orderId The venue's order id.
    function admit(MandateTypes.OrderRequest calldata req)
        external
        payable
        returns (bool success, uint128 orderId)
    {
        Evaluation memory evaluation = _evaluate(req);
        if (evaluation.code != CODE_ADMITTED) {
            _refuse(evaluation.code);
        }

        MandateTypes.Mandate storage mandate = _mandates[req.owner];
        uint64 expiry = req.expireTimestampNs;
        if (expiry == 0) {
            expiry = IPerpPool(req.market).marketExpiryNs();
        }

        (success, orderId) = IPerpPool(req.market).placeOrderFor{ value: msg.value }(
            req.owner,
            req.isBid,
            0,
            req.price,
            req.quantity,
            expiry,
            req.orderType,
            0,
            address(0),
            0
        );

        emit Decision(
            req.owner,
            true,
            CODE_ADMITTED,
            mandate.policyHash,
            req.market,
            evaluation.compared,
            evaluation.limit,
            evaluation.clause,
            bytes32(0)
        );
    }

    /// @notice Record a refusal that `admit` already reverted on.
    /// @dev A revert rolls back the log, so the refusal has to be written by a
    ///      second transaction. This one records it, with the hash of the
    ///      reverted transaction, and it can never record an admission: it
    ///      re-runs the checks and only writes when they still refuse.
    /// @param req The order request that was refused.
    /// @param code The code the revert carried.
    /// @param txRef The hash of the reverted transaction.
    function recordRefusal(MandateTypes.OrderRequest calldata req, uint8 code, bytes32 txRef) external {
        MandateTypes.Mandate storage mandate = _mandates[req.owner];
        require(
            msg.sender == mandate.executor || msg.sender == mandate.owner,
            "not the executor"
        );

        Evaluation memory evaluation = _evaluate(req);
        if (evaluation.code == CODE_ADMITTED) {
            return;
        }

        emit Decision(
            req.owner,
            false,
            code,
            mandate.policyHash,
            req.market,
            evaluation.compared,
            evaluation.limit,
            evaluation.clause,
            txRef
        );
    }

    // ---------------------------------------------------------------------
    // The checks.
    // ---------------------------------------------------------------------

    function _evaluate(MandateTypes.OrderRequest calldata req) internal returns (Evaluation memory evaluation) {
        evaluation.clause = CLAUSE_NONE;

        MandateTypes.Mandate storage mandate = _mandates[req.owner];

        // 1. The mandate has to exist and be active.
        if (mandate.status != uint8(MandateTypes.MandateStatus.Active)) {
            evaluation.code = mandate.status == uint8(MandateTypes.MandateStatus.Breach)
                ? CODE_IN_BREACH
                : CODE_NO_MANDATE;
            return evaluation;
        }

        // 2. The caller has to be the executor.
        if (msg.sender != mandate.executor && msg.sender != mandate.owner) {
            evaluation.code = CODE_OPERATOR_REVOKED;
            return evaluation;
        }

        // 3. An expired mandate still accepts reductions.
        if (block.timestamp > mandate.expiresAt && !req.reduceOnly) {
            evaluation.code = CODE_EXPIRED;
            evaluation.clause = CLAUSE_C6;
            evaluation.compared = uint128(block.timestamp);
            evaluation.limit = mandate.expiresAt;
            return evaluation;
        }

        // 4. After an enforcement only reductions are accepted for a while.
        if (!req.reduceOnly && cooldownUntil[req.owner] > block.timestamp) {
            evaluation.code = CODE_COOLDOWN;
            evaluation.compared = uint128(block.timestamp);
            evaluation.limit = cooldownUntil[req.owner];
            return evaluation;
        }

        // A reduction skips the clauses that are about opening exposure.
        if (!req.reduceOnly) {
            // C1, the market has to be in the allowed set.
            if (!_isAllowed(req.owner, req.market)) {
                evaluation.code = CODE_MARKET_NOT_ALLOWED;
                evaluation.clause = CLAUSE_C1;
                return evaluation;
            }



            // The grid, read from the pool.
            (uint256 tickSize, uint256 minQuantity, uint256 lotSize) =
                IPerpPool(req.market).getOrderBookParameters();
            if (tickSize == 0 || req.price % tickSize != 0) {
                evaluation.code = CODE_TICK_MISMATCH;
                evaluation.compared = uint128(req.price % (tickSize == 0 ? 1 : tickSize));
                evaluation.limit = uint128(tickSize);
                return evaluation;
            }
            if (lotSize == 0 || req.quantity % lotSize != 0) {
                evaluation.code = CODE_LOT_MISMATCH;
                evaluation.compared = uint128(req.quantity % (lotSize == 0 ? 1 : lotSize));
                evaluation.limit = uint128(lotSize);
                return evaluation;
            }
            if (req.quantity < minQuantity) {
                evaluation.code = CODE_BELOW_MIN_QTY;
                evaluation.compared = uint128(req.quantity);
                evaluation.limit = uint128(minQuantity);
                return evaluation;
            }

            // The notional of the order, in quote units.
            uint8 decimals = _baseDecimals(req.market);
            uint256 notional = _notional(req.price, req.quantity, decimals);

            // C3, the market cap.
            (uint256 marketNotional,) = _marketNotional(req.owner, req.market);
            if (mandate.maxNotionalPerMarket != 0) {
                uint256 afterValue = marketNotional + notional;
                if (afterValue > mandate.maxNotionalPerMarket) {
                    evaluation.code = CODE_MARKET_NOTIONAL_CAP;
                    evaluation.clause = CLAUSE_C3;
                    evaluation.compared = uint128(afterValue);
                    evaluation.limit = mandate.maxNotionalPerMarket;
                    return evaluation;
                }
            }

            // C4, the total cap.
            (uint256 totalNotional, uint8 totalCode) = _totalNotional(req.owner);
            if (totalCode != CODE_ADMITTED) {
                evaluation.code = totalCode;
                return evaluation;
            }
            if (mandate.maxNotionalTotal != 0) {
                uint256 afterValue = totalNotional + notional;
                if (afterValue > mandate.maxNotionalTotal) {
                    evaluation.code = CODE_TOTAL_NOTIONAL_CAP;
                    evaluation.clause = CLAUSE_C4;
                    evaluation.compared = uint128(afterValue);
                    evaluation.limit = mandate.maxNotionalTotal;
                    return evaluation;
                }
            }

            // C2, the leverage cap, measured on the account's exposure after
            // the order rather than on the order alone.
            int256 equity = marginBank.getAccountEquity(req.owner);
            if (equity <= 0) {
                evaluation.code = CODE_LEVERAGE;
                evaluation.clause = CLAUSE_C2;
                evaluation.compared = 0;
                evaluation.limit = mandate.maxLeverageBps;
                return evaluation;
            }
            uint256 leverageHundredths = ((totalNotional + notional) * 100) / uint256(equity);
            if (leverageHundredths > mandate.maxLeverageBps) {
                evaluation.code = CODE_LEVERAGE;
                evaluation.clause = CLAUSE_C2;
                evaluation.compared = uint128(leverageHundredths);
                evaluation.limit = mandate.maxLeverageBps;
                return evaluation;
            }

            // C5, the loss floor for the window.
            if (mandate.maxLossPerWindow != 0) {
                int256 floor = int256(uint256(mandate.epochStartEquity)) - int256(uint256(mandate.maxLossPerWindow));
                if (int256(equity) <= floor) {
                    evaluation.code = CODE_LOSS_WINDOW;
                    evaluation.clause = CLAUSE_C5;
                    evaluation.compared = equity <= 0 ? 0 : uint128(uint256(equity));
                    evaluation.limit = mandate.maxLossPerWindow;
                    return evaluation;
                }
            }
        }

        // 5. The venue's own gates, which run after the mandate's.
        (bool priceable, uint256 markPrice) = IPerpPool(req.market).tryGetMarkPrice();
        if (!priceable) {
            evaluation.code = CODE_MARK_STALE;
            return evaluation;
        }

        uint256 maxPositionSize;
        {
            (
                uint256 initialMarginBps,
                uint256 maintenanceMarginBps,
                uint256 closeOutMarginBps,
                uint256 maxOpenInterest,
                uint256 positionCap,
                uint256 takerFeeBpsTimes1k,
                int256 makerFeeBpsTimes1k,
                uint256 insuranceFundShareBps
            ) = IPerpPool(req.market).getPerpPoolParameters();
            maxPositionSize = positionCap;
        }
        if (maxPositionSize != 0) {
            (int128 size,,,) = marginBank.getPosition(req.owner, req.market);
            int256 signedAfter = int256(size) + (req.isBid ? int256(req.quantity) : -int256(req.quantity));
            uint256 absoluteAfter = signedAfter < 0 ? uint256(-signedAfter) : uint256(signedAfter);
            uint256 absoluteNow = size < 0 ? uint256(-int256(size)) : uint256(int256(size));
            if (absoluteAfter > maxPositionSize && absoluteAfter > absoluteNow) {
                evaluation.code = CODE_VENUE_POSITION_CAP;
                evaluation.compared = uint128(absoluteAfter);
                evaluation.limit = uint128(maxPositionSize);
                return evaluation;
            }
        }

        if (!_voucherAllows(req.owner, req.market)) {
            evaluation.code = CODE_VOUCHER_BLOCKED;
            return evaluation;
        }

        // 6. A stop order holds 0.15 STT, which has to be in the wallet.
        if (req.armsStop && req.owner.balance < STOP_DEPOSIT) {
            evaluation.code = CODE_GAS_HEADROOM;
            evaluation.compared = uint128(req.owner.balance);
            evaluation.limit = uint128(STOP_DEPOSIT);
            return evaluation;
        }

        // Nothing bound, so the event carries no comparison.
        evaluation.code = CODE_ADMITTED;
        evaluation.compared = 0;
        evaluation.limit = 0;
        evaluation.clause = CLAUSE_NONE;
        return evaluation;
    }

    /// @notice The one place a refusal becomes a revert.
    function _refuse(uint8 code) internal pure {
        if (code == CODE_NO_MANDATE) revert MandateTypes.ENoMandate(code);
        if (code == CODE_OPERATOR_REVOKED) revert MandateTypes.EOperatorRevoked(code);
        if (code == CODE_EXPIRED) revert MandateTypes.EExpired(code);
        if (code == CODE_MARKET_NOT_ALLOWED) revert MandateTypes.EMarketNotAllowed(code);
        if (code == CODE_TICK_MISMATCH) revert MandateTypes.ETickMismatch(code);
        if (code == CODE_LOT_MISMATCH) revert MandateTypes.ELotMismatch(code);
        if (code == CODE_BELOW_MIN_QTY) revert MandateTypes.EBelowMinQty(code);
        if (code == CODE_MARKET_NOTIONAL_CAP) revert MandateTypes.EMarketNotionalCap(code);
        if (code == CODE_TOTAL_NOTIONAL_CAP) revert MandateTypes.ETotalNotionalCap(code);
        if (code == CODE_LEVERAGE) revert MandateTypes.ELeverage(code);
        if (code == CODE_LOSS_WINDOW) revert MandateTypes.ELossWindow(code);
        if (code == CODE_VENUE_POSITION_CAP) revert MandateTypes.EVenuePositionCap(code);
        if (code == CODE_VOUCHER_BLOCKED) revert MandateTypes.EVoucherBlocked(code);
        if (code == CODE_MARK_STALE) revert MandateTypes.EMarkStale(code);
        if (code == CODE_GAS_HEADROOM) revert MandateTypes.EGasHeadroom(code);
        if (code == CODE_COOLDOWN) revert MandateTypes.ECooldown(code);
        if (code == CODE_IN_BREACH) revert MandateTypes.EInBreach(code);
        revert MandateTypes.ENoMandate(code);
    }

    function _isAllowed(address owner, address market) internal view returns (bool) {
        address[] storage markets = _allowedMarkets[owner];
        for (uint256 i = 0; i < markets.length; i++) {
            if (markets[i] == market) return true;
        }
        return false;
    }

    /// @dev Whether this contract still holds the operator grant it places orders with.
    ///      The grant is read at registration, where the call is a plain call. The
    ///      venue's registry is a proxy whose implementation does not answer a
    ///      static call, so a per-order check would read as a refusal.
    function _isOperator(address owner) internal returns (bool) {
        try operatorRegistry.isGloballyApproved(owner, address(this), PLACE_ORDER_FOR_SELECTOR) returns (
            bool approved
        ) {
            return approved;
        } catch {
            return false;
        }
    }

    function _voucherAllows(address owner, address pool) internal view returns (bool) {
        uint64 expiry = marginBank.voucherExpiryOf(owner);
        if (expiry == 0 || expiry <= block.timestamp) {
            return true;
        }
        return marginBank.isVoucherMarketAllowed(pool);
    }

    function _baseDecimals(address pool) internal returns (uint8) {
        address baseToken = perpPoolFactory.getBaseTokenForPool(pool);
        return IERC20(baseToken).decimals();
    }

    function _notional(uint256 price, uint256 quantity, uint8 decimals) internal pure returns (uint256) {
        return (price * quantity) / (10 ** uint256(decimals));
    }

    /// @return notional The exposure in the market, in quote units.
    /// @return code A reason code when the exposure could not be derived.
    function _marketNotional(address owner, address pool)
        internal
        returns (uint256 notional, uint8 code)
    {
        (bool priceable, uint256 markPrice) = IPerpPool(pool).tryGetMarkPrice();
        if (!priceable) {
            return (0, CODE_MARK_STALE);
        }
        (int128 size,,,) = marginBank.getPosition(owner, pool);
        if (size == 0) {
            return (0, CODE_ADMITTED);
        }
        uint256 absolute = size < 0 ? uint256(-int256(size)) : uint256(int256(size));
        uint8 decimals = _baseDecimals(pool);
        return (_notional(absolute, markPrice, decimals), CODE_ADMITTED);
    }

    /// @return total The exposure across every market the account holds, in quote units.
    /// @return code A reason code when the exposure could not be derived.
    function _totalNotional(address owner) internal returns (uint256 total, uint8 code) {
        // The exposure is summed over the markets the mandate allows, which is a
        // closed list of at most six pools. The venue's account read returns
        // an unusable list when it is called from a static context, so the policy
        // reads the positions it already knows about.
        address[] storage markets = _allowedMarkets[owner];
        for (uint256 i = 0; i < markets.length; i++) {
            (uint256 notional, uint8 poolCode) = _marketNotional(owner, markets[i]);
            if (poolCode != CODE_ADMITTED) {
                return (0, poolCode);
            }
            total += notional;
        }
        return (total, CODE_ADMITTED);
    }
}









