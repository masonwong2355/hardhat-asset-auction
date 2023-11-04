const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")

const stacking = ethers.utils.parseEther("0.01")

async function main() {
    const tokenURI = "https://example.com/token/123"

    const accounts = await ethers.getSigners()
    const guardian = accounts[0]
    const user1 = accounts[1]

    const chainId = network.config.chainId
    const AuctionHouse = await ethers.getContractFactory("AuctionHouse", guardian)
    const auctionHouse = AuctionHouse.attach(networkConfig[chainId].auctionHouseAddress)
    const AuctionNFT = await ethers.getContractFactory("AuctionNFT", guardian)
    const auctionNft = AuctionNFT.attach(networkConfig[chainId].auctionNFTAddress)

    console.log(`interat with AuctionNft : ${auctionNft.address}`)
    console.log(`interat with auctionHouse : ${auctionHouse.address}`)

    const tx = await auctionNft.burn(user1.address, 0)
    await tx.wait(1)
    console.log(`done burn a NFT with : ${user1.address}`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
