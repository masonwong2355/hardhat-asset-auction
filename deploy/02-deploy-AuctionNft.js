const { verify } = require("../utils/verify")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { network, ethers } = require("hardhat")

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts()
    const { deploy, log } = deployments

    const auctionHouse = await ethers.getContract("AuctionHouse")
    log(`----------------------------------------------------------------`)

    const args = [auctionHouse.address]
    const auctionNft = await deploy("AuctionNFT", {
        from: deployer,
        log: true,
        args: args,
        waitingConfirmation: 1,
    })
    log(`success deploy auctionNft with ${auctionNft.address}`)

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying")
        await verify(auctionNft.address, args)
    }

    log(`----------------------------------------------------------------`)
}

module.exports.tags = ["all", "auctionNft"]
