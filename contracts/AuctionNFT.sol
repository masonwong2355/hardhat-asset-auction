// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.7;

// import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./IAuctionHouse.sol";
import "./IGuardians.sol";
import "hardhat/console.sol";

contract AuctionNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter public s_tokenCounter;
    IAuctionHouse private s_auctionHouse;

    // events
    event Minted(uint256 indexed tokenId, address indexed owner, address indexed guardian);
    event Burned(uint256 indexed tokenId, address indexed owner, address indexed guardian);

    // modifiers
    modifier isGuardians() {
        require(s_auctionHouse.isGuardians(msg.sender), "requirde guardian");
        _;
    }

    modifier assetInGuardian(uint256 _tokenId) {
        require(s_auctionHouse.assetInGuardian(msg.sender, _tokenId), "asset not in guardian");
        _;
    }

    // functions
    constructor(address _auctionHouseAddress) ERC721("Auction Asset NFT", "AAH") {
        s_auctionHouse = IAuctionHouse(_auctionHouseAddress);
    }

    function setAuctionHouse(address _auctionHouseAddress) external onlyOwner {
        s_auctionHouse = IAuctionHouse(_auctionHouseAddress);
    }

    // stacking value must be greater then total mint item
    function mint(address _owner, string memory _tokenURI) external isGuardians {
        uint256 newTokenid = s_tokenCounter.current();
        _safeMint(_owner, newTokenid);
        _setTokenURI(newTokenid, _tokenURI);
        emit Minted(newTokenid, _owner, msg.sender);

        s_auctionHouse.addItems(msg.sender, newTokenid);

        s_tokenCounter.increment();
    }

    // check token approve form msg.sender?
    function burn(address _owner, uint256 _tokenId) public isGuardians assetInGuardian(_tokenId) {
        require(!s_auctionHouse.isListing(_tokenId), "item is listing");
        s_auctionHouse.redeemAsset(msg.sender, _tokenId);

        _burn(_tokenId);
        emit Burned(_tokenId, _owner, msg.sender);
        s_tokenCounter.decrement();
    }

    function breakBurn(
        address _owner,
        uint256 _tokenId,
        uint256 refundPrice
    ) external isGuardians assetInGuardian(_tokenId) {
        require(!s_auctionHouse.isListing(_tokenId), "item is listing");

        s_auctionHouse.breakRefund(msg.sender, _owner, _tokenId, refundPrice);

        burn(_owner, _tokenId);
    }
}
