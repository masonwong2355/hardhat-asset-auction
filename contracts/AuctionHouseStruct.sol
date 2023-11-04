// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.7;

// error
error AuctionHouse_PriceNotMet();
error AuctionHouse_isListed();
error AuctionHouse_Listing();
error AuctionHouse_transferUnsuccess();
error AuctionHouse_bidLowerThanLastOne();
error AuctionHouse_NotSelling();
error AuctionHouse_refundUnsuccess();

// enum
enum AuctionNftStatus {
    SLEEP,
    LISTING,
    SELLING
}

// struct
struct Listing {
    address seller;
    uint256 price;
    uint256 netPrice; // actual price
    AuctionNftStatus status;
    uint256 startAt;
    uint256 endAt;
    Bid[] bids;
}

struct GuardianInfo {
    string name;
    string location;
    // asset type -> wine, graph
    // mapping(string => uint256) services; // service -> price
    mapping(uint256 => TokenInfo) items; // tokenId ->  TokenInfo
    uint256 itemsCounter;
    uint256 stacking;
}

struct Bid {
    uint256 price;
    address buyer;
    uint256 dateTime;
}

struct TokenInfo {
    uint256 tokenId;
    bool isExisting;
}
