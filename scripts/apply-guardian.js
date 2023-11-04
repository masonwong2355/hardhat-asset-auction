const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")

const stacking = ethers.utils.parseEther("0.001")

async function applyGuardian() {
    const accounts = await ethers.getSigners()
    const guardian = accounts[0]

    const chainId = network.config.chainId
    const AuctionHouse = await ethers.getContractFactory("AuctionHouse", guardian)
    const auctionHouse = AuctionHouse.attach(networkConfig[chainId].auctionHouseAddress)
    // const AuctionNFT = await ethers.getContractFactory("AuctionNFT", guardian)
    // const auctionNft = AuctionNFT.attach(networkConfig[chainId].auctionNFTAddress)

    const tx = await auctionHouse.applyGuardian("GoodGuardian2", "UK2", { value: stacking })
    await tx.wait(1)

    console.log(`done apply Guardian with : ${guardian.address}`)
}

applyGuardian()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
