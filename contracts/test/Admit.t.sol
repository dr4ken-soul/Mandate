// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./MandateTest.sol";

/// @notice The admission flow: what happens on a pass, on a refusal, and on a
///         recorded refusal.
contract AdmitTest is MandateTest {
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

    function policyHashOfOwner() internal returns (bytes32) {
        return _mandateOf(owner).policyHash;
    }

    function test_AnAdmittedOrderReachesThePool() public {
        MandateTypes.OrderRequest memory req = _request(1e18);

        vm.recordLogs();
        mandate.admit(req);
        Vm.Log[] memory entries = vm.getRecordedLogs();
        for (uint256 i = 0; i < entries.length; i++) {
            emit log_named_string("topic", vm.toString(entries[i].topics[0]));
            emit log_named_string("t1", vm.toString(entries[i].topics[1]));
            emit log_named_string("t2", vm.toString(entries[i].topics[2]));
            emit log_named_string("t3", vm.toString(entries[i].topics[3]));
        }
        emit log_named_uint("count", entries.length);

        (bool success, uint128 orderId) = mandate.admit(req);
        assertTrue(success, "the venue accepted the order");
        assertEq(orderId, 1, "the venue order id");
        assertTrue(pool.lastCallPlaced(), "the pool was called");
        assertEq(pool.lastOwner(), owner, "the order was for the owner");
    }

    function test_AnAdmittedOrderLeavesTheMandateAlone() public {
        MandateTypes.OrderRequest memory req = _request(1e18);
        mandate.admit(req);

        MandateTypes.Mandate memory policy = _mandateOf(owner);
        assertEq(policy.status, uint8(MandateTypes.MandateStatus.Active));
    }

    function test_ARefusedOrderMovesNoFunds() public {
        MandateTypes.OrderRequest memory req = _request(3e18);

        vm.expectRevert();
        mandate.admit(req);

        assertFalse(pool.lastCallPlaced(), "the pool was never called");
    }

    function test_ARefusalIsRecordedForTheLedger() public {
        MandateTypes.OrderRequest memory req = _request(3e18);

        vm.expectRevert();
        mandate.admit(req);

        bytes32 txRef = keccak256("the reverted transaction");

        vm.recordLogs();
        mandate.recordRefusal(req, 0x08, txRef);
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 1, "one decision");

        (bool admitted, uint8 code, uint128 compared, uint128 limit, uint8 clause, bytes32 ref) =
            abi.decode(entries[0].data, (bool, uint8, uint128, uint128, uint8, bytes32));
        assertFalse(admitted, "not admitted");
        assertEq(code, 0x08, "the market notional cap");
        assertEq(compared, 300e18, "the notional the order would reach");
        assertEq(limit, CAP_PER_MARKET, "the cap");
        assertEq(clause, 3, "clause C3");
        assertEq(ref, txRef, "the refused transaction");
        assertEq(entries[0].topics[1], bytes32(uint256(uint160(owner))), "the owner");
    }

    function test_ARecordedRefusalCannotRecordAnAdmission() public {
        MandateTypes.OrderRequest memory req = _request(1e18);

        vm.recordLogs();
        mandate.recordRefusal(req, 0x08, bytes32(0));
        Vm.Log[] memory logs = vm.getRecordedLogs();

        for (uint256 i = 0; i < logs.length; i++) {
            assertTrue(logs[i].topics[0] != keccak256("Decision(address,bool,uint8,bytes32,address,uint128,uint128,uint8,bytes32)"));
        }
    }

    function test_OnlyTheExecutorCanRecordARefusal() public {
        MandateTypes.OrderRequest memory req = _request(3e18);

        vm.prank(address(0xBAD));
        vm.expectRevert();
        mandate.recordRefusal(req, 0x08, bytes32(0));
    }

    function test_RevokingStopsAdmissions() public {
        vm.prank(owner);
        mandate.revoke();

        MandateTypes.OrderRequest memory req = _request(1e18);
        (uint8 code,,,) = mandate.previewAdmit(req);
        assertEq(code, 0x01, "no active mandate");
        assertFalse(pool.lastCallPlaced(), "the pool was never called");
    }

    function test_AReductionIsAcceptedAfterAnEnforcement() public {
        mandate.markBreach(owner);
        mandate.clearBreach(owner);
        mandate.startCooldown(owner);

        MandateTypes.OrderRequest memory req = _request(1e18);
        req.reduceOnly = true;

        (uint8 code,,,) = mandate.previewAdmit(req);
        assertEq(code, 0x00, "a reduction is accepted");
    }

    function test_TheEpochEquityIsReadAtRegistration() public {
        marginBank.setEquity(owner, 750e18);
        vm.prank(owner);
        mandate.register(_input(), executor, _clauseTexts());

        MandateTypes.Mandate memory policy = _mandateOf(owner);
        assertEq(policy.epochStartEquity, 750e18, "the epoch equity");
    }

    function test_RegisteringStoresThePolicyHash() public {
        MandateTypes.Mandate memory policy = _mandateOf(owner);
        assertEq(policy.policyHash, mandate.policyHashOf(_input(), _clauseTexts()), "the policy hash");
    }
}













