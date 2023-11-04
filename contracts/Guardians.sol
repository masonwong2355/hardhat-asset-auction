// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AuctionHouseStruct.sol";
import "./AuctionNFT.sol";
import "hardhat/console.sol";

contract Guardians is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    uint256 public immutable s_minStackingValue;
    mapping(address => GuardianInfo) internal s_guardians; // guardian address -> tokenId
    AuctionNFT internal s_auctionNft;

    // modifier
    modifier isFromAuctionNft() {
        require(msg.sender == address(s_auctionNft), "only able call by AuctionNFT");
        _;
    }

    // events
    event GuardianAdded(address indexed guardian, string name, string location, uint256 stacking);
    event GuardianWithdraw(address indexed guardian, uint256 amount);
    event ItemAdded(address indexed guardian, uint256 tokenId);
    event ItemRedeem(address indexed guardian, uint256 tokenId);
    event ItemBreakRefund(
        address indexed guardian,
        address indexed owner,
        uint256 indexed tokenId,
        uint256 refundPrice
    );

    constructor(uint256 _minStackingValue) {
        s_minStackingValue = _minStackingValue;
    }

    function applyGuardian(string memory _name, string memory _location) public payable {
        require(msg.value >= s_minStackingValue, "Not enought to staking");

        GuardianInfo storage guardian = s_guardians[msg.sender];
        guardian.name = _name;
        guardian.location = _location;
        guardian.stacking = msg.value;
        emit GuardianAdded(msg.sender, _name, _location, msg.value);
    }

    // did isGuardians checking on AuctionNFT
    function addItems(address _guardian, uint256 _tokenId) external isFromAuctionNft {
        GuardianInfo storage guardian = s_guardians[_guardian];
        guardian.items[_tokenId] = TokenInfo({tokenId: _tokenId, isExisting: true});
        guardian.itemsCounter = guardian.itemsCounter.add(1);
        emit ItemAdded(_guardian, _tokenId);
    }

    // did isGuardians and asset are not there checking on AuctionNFT
    function redeemAsset(address _guardian, uint256 _tokenId) external isFromAuctionNft {
        GuardianInfo storage guardian = s_guardians[_guardian];
        guardian.itemsCounter = guardian.itemsCounter.sub(1);
        delete guardian.items[_tokenId];
        emit ItemRedeem(_guardian, _tokenId);
    }

    function breakRefund(
        address _guardian,
        address _owner,
        uint256 _tokenId,
        uint256 _refundPrice
    ) external {
        require(s_guardians[_guardian].stacking > _refundPrice, "Not enough Fund to return");
        s_guardians[_guardian].stacking -= _refundPrice;

        (bool success, ) = payable(_owner).call{value: _refundPrice}("");
        if (!success) {
            revert AuctionHouse_refundUnsuccess();
        }

        emit ItemBreakRefund(_guardian, _owner, _tokenId, _refundPrice);
    }

    function withdrawGuardianStacking() external nonReentrant {
        address sender = msg.sender;
        require(isGuardians(sender), "Only guardians can withdraw");

        GuardianInfo storage guardian = s_guardians[sender];
        require(guardian.itemsCounter == 0, "Guardian still has items");
        require(guardian.stacking > 0, "Guardian stacking is empty");

        uint256 amount = guardian.stacking;
        delete s_guardians[sender];

        (bool success, ) = payable(sender).call{value: amount}("");
        require(success, "Refund unsuccessful");

        emit GuardianWithdraw(sender, amount);
    }

    function setAuctionNft(address _auctionNftAddress) public onlyOwner {
        s_auctionNft = AuctionNFT(_auctionNftAddress);
    }

    // getter
    function isGuardians(address _guardian) public view returns (bool) {
        return s_guardians[_guardian].stacking > 0;
    }

    function assetInGuardian(address _guardian, uint256 _tokenId) public view returns (bool) {
        return s_guardians[_guardian].items[_tokenId].isExisting;
    }

    function guardianStacking(address _guardian) public view returns (uint256) {
        return s_guardians[_guardian].stacking;
    }
}
