// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.7;

interface IGuardians {
    function addItems(address _guardian, uint256 _tokenId) external;

    function redeemAsset(address _guardian, uint256 _tokenId) external;

    function breakRefund(
        address _guardian,
        address _owner,
        uint256 _tokenId,
        uint256 _refundPrice
    ) external;

    function isGuardinas(address _guardian) external view returns (bool);

    function assetInGuardian(address _guardian, uint256 _tokenId) external view returns (bool);
}
