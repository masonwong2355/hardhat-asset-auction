// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.7;

// import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "hardhat/console.sol";

// import "./AuctionHouseStruct.sol";
import "./Guardians.sol";
import "hardhat/console.sol";

// Guardians
contract AuctionHouse is Guardians, KeeperCompatible {
    using SafeMath for uint256;

    // variable
    mapping(uint256 => Listing) public s_listings; // tokenIds -> listing
    mapping(uint256 => mapping(address => uint256)) public s_returnFund; // tokenIds -> address -> price
    mapping(address => uint256) public s_proceeds;
    uint256 public constant MINBIDINTERVAL = 14400; // 4 hours
    uint256[] public s_listingsCounter;

    // modifier
    modifier notStartAuction(uint256 tokenId) {
        if (s_listings[tokenId].status != AuctionNftStatus.SELLING) {
            revert AuctionHouse_NotSelling();
        }
        _;
    }

    // events
    event AssertListed(address indexed seller, uint256 indexed tokenId, address indexed guardian);
    event ProceedsWithdraw(address indexed user, uint256 proceeds);
    event SubmittedBid(address indexed buyer, uint256 indexed tokenId, uint256 bidPrice);
    event ListingCancel(uint256 indexed tokneId);
    event ListingSell(uint256 indexed tokenId);
    event AuctionEnd(uint256 indexed tokenId);

    // ideas
    // 1. stacking amount must be greater then total item value
    //      1.1

    // functions
    constructor(uint256 _minStackingValue) Guardians(_minStackingValue) {}

    // nomarl user
    function listAssert(
        uint256 _tokenId,
        uint256 _price,
        address _guardian,
        uint256 _startAt,
        uint256 _endAt
    ) public {
        // ------------------ validation ------------------
        require(!isListing(_tokenId), "Item is already listed");
        address tokenOwner = s_auctionNft.ownerOf(_tokenId);
        require(msg.sender == tokenOwner, "Only the owner can list");
        require(_price > 0, "Price must be greater than zero");
        bool validGuardian = assetInGuardian(_guardian, _tokenId) || isGuardians(_guardian);
        require(validGuardian, "Invalid guardian");
        require(
            _startAt >= block.timestamp &&
                _endAt > _startAt &&
                (_endAt - _startAt) >= MINBIDINTERVAL,
            "Invalid auction times"
        );
        // ------------------ validation ------------------

        Listing storage newListing = s_listings[_tokenId];
        newListing.seller = tokenOwner;
        newListing.price = _price;
        newListing.netPrice = _price;
        newListing.status = AuctionNftStatus.LISTING;
        newListing.startAt = _startAt;
        newListing.endAt = _endAt;

        s_listingsCounter.push(_tokenId);

        emit AssertListed(msg.sender, _tokenId, _guardian);
    }

    // what is starting status of listing
    function cancelListing(uint256 _tokenId) external {
        require(isListing(_tokenId), "Item is not listed");

        uint256 tokenIdIndex = findIndexInArray(s_listingsCounter, _tokenId);
        removeElementAtIndex(s_listingsCounter, tokenIdIndex);

        delete s_listings[_tokenId];

        emit ListingCancel(_tokenId);
    }

    function findIndexInArray(
        uint256[] storage arrayToSearch,
        uint256 element
    ) internal view returns (uint256) {
        for (uint256 i = 0; i < arrayToSearch.length; i++) {
            if (arrayToSearch[i] == element) {
                return i;
            }
        }
        revert("Element not found in array");
    }

    function removeElementAtIndex(uint256[] storage arrayToUpdate, uint256 index) internal {
        require(index < arrayToUpdate.length, "Index out of bounds");

        // Shift elements to the left to remove the index
        for (uint256 i = index; i < arrayToUpdate.length - 1; i++) {
            arrayToUpdate[i] = arrayToUpdate[i + 1];
        }
        arrayToUpdate.pop();
    }

    function bid(uint256 _tokenId) external payable {
        Listing storage listing = s_listings[_tokenId];
        require(listing.status == AuctionNftStatus.SELLING, "item is not selling");
        require(listing.seller != msg.sender, "seller not able bid");
        require(listing.netPrice < msg.value, "bid price require high than last bid");
        require(listing.endAt > block.timestamp, "auction is end");

        if (listing.bids.length < 0) {
            Bid storage lastBid = listing.bids[listing.bids.length.sub(1)];
            s_returnFund[_tokenId][lastBid.buyer].add(lastBid.price);
        }

        uint256 _price = msg.value;
        listing.bids.push(Bid(_price, msg.sender, block.timestamp));
        listing.netPrice = _price;

        emit SubmittedBid(msg.sender, _tokenId, _price);
    }

    function withdrawProceeds() external nonReentrant {
        uint256 proceeds = s_proceeds[msg.sender];
        require(proceeds > 0, "No proceeds available");

        s_proceeds[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        require(success, "Transfer unsuccessful");

        emit ProceedsWithdraw(msg.sender, proceeds);
    }

    function checkUpkeep(
        bytes memory /* checkData */
    ) public view override returns (bool upkeepNeeded, bytes memory performData) {
        uint256 listingsCounter = s_listingsCounter.length;
        uint256[] memory toSellTokenIds = new uint256[](listingsCounter);
        uint256[] memory endAuctionTokenIds = new uint256[](listingsCounter);
        uint256 toSellCounter;
        uint256 endAuctionCounter;

        for (uint256 i = 0; i < listingsCounter; i++) {
            uint256 tokenId = s_listingsCounter[i];
            Listing storage listing = s_listings[tokenId];

            if (
                listing.status == AuctionNftStatus.LISTING &&
                listing.startAt <= block.timestamp &&
                listing.endAt > block.timestamp
            ) {
                upkeepNeeded = true;
                toSellTokenIds[toSellCounter] = tokenId;
                toSellCounter = toSellCounter.add(1);
            }

            if (listing.status == AuctionNftStatus.SELLING && listing.endAt < block.timestamp) {
                upkeepNeeded = true;
                endAuctionTokenIds[endAuctionCounter] = tokenId;
                endAuctionCounter = endAuctionCounter.add(1);
            }
        }

        performData = abi.encode(toSellTokenIds, endAuctionTokenIds);
    }

    function performUpkeep(bytes calldata performData) external override {
        (bool upkeepNeeded, ) = checkUpkeep("0x");
        require(upkeepNeeded, "Perform upkeep not allowed");

        (uint256[] memory toSellTokenIds, uint256[] memory endAuctionTokenIds) = abi.decode(
            performData,
            (uint256[], uint256[])
        );

        handleSellListing(toSellTokenIds);
        handleEndAuction(endAuctionTokenIds);
    }

    function handleSellListing(uint256[] memory toSellTokenIds) internal {
        for (uint256 i = 0; i < toSellTokenIds.length; i++) {
            uint256 tokenId = toSellTokenIds[i];
            s_listings[tokenId].status = AuctionNftStatus.SELLING;
            emit ListingSell(tokenId);
        }
    }

    function handleEndAuction(uint256[] memory endAuctionTokenIds) internal {
        for (uint256 i = 0; i < endAuctionTokenIds.length; i++) {
            uint256 tokenId = endAuctionTokenIds[i];
            Listing memory listing = s_listings[tokenId];

            if (listing.bids.length > 0) {
                Bid memory lastBid = listing.bids[listing.bids.length.sub(1)];
                s_returnFund[tokenId][lastBid.buyer].add(lastBid.price);
                s_proceeds[listing.seller] += listing.netPrice;
            }

            delete s_listings[tokenId];
            emit AuctionEnd(tokenId);
        }
    }

    //  getter
    function isListing(uint256 tokenId) public view returns (bool) {
        return s_listings[tokenId].status == AuctionNftStatus.LISTING;
    }
}
