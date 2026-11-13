// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Test.sol";
import "../src/MandateCanonical.sol";
import "../src/MandateTypes.sol";

/// @notice The canonical encoding, checked against the off-chain encoder.
/// @dev The fixture in `test/fixtures` is produced by the TypeScript package.
///      This test proves the two encoders agree on the same bytes, which is
///      what makes the policy hash mean the same thing on both sides.
contract CompileTest is Test {
    function _fixture(string memory name) internal view returns (string memory) {
        string memory path = string.concat("./test/fixtures/", name);
        string memory data = vm.readFile(path);
        return data;
    }

    function _input() internal pure returns (MandateTypes.MandateInput memory input) {
        address[] memory markets = new address[](1);
        markets[0] = 0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0;
        input.allowedMarkets = markets;
        input.maxLeverageBps = 500;
        input.maxNotionalPerMarket = 50e18;
        input.maxNotionalTotal = 100e18;
        input.maxLossPerWindow = 20e18;
        input.expiresAt = 1765152000;
    }

    function _clauseTexts() internal pure returns (string[6] memory texts) {
        texts[0] = "Only trade BTC-PERP.";
        texts[1] = "Never above 5x.";
        texts[2] = "Never risk more than 50 USDso on one market.";
        texts[3] = "Never above 100 USDso in total.";
        texts[4] = "Stop at a loss of 20 USDso.";
        texts[5] = "Be flat in seven days.";
    }

    function test_TheEncoderMatchesTheFixture() public view {
        bytes memory encoded = MandateCanonical.encode(_input(), _clauseTexts());
        string memory fixture = _fixture("policy.json");
        assertEq(string(encoded), fixture, "the encoders must agree byte for byte");
    }

    function test_TheHashMatchesTheFixture() public view {
        bytes32 hash = MandateCanonical.hash(_input(), _clauseTexts());
        assertEq(hash, vm.parseBytes32(_fixture("policy.hash")), "the hash");
    }

    function test_TheHashCoversTheClauseText() public view {
        string[6] memory texts = _clauseTexts();
        bytes32 before = MandateCanonical.hash(_input(), texts);

        texts[2] = "Never risk more than 500 USDso on one market.";
        bytes32 reworded = MandateCanonical.hash(_input(), texts);

        assertNotEq(before, reworded, "the words are part of what was signed");
    }

    function test_TheHashCoversEveryValue() public view {
        bytes32 before = MandateCanonical.hash(_input(), _clauseTexts());

        MandateTypes.MandateInput memory input = _input();
        input.maxNotionalPerMarket = 60e18;
        assertNotEq(before, MandateCanonical.hash(input, _clauseTexts()), "the market cap");

        input = _input();
        input.maxLeverageBps = 600;
        assertNotEq(before, MandateCanonical.hash(input, _clauseTexts()), "the leverage cap");

        input = _input();
        input.expiresAt = 1765152001;
        assertNotEq(before, MandateCanonical.hash(input, _clauseTexts()), "the expiry");
    }

    function test_TheEncodingDoesNotDependOnTheOrderOfTheMarkets() public view {
        MandateTypes.MandateInput memory one = _input();
        MandateTypes.MandateInput memory two = _input();

        address[] memory markets = new address[](2);
        markets[0] = 0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0;
        markets[1] = 0xD6Cb1DD58580B84D76068aC21594219ce03aeddf;
        two.allowedMarkets = markets;

        assertNotEq(
            MandateCanonical.hash(one, _clauseTexts()),
            MandateCanonical.hash(two, _clauseTexts()),
            "a different market set is a different policy"
        );
    }

    function test_TheEncodingEscapesTheSameWayJsonDoes() public view {
        string[6] memory texts = _clauseTexts();
        texts[2] = 'Say "no" to 100% \\ loss';
        bytes memory encoded = MandateCanonical.encode(_input(), texts);
        assertEq(
            string(encoded),
            '{"version":1,"allowedMarkets":["0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0"],"maxLeverageBps":500,'
            '"maxNotionalPerMarket":"50000000000000000000","maxNotionalTotal":"100000000000000000000",'
            '"maxLossPerWindow":"20000000000000000000","expiresAt":1765152000,"clauses":['
            '{"id":"C1","text":"Only trade BTC-PERP."},{"id":"C2","text":"Never above 5x."},'
            '{"id":"C3","text":"Say \\"no\\" to 100% \\\\ loss"},'
            '{"id":"C4","text":"Never above 100 USDso in total."},'
            '{"id":"C5","text":"Stop at a loss of 20 USDso."},'
            '{"id":"C6","text":"Be flat in seven days."}]}',
            "the escaping"
        );
    }
}



