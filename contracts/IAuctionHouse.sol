// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.7;

interface IAuctionHouse {
    function listing(address tokenId, string memory _metaData) external;

    function cancelListing() external;

    function bid() external;

    function withdrawProceeds() external;

    function redeemAsset() external;

    function stacking() external;

    //
    function addItems(address _guardian, uint256 _tokenId) external;

    function redeemAsset(address _guardian, uint256 _tokenId) external;

    function breakRefund(
        address _guardian,
        address _owner,
        uint256 _tokenId,
        uint256 refundPrice
    ) external;

    // getter
    function isGuardians(address _guardian) external view returns (bool);

    function isListing(uint256 tokenId) external view returns (bool);

    function assetInGuardian(address _guardian, uint256 _tokenId) external view returns (bool);
}
