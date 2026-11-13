// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./MandateTypes.sol";

/// @title MandateCanonical
/// @notice The canonical policy document, encoded exactly as the off-chain
///         compiler encodes it, and its keccak256 hash.
///
/// The document is canonical JSON with a fixed key order, so the hash does not
/// depend on the order the keys were built in. It covers the version, the six
/// clause values and the user's own sentence for each clause, which means the
/// words the owner signed are part of what was signed.
///
/// The matching TypeScript encoder lives in `packages/policy/src/canonical.ts`
/// and `contracts/test/Compile.t.sol` asserts the two produce the same bytes.
library MandateCanonical {
    bytes private constant HEX_DIGITS = "0123456789abcdef";

    /// @notice Encode a policy and its clause text as canonical JSON.
    /// @param input The six clause values.
    /// @param clauseTexts The owner's own sentence for each clause, in C1 to C6 order.
    /// @return The canonical document as bytes.
    function encode(MandateTypes.MandateInput memory input, string[6] memory clauseTexts)
        internal
        pure
        returns (bytes memory)
    {
        bytes memory out = abi.encodePacked('{"version":1,"allowedMarkets":[');

        for (uint256 i = 0; i < input.allowedMarkets.length; i++) {
            if (i != 0) {
                out = abi.encodePacked(out, ",");
            }
            out = abi.encodePacked(out, '"', _address(input.allowedMarkets[i]), '"');
        }

        out = abi.encodePacked(
            out,
            '],"maxLeverageBps":',
            _uintToString(uint256(input.maxLeverageBps)),
            ',"maxNotionalPerMarket":"',
            _uintToString(uint256(input.maxNotionalPerMarket)),
            '","maxNotionalTotal":"',
            _uintToString(uint256(input.maxNotionalTotal)),
            '","maxLossPerWindow":"',
            _uintToString(uint256(input.maxLossPerWindow)),
            '","expiresAt":',
            _uintToString(uint256(input.expiresAt)),
            ',"clauses":['
        );

        for (uint256 i = 0; i < 6; i++) {
            if (i != 0) {
                out = abi.encodePacked(out, ",");
            }
            out = abi.encodePacked(out, '{"id":"', _clauseId(i), '","text":', _quote(clauseTexts[i]), "}");
        }

        return abi.encodePacked(out, "]}");
    }

    /// @notice The keccak256 hash of the canonical document.
    /// @param input The six clause values.
    /// @param clauseTexts The owner's own sentence for each clause.
    /// @return The policy hash.
    function hash(MandateTypes.MandateInput memory input, string[6] memory clauseTexts)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(encode(input, clauseTexts));
    }

    function _clauseId(uint256 index) internal pure returns (bytes memory) {
        if (index == 0) return "C1";
        if (index == 1) return "C2";
        if (index == 2) return "C3";
        if (index == 3) return "C4";
        if (index == 4) return "C5";
        return "C6";
    }

    /// @dev A lowercase 0x prefixed hex string, matching JSON output elsewhere.
    function _address(address value) internal pure returns (bytes memory) {
        bytes memory out = new bytes(42);
        out[0] = "0";
        out[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            uint8 byteValue = uint8(uint160(value) >> (8 * (19 - i)));
            out[2 + i * 2] = HEX_DIGITS[byteValue >> 4];
            out[3 + i * 2] = HEX_DIGITS[byteValue & 0x0F];
        }
        return out;
    }

    /// @dev Base ten, no padding, no sign. The values here are never negative.
    function _uintToString(uint256 value) internal pure returns (bytes memory) {
        if (value == 0) {
            return "0";
        }
        bytes memory buffer = new bytes(78);
        uint256 cursor = buffer.length;
        uint256 remaining = value;
        while (remaining != 0) {
            cursor -= 1;
            buffer[cursor] = bytes1(uint8(48 + (remaining % 10)));
            remaining /= 10;
        }
        bytes memory out = new bytes(buffer.length - cursor);
        for (uint256 i = 0; i < out.length; i++) {
            out[i] = buffer[cursor + i];
        }
        return out;
    }

    /// @dev Quote and escape a string exactly as JSON.stringify does: the quote,
    ///      the backslash and the control characters, nothing else.
    function _quote(string memory value) internal pure returns (bytes memory) {
        bytes memory raw = bytes(value);
        bytes memory buffer = new bytes(raw.length * 6 + 2);
        uint256 length = 1;
        buffer[0] = '"';

        for (uint256 i = 0; i < raw.length; i++) {
            bytes1 char = raw[i];
            if (char == 0x22) {
                buffer[length++] = "\\";
                buffer[length++] = '"';
            } else if (char == 0x5C) {
                buffer[length++] = "\\";
                buffer[length++] = "\\";
            } else if (char == 0x08) {
                buffer[length++] = "\\";
                buffer[length++] = "b";
            } else if (char == 0x09) {
                buffer[length++] = "\\";
                buffer[length++] = "t";
            } else if (char == 0x0A) {
                buffer[length++] = "\\";
                buffer[length++] = "n";
            } else if (char == 0x0C) {
                buffer[length++] = "\\";
                buffer[length++] = "f";
            } else if (char == 0x0D) {
                buffer[length++] = "\\";
                buffer[length++] = "r";
            } else if (uint8(char) < 0x20) {
                buffer[length++] = "\\";
                buffer[length++] = "u";
                buffer[length++] = "0";
                buffer[length++] = "0";
                buffer[length++] = HEX_DIGITS[uint8(char) >> 4];
                buffer[length++] = HEX_DIGITS[uint8(char) & 0x0F];
            } else {
                buffer[length++] = char;
            }
        }

        buffer[length++] = '"';

        bytes memory out = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            out[i] = buffer[i];
        }
        return out;
    }
}

