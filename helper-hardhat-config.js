const { ethers } = require("ethers")

const networkConfig = {
    // Mumbai:
    80001: {
        name: "mumbai",
        minStackingValue: ethers.utils.parseEther("0.0001"),
        // auctionHouseAddress: "0xbF934F24D321EfFfBd1DFb5B3886bDAb4b744e49",
        // auctionNFTAddress: "0x992b92ec5c1C3375828a3C3C6a300d5881AFC096",
        auctionHouseAddress: "0xDB4DCB321e25Ed227f6eE8d61a400599AEf084D1",
        auctionNFTAddress: "0x963D1C98785273Eb2a8dEEe565779e389bA7a465",
    },
    // sepolia
    11155111: {
        name: "sepolia",
        // vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        // gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        // subscriptionId: "3861",
        // callbackGasLimit: "500000",
        minStackingValue: ethers.utils.parseEther("0.0001"),
        // ethUsdPriceFeedAddress: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
        auctionHouseAddress: "0xbF934F24D321EfFfBd1DFb5B3886bDAb4b744e49",
        auctionNFTAddress: "0x992b92ec5c1C3375828a3C3C6a300d5881AFC096",
    },
    // hardhat
    31337: {
        name: "hardhat",
        // gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        // callbackGasLimit: "500000",
        minStackingValue: ethers.utils.parseEther("0.0001"),
    },
}

const developmentChains = ["hardhat", "localhost"]
const frontEndContractsFile = "../nextjs-asset-auction/constants/networkMapping.json"
const frontEndAbiLocation = "../nextjs-asset-auction/constants/"

module.exports = {
    networkConfig,
    developmentChains,
    frontEndContractsFile,
    frontEndAbiLocation,
}
